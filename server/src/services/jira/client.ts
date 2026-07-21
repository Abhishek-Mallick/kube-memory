import { baseUrlFromConfig, connectorJson, requireConnector } from "../connectors/connectorHttp.js";

function apiBase(config: Record<string, unknown>): string {
  const baseUrl = baseUrlFromConfig(config);
  if (!baseUrl) throw new Error("Jira base URL is required");
  return `${baseUrl}/rest/api/3`;
}

export async function searchIssues(options: {
  workspaceId: string;
  jql: string;
  maxResults?: number;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "jira");
  const params = new URLSearchParams({
    jql: options.jql,
    maxResults: String(options.maxResults ?? 25),
    fields: "summary,status,priority,assignee,reporter,labels,components,created,updated,issuetype,project",
  });
  return connectorJson(options.workspaceId, "jira", `${apiBase(config)}/search/jql?${params}`);
}

export async function getIssue(options: { workspaceId: string; issueKey: string }): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "jira");
  return connectorJson(
    options.workspaceId,
    "jira",
    `${apiBase(config)}/issue/${encodeURIComponent(options.issueKey)}?fields=summary,description,status,priority,assignee,reporter,labels,components,created,updated,issuetype,project,comment,issuelinks`,
  );
}

export async function listServiceRequests(options: {
  workspaceId: string;
  serviceDeskId?: string;
  limit?: number;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "jira");
  const serviceDeskId = options.serviceDeskId ?? String(config.serviceDeskId ?? "").trim();
  if (!serviceDeskId) {
    throw new Error("serviceDeskId is required. Provide it or configure a default in the Jira connector.");
  }
  const baseUrl = baseUrlFromConfig(config);
  const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
  return connectorJson(
    options.workspaceId,
    "jira",
    `${baseUrl}/rest/servicedeskapi/servicedesk/${encodeURIComponent(serviceDeskId)}/request?${params}`,
  );
}

export async function isJiraAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "jira");
    return true;
  } catch {
    return false;
  }
}
