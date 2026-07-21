import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  azureGetServiceContextInputSchema,
  azureListAlertsInputSchema,
  azureSearchLogsInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import { getServiceContext, isAzureAvailable, listAlerts, searchLogs } from "../../services/azure/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

function unavailable() {
  return textContent({ error: "Azure connector not configured or not enabled. Connect Azure in the kube-memory dashboard." });
}

export function registerAzureTools(server: McpServer): void {
  server.registerTool(
    "azure_get_service_context",
    {
      title: "Azure Service Context",
      description: integrationToolDescription("Azure", "Find resources tagged with a service name"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: { service: z.string() },
    },
    async (args: Record<string, unknown>) => {
      const workspaceId = requireAuthContext().workspace._id.toString();
      if (!(await isAzureAvailable(workspaceId))) return unavailable();
      try {
        return textContent({
          result: await getServiceContext({ workspaceId, ...azureGetServiceContextInputSchema.parse(args) }),
        });
      } catch (err) {
        return connectorError("azure", err);
      }
    },
  );

  server.registerTool(
    "azure_list_alerts",
    {
      title: "Azure Monitor Alerts",
      description: integrationToolDescription("Azure", "List bounded metric and scheduled query alert rules"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        namePrefix: z.string().optional(),
        enabled: z.boolean().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const workspaceId = requireAuthContext().workspace._id.toString();
      if (!(await isAzureAvailable(workspaceId))) return unavailable();
      try {
        return textContent({
          result: await listAlerts({ workspaceId, ...azureListAlertsInputSchema.parse(args) }),
        });
      } catch (err) {
        return connectorError("azure", err);
      }
    },
  );

  server.registerTool(
    "azure_search_logs",
    {
      title: "Azure Log Analytics Search",
      description: integrationToolDescription(
        "Azure",
        "Run a bounded KQL query against Log Analytics; maximum 50 rows and five seconds",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        query: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        workspaceId: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const workspaceId = requireAuthContext().workspace._id.toString();
      if (!(await isAzureAvailable(workspaceId))) return unavailable();
      try {
        const parsed = azureSearchLogsInputSchema.parse(args);
        return textContent({
          result: await searchLogs({
            workspaceId,
            query: parsed.query,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            workspaceIdOverride: parsed.workspaceId,
            limit: parsed.limit,
          }),
        });
      } catch (err) {
        return connectorError("azure", err);
      }
    },
  );
}
