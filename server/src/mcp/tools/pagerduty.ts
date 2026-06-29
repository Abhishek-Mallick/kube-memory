import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  pagerdutyGetIncidentInputSchema,
  pagerdutyListIncidentsInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getIncident,
  isPagerDutyAvailable,
  listIncidents,
  listServices,
} from "../../services/pagerduty/client.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}

export function registerPagerDutyTools(server: McpServer): void {
  server.registerTool(
    "pagerduty_list_incidents",
    {
      title: "PagerDuty List Incidents",
      description: "List PagerDuty incidents by status or service (read-only). Requires PagerDuty connector.",
      inputSchema: {
        statuses: z.array(z.enum(["triggered", "acknowledged", "resolved"])).optional(),
        serviceIds: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyListIncidentsInputSchema.parse(args);
        const incidents = await listIncidents({ ...input, workspaceId });
        return textContent({ incidents });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_get_incident",
    {
      title: "PagerDuty Get Incident",
      description: "Fetch details for a single PagerDuty incident (read-only). Requires PagerDuty connector.",
      inputSchema: {
        incidentId: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyGetIncidentInputSchema.parse(args);
        const incident = await getIncident({ ...input, workspaceId });
        return textContent({ incident });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_services",
    {
      title: "PagerDuty List Services",
      description: "List PagerDuty services in the account (read-only). Requires PagerDuty connector.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const limit = typeof args.limit === "number" ? args.limit : 25;
        const services = await listServices({ workspaceId, limit });
        return textContent({ services });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );
}
