import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  pagerdutyGetIncidentInputSchema,
  pagerdutyGetIncidentLogEntriesInputSchema,
  pagerdutyListIncidentNotesInputSchema,
  pagerdutyListIncidentsInputSchema,
  pagerdutyListOncallsInputSchema,
  pagerdutyListUsersInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getIncident,
  isPagerDutyAvailable,
  listIncidentLogEntries,
  listIncidentNotes,
  listIncidents,
  listOncalls,
  listServices,
  listUsers,
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
      description: "List PagerDuty incidents by status, service, or time range (read-only). Requires PagerDuty connector.",
      inputSchema: {
        statuses: z.array(z.enum(["triggered", "acknowledged", "resolved"])).optional(),
        serviceIds: z.array(z.string()).optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        sortBy: z.string().optional(),
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

  server.registerTool(
    "pagerduty_get_incident_log_entries",
    {
      title: "PagerDuty Incident Log Entries",
      description: "Fetch timeline log entries for a PagerDuty incident (read-only). Requires PagerDuty connector.",
      inputSchema: {
        incidentId: z.string(),
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
        const input = pagerdutyGetIncidentLogEntriesInputSchema.parse(args);
        const logEntries = await listIncidentLogEntries({ ...input, workspaceId });
        return textContent({ logEntries });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_incident_notes",
    {
      title: "PagerDuty Incident Notes",
      description: "List notes on a PagerDuty incident (read-only). Requires PagerDuty connector.",
      inputSchema: {
        incidentId: z.string(),
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
        const input = pagerdutyListIncidentNotesInputSchema.parse(args);
        const notes = await listIncidentNotes({ ...input, workspaceId });
        return textContent({ notes });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_oncalls",
    {
      title: "PagerDuty List Oncalls",
      description: "List who is currently on call (read-only). Requires PagerDuty connector.",
      inputSchema: {
        scheduleIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
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
        const input = pagerdutyListOncallsInputSchema.parse(args);
        const oncalls = await listOncalls({ ...input, workspaceId });
        return textContent({ oncalls });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_users",
    {
      title: "PagerDuty List Users",
      description: "List users in the PagerDuty account (read-only). Requires PagerDuty connector.",
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
        const input = pagerdutyListUsersInputSchema.parse(args);
        const users = await listUsers({ ...input, workspaceId });
        return textContent({ users });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );
}
