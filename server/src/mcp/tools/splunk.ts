import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import { splunkListFiredAlertsInputSchema, splunkListSavedSearchesInputSchema, splunkSearchLogsInputSchema } from "../../schemas/mcp/toolInputs.js";
import { isSplunkAvailable, listFiredAlerts, listSavedSearches, searchLogs } from "../../services/splunk/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

function unavailable() {
  return textContent({ error: "Splunk connector not configured or not enabled. Connect Splunk in the kube-memory dashboard." });
}

export function registerSplunkTools(server: McpServer): void {
  server.registerTool("splunk_search_logs", {
    title: "Splunk Search Logs",
    description: integrationToolDescription("Splunk", "Run a bounded SPL log search; jobs are limited to five seconds and 50 result records"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { query: z.string(), earliestTime: z.string().optional(), latestTime: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isSplunkAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await searchLogs({ workspaceId, ...splunkSearchLogsInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("splunk", err); }
  });

  server.registerTool("splunk_list_saved_searches", {
    title: "Splunk Saved Searches",
    description: integrationToolDescription("Splunk", "List bounded saved searches and alert definitions available to the connector"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { count: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isSplunkAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await listSavedSearches({ workspaceId, ...splunkListSavedSearchesInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("splunk", err); }
  });

  server.registerTool("splunk_list_fired_alerts", {
    title: "Splunk Fired Alerts",
    description: integrationToolDescription("Splunk", "List recent fired alerts for incident correlation"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { count: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isSplunkAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await listFiredAlerts({ workspaceId, ...splunkListFiredAlertsInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("splunk", err); }
  });
}
