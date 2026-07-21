import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import { jiraGetIssueInputSchema, jiraListServiceRequestsInputSchema, jiraSearchIssuesInputSchema } from "../../schemas/mcp/toolInputs.js";
import { getIssue, isJiraAvailable, listServiceRequests, searchIssues } from "../../services/jira/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

function unavailable() {
  return textContent({ error: "Jira connector not configured or not enabled. Connect Jira in the kube-memory dashboard." });
}

export function registerJiraTools(server: McpServer): void {
  server.registerTool("jira_search_issues", {
    title: "Jira Search Issues",
    description: integrationToolDescription("Jira", "Search Jira Software and Jira Service Management issues with bounded JQL results"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { jql: z.string(), maxResults: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isJiraAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await searchIssues({ workspaceId, ...jiraSearchIssuesInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("jira", err); }
  });

  server.registerTool("jira_get_issue", {
    title: "Jira Get Issue",
    description: integrationToolDescription("Jira", "Fetch an issue, its comments, and linked change or incident context"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { issueKey: z.string() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isJiraAvailable(workspaceId))) return unavailable();
    try { return textContent({ issue: await getIssue({ workspaceId, ...jiraGetIssueInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("jira", err); }
  });

  server.registerTool("jira_list_service_requests", {
    title: "Jira Service Management Requests",
    description: integrationToolDescription("Jira", "List requests from a configured Jira Service Management service desk"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { serviceDeskId: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isJiraAvailable(workspaceId))) return unavailable();
    try { return textContent({ requests: await listServiceRequests({ workspaceId, ...jiraListServiceRequestsInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("jira", err); }
  });
}
