import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import { awsGetServiceContextInputSchema, awsListAlarmsInputSchema, awsSearchLogsInputSchema } from "../../schemas/mcp/toolInputs.js";
import { getServiceContext, isAwsAvailable, listAlarms, searchLogs } from "../../services/aws/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

function unavailable() { return textContent({ error: "AWS connector not configured or not enabled. Connect AWS in the kube-memory dashboard." }); }
export function registerAwsTools(server: McpServer): void {
  server.registerTool("aws_get_service_context", { title: "AWS Service Context", description: integrationToolDescription("AWS", "Find resources tagged with a service name"), annotations: READ_ONLY_ANNOTATIONS, inputSchema: { service: z.string(), region: z.string().optional() } }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString(); if (!(await isAwsAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await getServiceContext({ workspaceId, ...awsGetServiceContextInputSchema.parse(args) }) }); } catch (err) { return connectorError("aws", err); }
  });
  server.registerTool("aws_list_alarms", { title: "AWS CloudWatch Alarms", description: integrationToolDescription("AWS", "List bounded CloudWatch metric and composite alarms"), annotations: READ_ONLY_ANNOTATIONS, inputSchema: { state: z.enum(["OK", "ALARM", "INSUFFICIENT_DATA"]).optional(), alarmNamePrefix: z.string().optional(), region: z.string().optional(), limit: z.number().int().min(1).max(50).optional() } }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString(); if (!(await isAwsAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await listAlarms({ workspaceId, ...awsListAlarmsInputSchema.parse(args) }) }); } catch (err) { return connectorError("aws", err); }
  });
  server.registerTool("aws_search_logs", { title: "AWS CloudWatch Log Search", description: integrationToolDescription("AWS", "Run a bounded CloudWatch Logs Insights query; maximum 50 results and five seconds"), annotations: READ_ONLY_ANNOTATIONS, inputSchema: { logGroupNames: z.array(z.string()).min(1).max(10), query: z.string(), startTime: z.string(), endTime: z.string(), region: z.string().optional(), limit: z.number().int().min(1).max(50).optional() } }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString(); if (!(await isAwsAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await searchLogs({ workspaceId, ...awsSearchLogsInputSchema.parse(args) }) }); } catch (err) { return connectorError("aws", err); }
  });
}
