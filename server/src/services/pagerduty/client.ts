import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

export async function listIncidents(options: {
  workspaceId: string;
  statuses?: string[];
  serviceIds?: string[];
  limit?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 25));
  if (options.statuses?.length) {
    for (const status of options.statuses) {
      params.append("statuses[]", status);
    }
  }
  if (options.serviceIds?.length) {
    for (const id of options.serviceIds) {
      params.append("service_ids[]", id);
    }
  }

  const data = await connectorJson<{ incidents: unknown[] }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/incidents?${params}`,
  );
  return data.incidents ?? [];
}

export async function getIncident(options: {
  workspaceId: string;
  incidentId: string;
}): Promise<unknown> {
  const data = await connectorJson<{ incident: unknown }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/incidents/${encodeURIComponent(options.incidentId)}`,
  );
  return data.incident;
}

export async function listServices(options: {
  workspaceId: string;
  limit?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
  const data = await connectorJson<{ services: unknown[] }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/services?${params}`,
  );
  return data.services ?? [];
}

export async function isPagerDutyAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "pagerduty");
    return true;
  } catch {
    return false;
  }
}
