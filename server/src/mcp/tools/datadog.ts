import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import { datadogGetServiceContextInputSchema, datadogListMonitorsInputSchema, datadogSearchEvidenceInputSchema } from "../../schemas/mcp/toolInputs.js";
import { getServiceContext, isDatadogAvailable, listMonitors, searchEvidence } from "../../services/datadog/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

function unavailable() {
  return textContent({ error: "Datadog connector not configured or not enabled. Connect Datadog in the kube-memory dashboard." });
}

export function registerDatadogTools(server: McpServer): void {
  server.registerTool("datadog_get_service_context", {
    title: "Datadog Service Context",
    description: integrationToolDescription("Datadog", "Get service-definition ownership and monitors for an incident or deployment"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { service: z.string() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isDatadogAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await getServiceContext({ workspaceId, ...datadogGetServiceContextInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("datadog", err); }
  });

  server.registerTool("datadog_list_monitors", {
    title: "Datadog List Monitors",
    description: integrationToolDescription("Datadog", "List monitors matching an optional scoped query"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { query: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isDatadogAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await listMonitors({ workspaceId, ...datadogListMonitorsInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("datadog", err); }
  });

  server.registerTool("datadog_search_evidence", {
    title: "Datadog Search Logs or Traces",
    description: integrationToolDescription("Datadog", "Search bounded log or trace evidence for diagnostics; this connector is read-only"),
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: { type: z.enum(["logs", "traces"]), query: z.string(), from: z.string(), to: z.string(), limit: z.number().int().min(1).max(50).optional() },
  }, async (args: Record<string, unknown>) => {
    const workspaceId = requireAuthContext().workspace._id.toString();
    if (!(await isDatadogAvailable(workspaceId))) return unavailable();
    try { return textContent({ result: await searchEvidence({ workspaceId, ...datadogSearchEvidenceInputSchema.parse(args) }) }); }
    catch (err) { return connectorError("datadog", err); }
  });
}
