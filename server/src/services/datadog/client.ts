import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

async function apiBase(workspaceId: string): Promise<string> {
  const { config } = await requireConnector(workspaceId, "datadog");
  const site = String(config.site ?? "datadoghq.com").trim();
  if (!/^[a-z0-9.-]+$/i.test(site)) throw new Error("Invalid Datadog site");
  return `https://api.${site}`;
}

export async function getServiceContext(options: { workspaceId: string; service: string }): Promise<unknown> {
  const base = await apiBase(options.workspaceId);
  const [definition, monitors] = await Promise.all([
    connectorJson(options.workspaceId, "datadog", `${base}/api/v2/services/definitions/${encodeURIComponent(options.service)}`).catch((error: unknown) => ({ error: error instanceof Error ? error.message : String(error) })),
    connectorJson(options.workspaceId, "datadog", `${base}/api/v1/monitor/search?query=${encodeURIComponent(`service:${options.service}`)}`).catch((error: unknown) => ({ error: error instanceof Error ? error.message : String(error) })),
  ]);
  return { service: options.service, definition, monitors };
}

export async function listMonitors(options: { workspaceId: string; query?: string; limit?: number }): Promise<unknown> {
  const base = await apiBase(options.workspaceId);
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("query", options.query.trim());
  const result = await connectorJson<{ monitors?: unknown[] }>(
    options.workspaceId,
    "datadog",
    `${base}/api/v1/monitor/search${params.size ? `?${params}` : ""}`,
  );
  return { ...result, monitors: result.monitors?.slice(0, options.limit ?? 25) ?? [] };
}

export async function searchEvidence(options: {
  workspaceId: string;
  type: "logs" | "traces";
  query: string;
  from: string;
  to: string;
  limit?: number;
}): Promise<unknown> {
  const base = await apiBase(options.workspaceId);
  const index = options.type === "logs" ? "logs" : "spans";
  return connectorJson(options.workspaceId, "datadog", `${base}/api/v2/${index}/events/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filter: { from: options.from, to: options.to, query: options.query },
      page: { limit: options.limit ?? 25 },
      sort: "timestamp",
    }),
  });
}

export async function isDatadogAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "datadog");
    return true;
  } catch {
    return false;
  }
}
