import type { Types } from "mongoose";
import { IncidentRecord } from "../../db/models/IncidentRecord.js";
import { classifyFailure } from "../classification/heuristics.js";
import { rememberMemory } from "../memory/remember.js";
import { postMessage, resolveDefaultChannel, isSlackAvailable } from "../slack/client.js";
import { createIncident as createPagerDutyIncident, isPagerDutyAvailable } from "../pagerduty/client.js";
import { requireConnector } from "../connectors/connectorHttp.js";
import {
  buildClassificationText,
  enrichIncidentContext,
} from "./enrichContext.js";
import { formatIncidentOpenedSlackMessage, formatIncidentUpdatedSlackMessage } from "./formatSlack.js";
import type { IncidentOpenInput, IncidentOpenResult } from "./types.js";

function defaultTitle(input: IncidentOpenInput, category?: string): string {
  if (input.title) return input.title;
  const target = input.podName ?? input.serviceName;
  return `${category ?? "Incident"} — ${target}${input.namespace ? ` (${input.namespace})` : ""}`;
}

export async function openIncident(
  ctx: { workspaceId: Types.ObjectId; datasetName: string },
  input: IncidentOpenInput,
): Promise<IncidentOpenResult> {
  const workspaceId = ctx.workspaceId.toString();
  const { context, connectorsUsed, connectorsSkipped } = await enrichIncidentContext({
    workspaceId,
    datasetName: ctx.datasetName,
    serviceName: input.serviceName,
    namespace: input.namespace,
    podName: input.podName,
    githubOwner: input.githubOwner,
    githubRepo: input.githubRepo,
    argocdApplication: input.argocdApplication,
    prometheusQuery: input.prometheusQuery,
  });

  const classificationText = buildClassificationText(context);
  const classification = classifyFailure(classificationText || input.serviceName);
  const title = defaultTitle(input, classification.category);
  const severity = input.severity ?? (classification.category === "Resource Limit" ? "high" : "medium");

  const incident = await IncidentRecord.create({
    workspaceId: ctx.workspaceId,
    title,
    status: "open",
    severity,
    serviceName: input.serviceName,
    namespace: input.namespace,
    podName: input.podName,
    rootCauseCategory: classification.category,
    rootCauseDescription:
      classification.matchedPattern
        ? `${classification.category} — matched "${classification.matchedPattern}"`
        : classification.category,
    recommendedFix: classification.suggestion,
    context,
  });

  let memoryRecordId: string | undefined;
  let memoryIndexingStatus: string | undefined;

  if (input.rememberInMemory !== false) {
    try {
      const memoryResult = await rememberMemory(ctx, {
        episode: {
          entity: "Incident",
          service: {
            name: input.serviceName,
            criticality: severity === "critical" || severity === "high" ? "high" : "medium",
          },
          deployment: input.namespace
            ? {
                timestamp: new Date().toISOString(),
                namespace: input.namespace,
                cluster: "demo",
              }
            : undefined,
          incident: {
            time: new Date().toISOString(),
            severity,
            status: "open",
          },
          rootCause: {
            category: classification.category,
            description: incident.rootCauseDescription ?? classification.category,
          },
          fixAction: classification.suggestion
            ? { type: "config-change", description: classification.suggestion }
            : undefined,
          errorLogSnippet: context.kubernetes?.logs
            ? { source: "k8s_pod_logs", snippet: context.kubernetes.logs.slice(0, 4000) }
            : undefined,
          relations: ["Deployment-hasIncident-Incident", "Incident-hasRootCause-RootCause"],
          rawText: `Operational incident ${incident._id.toString()} for ${input.serviceName}`,
        },
      });
      memoryRecordId = memoryResult.recordId;
      memoryIndexingStatus = memoryResult.indexingStatus ?? "indexed";
      incident.memoryRecordId = memoryRecordId;
      await incident.save();
    } catch {
      connectorsSkipped.push("memory_remember");
    }
  }

  let pagerDutyIncidentId: string | undefined;
  let pagerDutyIncidentUrl: string | undefined;

  if (input.triggerPagerDuty) {
    if (await isPagerDutyAvailable(workspaceId)) {
      try {
        let serviceId = input.pagerDutyServiceId;
        if (!serviceId) {
          const { config } = await requireConnector(workspaceId, "pagerduty");
          serviceId = String(config.defaultServiceId ?? "").trim() || undefined;
        }
        if (serviceId) {
          const pd = await createPagerDutyIncident({
            workspaceId,
            title,
            serviceId,
            body: `${incident.rootCauseDescription}\n\nIncident ID: ${incident._id.toString()}`,
            urgency: severity === "critical" || severity === "high" ? "high" : "low",
          });
          pagerDutyIncidentId = pd.id;
          pagerDutyIncidentUrl = pd.html_url;
          incident.pagerDutyIncidentId = pagerDutyIncidentId;
          incident.pagerDutyIncidentUrl = pagerDutyIncidentUrl;
          await incident.save();
          connectorsUsed.push("pagerduty");
        } else {
          connectorsSkipped.push("pagerduty (no serviceId — set defaultServiceId in connector config)");
        }
      } catch {
        connectorsSkipped.push("pagerduty");
      }
    } else {
      connectorsSkipped.push("pagerduty");
    }
  }

  let slackChannel: string | undefined;
  let slackMessageTs: string | undefined;

  if (input.notifySlack !== false) {
    if (await isSlackAvailable(workspaceId)) {
      try {
        const channel = input.slackChannel ?? (await resolveDefaultChannel(workspaceId)) ?? "k8s-update";
        const text = formatIncidentOpenedSlackMessage(incident, context);
        const result = (await postMessage({ workspaceId, channel, text })) as {
          ts?: string;
          channel?: string;
        };
        slackChannel = channel;
        slackMessageTs = result.ts;
        incident.slackChannel = slackChannel;
        incident.slackMessageTs = slackMessageTs;
        await incident.save();
        connectorsUsed.push("slack");
      } catch {
        connectorsSkipped.push("slack");
      }
    } else {
      connectorsSkipped.push("slack");
    }
  }

  return {
    incidentId: incident._id.toString(),
    title: incident.title,
    status: incident.status,
    severity: incident.severity,
    rootCauseCategory: classification.category,
    rootCauseDescription: incident.rootCauseDescription,
    recommendedFix: incident.recommendedFix,
    memoryRecordId,
    memoryIndexingStatus,
    pagerDutyIncidentId,
    pagerDutyIncidentUrl,
    slackChannel,
    slackMessageTs,
    context,
    connectorsUsed: [...new Set(connectorsUsed)],
    connectorsSkipped: [...new Set(connectorsSkipped)],
  };
}

