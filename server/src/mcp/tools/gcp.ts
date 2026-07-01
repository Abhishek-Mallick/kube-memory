import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  gcpGetInstanceInputSchema,
  gcpListInstancesInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getInstance,
  isGcpAvailable,
  listInstances,
} from "../../services/gcp/client.js";
import { integrationToolDescription } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

export function registerGcpTools(server: McpServer): void {
  server.registerTool(
    "gcp_list_instances",
    {
      title: "GCP List Compute Instances",
      description: integrationToolDescription(
        "Google Cloud",
        "List Compute Engine VM instances",
        "Uses OAuth credentials from the dashboard. NEVER use local gcloud commands.",
      ),
      inputSchema: {
        project: z.string().optional(),
        zone: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error: "Google Cloud connector not configured. Connect Google Cloud in the kube-memory dashboard.",
        });
      }
      try {
        const input = gcpListInstancesInputSchema.parse(args);
        const result = await listInstances({ workspaceId, ...input });
        return textContent({ result });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_get_instance",
    {
      title: "GCP Get Compute Instance",
      description: integrationToolDescription(
        "Google Cloud",
        "Get details for a single Compute Engine VM instance",
        "Requires zone and instance name. NEVER use local gcloud commands.",
      ),
      inputSchema: {
        project: z.string().optional(),
        zone: z.string(),
        instance: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error: "Google Cloud connector not configured. Connect Google Cloud in the kube-memory dashboard.",
        });
      }
      try {
        const input = gcpGetInstanceInputSchema.parse(args);
        const result = await getInstance({ workspaceId, ...input });
        return textContent({ result });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );
}
