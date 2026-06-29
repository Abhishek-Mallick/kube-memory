import {
  baseUrlFromConfig,
  connectorJson,
  requireConnector,
} from "../connectors/connectorHttp.js";

async function promUrl(workspaceId: string, path: string): Promise<string> {
  const { config } = await requireConnector(workspaceId, "prometheus");
  const base = baseUrlFromConfig(config);
  if (!base) throw new Error("Prometheus baseUrl is required in connector config");
  return `${base}${path}`;
}

export async function instantQuery(options: {
  workspaceId: string;
  query: string;
  time?: string;
}): Promise<unknown> {
  const params = new URLSearchParams({ query: options.query });
  if (options.time) params.set("time", options.time);
  const url = await promUrl(options.workspaceId, `/api/v1/query?${params}`);
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function rangeQuery(options: {
  workspaceId: string;
  query: string;
  start: string;
  end: string;
  step?: string;
}): Promise<unknown> {
  const params = new URLSearchParams({
    query: options.query,
    start: options.start,
    end: options.end,
    step: options.step ?? "60s",
  });
  const url = await promUrl(options.workspaceId, `/api/v1/query_range?${params}`);
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listTargets(options: {
  workspaceId: string;
}): Promise<unknown> {
  const url = await promUrl(options.workspaceId, "/api/v1/targets");
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listAlerts(options: {
  workspaceId: string;
}): Promise<unknown> {
  const url = await promUrl(options.workspaceId, "/api/v1/alerts");
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function isPrometheusAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "prometheus");
    return true;
  } catch {
    return false;
  }
}
