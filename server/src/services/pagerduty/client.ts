import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

export async function listIncidents(options: {
  workspaceId: string;
  statuses?: string[];
  serviceIds?: string[];
  since?: string;
  until?: string;
  sortBy?: string;
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
  if (options.since) {
    params.set("since", options.since);
  }
  if (options.until) {
    params.set("until", options.until);
  }
  if (options.sortBy) {
    params.set("sort_by", options.sortBy);
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

export async function listIncidentLogEntries(options: {
  workspaceId: string;
  incidentId: string;
  limit?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
  const data = await connectorJson<{ log_entries: unknown[] }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/incidents/${encodeURIComponent(options.incidentId)}/log_entries?${params}`,
  );
  return data.log_entries ?? [];
}

export async function listIncidentNotes(options: {
  workspaceId: string;
  incidentId: string;
  limit?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
  const data = await connectorJson<{ notes: unknown[] }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/incidents/${encodeURIComponent(options.incidentId)}/notes?${params}`,
  );
  return data.notes ?? [];
}

export async function listOncalls(options: {
  workspaceId: string;
  scheduleIds?: string[];
  userIds?: string[];
  limit?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
  if (options.scheduleIds?.length) {
    for (const id of options.scheduleIds) {
      params.append("schedule_ids[]", id);
    }
  }
  if (options.userIds?.length) {
    for (const id of options.userIds) {
      params.append("user_ids[]", id);
    }
  }
  const data = await connectorJson<{ oncalls: unknown[] }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/oncalls?${params}`,
  );
  return data.oncalls ?? [];
}

export async function listUsers(options: {
  workspaceId: string;
  limit?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
  const data = await connectorJson<{ users: unknown[] }>(
    options.workspaceId,
    "pagerduty",
    `https://api.pagerduty.com/users?${params}`,
  );
  return data.users ?? [];
}

export async function isPagerDutyAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "pagerduty");
    return true;
  } catch {
    return false;
  }
}
