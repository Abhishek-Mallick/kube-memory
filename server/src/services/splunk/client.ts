import { baseUrlFromConfig, connectorJson, requireConnector } from "../connectors/connectorHttp.js";

async function servicesBase(workspaceId: string): Promise<string> {
  const { config } = await requireConnector(workspaceId, "splunk");
  const baseUrl = baseUrlFromConfig(config);
  if (!baseUrl) throw new Error("Splunk base URL is required");
  return `${baseUrl}/services`;
}

function form(body: Record<string, string>): string {
  return new URLSearchParams(body).toString();
}

export async function searchLogs(options: {
  workspaceId: string;
  query: string;
  earliestTime?: string;
  latestTime?: string;
  limit?: number;
}): Promise<unknown> {
  const base = await servicesBase(options.workspaceId);
  const requestedLimit = options.limit ?? 25;
  const job = await connectorJson<{ sid?: string }>(options.workspaceId, "splunk", `${base}/search/jobs?output_mode=json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({
      search: options.query,
      earliest_time: options.earliestTime ?? "-15m",
      latest_time: options.latestTime ?? "now",
      exec_mode: "normal",
    }),
  });
  if (!job.sid) throw new Error("Splunk did not return a search job ID");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await connectorJson<{ entry?: Array<{ content?: { isDone?: boolean; isFailed?: boolean; dispatchState?: string } }> }>(
      options.workspaceId, "splunk", `${base}/search/jobs/${encodeURIComponent(job.sid)}?output_mode=json`,
    );
    const content = status.entry?.[0]?.content;
    if (content?.isFailed) throw new Error("Splunk search job failed");
    if (content?.isDone) {
      return connectorJson(options.workspaceId, "splunk", `${base}/search/jobs/${encodeURIComponent(job.sid)}/results?output_mode=json&count=${requestedLimit}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Splunk search timed out after 5 seconds");
}

export async function listSavedSearches(options: { workspaceId: string; count?: number }): Promise<unknown> {
  const base = await servicesBase(options.workspaceId);
  return connectorJson(options.workspaceId, "splunk", `${base}/saved/searches?output_mode=json&count=${options.count ?? 25}`);
}

export async function listFiredAlerts(options: { workspaceId: string; count?: number }): Promise<unknown> {
  const base = await servicesBase(options.workspaceId);
  return connectorJson(options.workspaceId, "splunk", `${base}/alerts/fired_alerts?output_mode=json&count=${options.count ?? 25}`);
}

export async function isSplunkAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "splunk");
    return true;
  } catch {
    return false;
  }
}
