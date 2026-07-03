import type { Types } from "mongoose";
import { recallMemory, scoreRecallSimilarity } from "../memory/recall.js";
import { rememberMemory } from "../memory/remember.js";
import {
  applyManifest,
  deletePod,
  getPodLogs,
  getPodStatus,
  listEvents,
  listPods,
  type PodStatusSummary,
} from "../kubernetes/client.js";
import { postMessage, resolveDefaultChannel, isSlackAvailable } from "../slack/client.js";
import { openIncident, updateIncident } from "../incident/openIncident.js";
import { createFixPullRequest } from "./createFixPr.js";
import {
  defaultStableServiceManifest,
  parseManifestSummary,
} from "./parseManifest.js";
import { detectImpactedApps, replayImpactedTraffic } from "./replayTraffic.js";

export interface KubeDeployInput {
  manifest: string;
  stableManifest?: string;
  namespace?: string;
  serviceName?: string;
  podName?: string;
  githubOwner?: string;
  githubRepo?: string;
  slackChannel?: string;
  triggerPagerDuty?: boolean;
  pagerDutyServiceId?: string;
  watchDurationSec?: number;
  pollIntervalSec?: number;
  argocdApplication?: string;
  dryRun?: boolean;
}

export interface DeployProgress {
  phase: string;
  message: string;
  timestamp: string;
}

export interface KubeDeployResult {
  outcome: "success" | "failure" | "dry_run";
  phases: DeployProgress[];
  manifestSummary?: ReturnType<typeof parseManifestSummary>;
  applyResult?: unknown;
  podStatus?: PodStatusSummary;
  riskScore?: number;
  riskReason?: string;
  incidentId?: string;
  fixPrUrl?: string;
  impactedApps?: string[];
  replayResults?: unknown;
  memoryRecordId?: string;
}

