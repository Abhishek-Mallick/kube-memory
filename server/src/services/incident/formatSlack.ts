import type { IncidentRecordDoc } from "../../db/models/IncidentRecord.js";
import type { IncidentContextSnapshot } from "./types.js";

function summarizeGithub(context: IncidentContextSnapshot): string {
  const gh = context.github;
  if (!gh || gh.error) return gh?.error ? `_GitHub: ${gh.error}_` : "_GitHub: not queried_";

  const commits = (gh.commits as Array<{ sha?: string; commit?: { message?: string } }> | undefined) ?? [];
  const prs = (gh.pullRequests as Array<{ number?: number; title?: string }> | undefined) ?? [];

  const lines: string[] = [];
  if (commits.length) {
    lines.push("*Recent commits:*");
    for (const c of commits.slice(0, 3)) {
      lines.push(`• \`${c.sha?.slice(0, 7) ?? "?"}\` ${c.commit?.message?.split("\n")[0] ?? ""}`);
    }
  }
  if (prs.length) {
    lines.push("*Open PRs:*");
    for (const pr of prs.slice(0, 3)) {
      lines.push(`• #${pr.number ?? "?"} ${pr.title ?? ""}`);
    }
  }
  return lines.length ? lines.join("\n") : "_No recent GitHub activity_";
}

function summarizePrometheus(context: IncidentContextSnapshot): string {
  const prom = context.prometheus;
  if (!prom || prom.error) return prom?.error ? `_Prometheus: ${prom.error}_` : "_Prometheus: not queried_";

  const alerts = (prom.alerts as Array<{ labels?: Record<string, string>; state?: string }> | undefined) ?? [];
  const firing = alerts.filter((a) => a.state === "firing");
  const lines: string[] = [];
  if (firing.length) {
    lines.push(`*Firing alerts (${firing.length}):*`);
    for (const a of firing.slice(0, 3)) {
      const name = a.labels?.alertname ?? "unknown";
      lines.push(`• \`${name}\``);
    }
  } else {
    lines.push("_No matching firing alerts_");
  }
  if (prom.query) {
    lines.push(`*Query:* \`${prom.query}\``);
  }
  return lines.join("\n");
}

function summarizeArgoCD(context: IncidentContextSnapshot): string {
  const argo = context.argocd;
  if (!argo || argo.error) return argo?.error ? `_ArgoCD: ${argo.error}_` : "_ArgoCD: not queried_";

  const app = argo.application as {
    status?: { sync?: { status?: string }; health?: { status?: string } };
    metadata?: { name?: string };
  } | undefined;

  if (!app) return "_ArgoCD: no application data_";
  const name = app.metadata?.name ?? "unknown";
  const sync = app.status?.sync?.status ?? "Unknown";
  const health = app.status?.health?.status ?? "Unknown";
  return `*App:* \`${name}\` · sync \`${sync}\` · health \`${health}\``;
}

export function formatIncidentOpenedSlackMessage(
  incident: IncidentRecordDoc,
  context: IncidentContextSnapshot,
): string {
  const k8sLogs = context.kubernetes?.logs?.trim().slice(0, 400);
  const podStatus = context.kubernetes?.podStatus;
  const statusLine = podStatus
    ? `*Pod status:* \`${podStatus.phase ?? "?"}\`${podStatus.containerReason ? ` · \`${podStatus.containerReason}\`` : ""}${podStatus.exitCode != null ? ` · exit \`${podStatus.exitCode}\`` : ""}`
    : "";
  const logBlock = k8sLogs ? `\n*Logs (tail):*\n\`\`\`\n${k8sLogs}\n\`\`\`` : "";

  return [
    `🚨 *Incident Opened* — \`${incident._id.toString()}\``,
    "",
    `*Title:* ${incident.title}`,
    `*Service:* \`${incident.serviceName}\`${incident.namespace ? ` · ns \`${incident.namespace}\`` : ""}${incident.podName ? ` · pod \`${incident.podName}\`` : ""}`,
    `*Severity:* ${incident.severity} · *Status:* ${incident.status}`,
    "",
    `*Root cause:* ${incident.rootCauseCategory ?? "Unknown"} — ${incident.rootCauseDescription ?? "Under investigation"}`,
    incident.recommendedFix ? `*Recommended fix:* ${incident.recommendedFix}` : "",
    statusLine,
    "",
    summarizePrometheus(context),
    "",
    summarizeArgoCD(context),
    "",
    summarizeGithub(context),
    logBlock,
    "",
    incident.pagerDutyIncidentId
      ? `*PagerDuty:* \`${incident.pagerDutyIncidentId}\`${incident.pagerDutyIncidentUrl ? ` · ${incident.pagerDutyIncidentUrl}` : ""}`
      : "",
    incident.memoryRecordId ? `*Memory record:* \`${incident.memoryRecordId}\`` : "",
    "",
    "_Opened via kube-memory `incident_open`_",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatIncidentUpdatedSlackMessage(
  incident: IncidentRecordDoc,
  note?: string,
): string {
  return [
    `📋 *Incident Updated* — \`${incident._id.toString()}\``,
    "",
    `*Title:* ${incident.title}`,
    `*Status:* ${incident.status}`,
    `*Service:* \`${incident.serviceName}\``,
    note ? `*Note:* ${note}` : "",
    incident.resolvedAt ? `*Resolved at:* ${incident.resolvedAt.toISOString()}` : "",
    "",
    "_Updated via kube-memory `incident_update`_",
  ]
    .filter(Boolean)
    .join("\n");
}