export async function getIncidentById(
  workspaceId: Types.ObjectId,
  incidentId: string,
): Promise<unknown | null> {
  return IncidentRecord.findOne({ _id: incidentId, workspaceId }).lean();
}

export async function listIncidents(
  workspaceId: Types.ObjectId,
  limit = 20,
): Promise<unknown[]> {
  return IncidentRecord.find({ workspaceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function updateIncident(
  ctx: { workspaceId: Types.ObjectId },
  incidentId: string,
  update: { status?: "open" | "investigating" | "resolved" | "closed"; note?: string; notifySlack?: boolean; slackChannel?: string },
): Promise<unknown> {
  const incident = await IncidentRecord.findOne({ _id: incidentId, workspaceId: ctx.workspaceId });
  if (!incident) {
    throw new Error("Incident not found");
  }

  if (update.status) {
    incident.status = update.status;
    if (update.status === "resolved" || update.status === "closed") {
      incident.resolvedAt = new Date();
    }
  }
  await incident.save();

  if (update.notifySlack !== false) {
    const workspaceId = ctx.workspaceId.toString();
    if (await isSlackAvailable(workspaceId)) {
      const channel =
        update.slackChannel ?? incident.slackChannel ?? (await resolveDefaultChannel(workspaceId));
      if (channel) {
        const text = formatIncidentUpdatedSlackMessage(incident, update.note);
        await postMessage({ workspaceId, channel, text });
      }
    }
  }

  return incident.toObject();
}