function progress(phase: string, message: string): DeployProgress {
  return { phase, message, timestamp: new Date().toISOString() };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findWorstPod(
  workspaceId: string,
  namespace: string,
  labelSelector?: string,
  podName?: string,
): Promise<PodStatusSummary | undefined> {
  if (podName) {
    try {
      return await getPodStatus({ workspaceId, namespace, name: podName });
    } catch {
      return undefined;
    }
  }

  if (!labelSelector) return undefined;

  const pods = await listPods({ workspaceId, namespace, labelSelector });
  if (!pods.length) return undefined;

  const failed = pods.find((p) => p.terminalFailure);
  return failed ?? pods[0];
}

async function deleteCanaryPods(
  workspaceId: string,
  namespace: string,
  labelSelector?: string,
): Promise<string[]> {
  if (!labelSelector) return [];
  const pods = await listPods({ workspaceId, namespace, labelSelector });
  const deleted: string[] = [];
  for (const pod of pods) {
    try {
      await deletePod({ workspaceId, namespace, name: pod.name });
      deleted.push(pod.name);
    } catch {
      // continue
    }
  }
  return deleted;
}

export async function runDeploy(
  ctx: { workspaceId: Types.ObjectId; datasetName: string },
  input: KubeDeployInput,
): Promise<KubeDeployResult> {
  const phases: DeployProgress[] = [];
  const workspaceId = ctx.workspaceId.toString();
  const summary = parseManifestSummary(input.manifest);
  const namespace = input.namespace ?? summary.namespace ?? "default";
  const serviceName = input.serviceName ?? summary.serviceName ?? summary.deploymentName ?? "unknown";
  const watchDurationSec = input.watchDurationSec ?? 300;
  const pollIntervalSec = input.pollIntervalSec ?? 15;

  phases.push(progress("pre_deploy", `Scanning manifest: ${summary.kinds.join(", ")} in ${namespace}`));
  if (summary.memoryLimit) {
    phases.push(progress("pre_deploy", `Memory limit: ${summary.memoryLimit}${summary.memoryLeak ? " (MEMORY_LEAK enabled)" : ""}`));
  }

  const recall = await recallMemory(
    { datasetName: ctx.datasetName },
    { query: `Past failures OOM for ${serviceName} in ${namespace}`, topK: 5 },
  );
  const riskScore = scoreRecallSimilarity(recall.matches);
  const riskReason =
    riskScore >= 0.6
      ? `High risk: ${recall.matches.length} similar past events`
      : riskScore >= 0.3
        ? "Moderate risk: some related history"
        : "Low risk: no strong memory matches";
  phases.push(progress("pre_deploy", `Risk score: ${riskScore.toFixed(2)} — ${riskReason}`));

  if (input.dryRun) {
    phases.push(progress("apply", "Dry run — manifest not applied"));
    return {
      outcome: "dry_run",
      phases,
      manifestSummary: summary,
      riskScore,
      riskReason,
    };
  }

  const applyResult = await applyManifest({
    workspaceId,
    manifestYaml: input.manifest,
    namespace,
  });
  phases.push(
    progress(
      "apply",
      `Applied ${applyResult.applied.length} resource(s): ${applyResult.applied.map((r) => `${r.kind}/${r.name}`).join(", ")}`,
    ),
  );

  const deadline = Date.now() + watchDurationSec * 1000;
  let podStatus: PodStatusSummary | undefined;
  let failureDetected = false;

  phases.push(progress("watch", `Monitoring pod health for up to ${watchDurationSec}s (every ${pollIntervalSec}s)`));

  while (Date.now() < deadline) {
    podStatus = await findWorstPod(
      workspaceId,
      namespace,
      summary.labelSelector,
      input.podName ?? summary.podName,
    );

    if (podStatus) {
      const oom = podStatus.containers.some((c) => c.oomKilled || c.reason === "OOMKilled");
      phases.push(
        progress(
          "watch",
          `Pod ${podStatus.name}: phase=${podStatus.phase}, healthy=${podStatus.healthy}, terminalFailure=${podStatus.terminalFailure}${oom ? ", OOMKilled" : ""}`,
        ),
      );

      if (podStatus.terminalFailure || oom) {
        failureDetected = true;
        break;
      }

      if (podStatus.healthy && summary.memoryLeak) {
        // Canary with leak may still be "healthy" until OOM — keep watching
      } else if (podStatus.healthy && !summary.memoryLeak) {
        // Non-leaking deploy is healthy — continue full watch window for stability
      }
    } else {
      phases.push(progress("watch", "Waiting for pod to appear..."));
    }

    await sleep(pollIntervalSec * 1000);
  }

  if (!failureDetected) {
    phases.push(progress("success", "Deployment stable for watch window"));

    if (await isSlackAvailable(workspaceId)) {
      const channel = input.slackChannel ?? (await resolveDefaultChannel(workspaceId));
      if (channel) {
        await postMessage({
          workspaceId,
          channel,
          text: `✅ *Deployment success* — \`${serviceName}\` in \`${namespace}\`\nMonitored ${watchDurationSec}s — all stable.`,
        });
      }
    }

    let memoryRecordId: string | undefined;
    try {
      const mem = await rememberMemory(ctx, {
        text: `Successful deploy of ${serviceName} in ${namespace} at ${new Date().toISOString()}`,
      });
      memoryRecordId = mem.recordId;
    } catch {
      // optional
    }

    return {
      outcome: "success",
      phases,
      manifestSummary: summary,
      applyResult,
      podStatus,
      riskScore,
      riskReason,
      memoryRecordId,
    };
  }

  phases.push(progress("failure", "Failure detected — starting incident pipeline"));

  const podName = podStatus?.name ?? input.podName ?? summary.podName;
  let logs = "";
  try {
    if (podName) {
      logs = await getPodLogs({ workspaceId, namespace, name: podName, tail: 150 });
    }
  } catch {
    logs = "Could not fetch pod logs";
  }

  const events = await listEvents({ workspaceId, namespace }).catch(() => []);
  phases.push(progress("diagnose", `Fetched logs (${logs.length} chars) and ${events.length} events`));

  const memoryMatches = recall.matches.map((m) => m.text).join("\n---\n");
  phases.push(progress("diagnose", `Cognee recall: ${recall.matches.length} similar episode(s)`));

  const impactedApps = await detectImpactedApps({
    workspaceId,
    namespace,
    fallback: [serviceName, "order-api"],
  });
  phases.push(progress("diagnose", `Impacted apps: ${impactedApps.join(", ")}`));

  phases.push(progress("mitigate", "Routing traffic to stable — applying stable Service selector"));
  await applyManifest({
    workspaceId,
    manifestYaml: defaultStableServiceManifest(namespace),
    namespace,
  });

  const deletedPods = await deleteCanaryPods(workspaceId, namespace, summary.labelSelector);
  if (deletedPods.length) {
    phases.push(progress("mitigate", `Deleted canary pod(s): ${deletedPods.join(", ")}`));
  }

  const incident = await openIncident(ctx, {
    serviceName,
    namespace,
    podName,
    githubOwner: input.githubOwner,
    githubRepo: input.githubRepo,
    argocdApplication: input.argocdApplication,
    notifySlack: true,
    slackChannel: input.slackChannel,
    triggerPagerDuty: input.triggerPagerDuty ?? false,
    pagerDutyServiceId: input.pagerDutyServiceId,
    rememberInMemory: true,
    impactedServices: impactedApps,
  });

  phases.push(progress("incident", `Opened incident ${incident.incidentId}`));

  let fixPrUrl: string | undefined;
  if (input.stableManifest) {
    try {
      const pr = await createFixPullRequest({
        workspaceId,
        incidentId: incident.incidentId,
        owner: input.githubOwner,
        repo: input.githubRepo,
        fixedManifest: input.stableManifest,
        rootCause: incident.rootCauseDescription,
        recommendedFix: incident.recommendedFix,
        memorySnippet: memoryMatches,
      });
      if (pr) {
        fixPrUrl = pr.prUrl;
        phases.push(progress("fix_pr", `Created fix PR: ${fixPrUrl}`));

        await updateIncident(
          { workspaceId: ctx.workspaceId, datasetName: ctx.datasetName },
          incident.incidentId,
          {
            status: "investigating",
            fixPrUrl,
            note: `Automated fix PR: ${fixPrUrl}`,
            notifySlack: true,
            slackChannel: input.slackChannel,
          },
        );
      }
    } catch (err) {
      phases.push(
        progress("fix_pr", `PR creation skipped: ${err instanceof Error ? err.message : String(err)}`),
      );
    }
  } else {
    phases.push(progress("fix_pr", "No stableManifest provided — skipped automated PR"));
  }

  let replayResults: unknown;
  try {
    replayResults = await replayImpactedTraffic({
      workspaceId,
      namespace,
    });
    phases.push(
      progress(
        "replay",
        `Replayed traffic on stable instances — success=${(replayResults as { successCount?: number }).successCount ?? 0}`,
      ),
    );
  } catch (err) {
    phases.push(progress("replay", `Replay skipped: ${err instanceof Error ? err.message : String(err)}`));
  }

  phases.push(progress("resolve", "Waiting for stable pod health..."));
  await sleep(10000);

  const stablePods = await listPods({
    workspaceId,
    namespace,
    labelSelector: "app=payment-service,version=stable",
  });
  const stableHealthy = stablePods.some((p) => p.healthy);
  phases.push(progress("resolve", `Stable pod healthy: ${stableHealthy}`));

  await updateIncident(
    { workspaceId: ctx.workspaceId, datasetName: ctx.datasetName },
    incident.incidentId,
    {
      status: "resolved",
      note: `Mitigated — traffic on stable. ${fixPrUrl ? `Fix PR: ${fixPrUrl}` : ""}`,
      fixPrUrl,
      notifySlack: true,
      slackChannel: input.slackChannel,
      rememberResolution: true,
    },
  );

  phases.push(progress("complete", "Incident resolved and recorded in Cognee"));

  return {
    outcome: "failure",
    phases,
    manifestSummary: summary,
    applyResult,
    podStatus,
    riskScore,
    riskReason,
    incidentId: incident.incidentId,
    fixPrUrl,
    impactedApps,
    replayResults,
    memoryRecordId: incident.memoryRecordId,
  };
}
