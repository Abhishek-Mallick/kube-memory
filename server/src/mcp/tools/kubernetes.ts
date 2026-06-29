import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  k8sGetEventsInputSchema,
  k8sPodLogsInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import { getConnectorSecret } from "../../services/connectors/connectorSecrets.js";
import { getPodLogs, listEvents } from "../../services/kubernetes/client.js";
import { getEnv } from "../../config/env.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function isKubernetesAvailable(workspaceId: string): Promise<boolean> {
  const connector = await getConnectorSecret(workspaceId, "kubernetes");
  if (connector?.secret) return true;
  return Boolean(getEnv().KUBECONFIG_BASE64);
}

export function registerKubernetesTools(server: McpServer): void {
  server.registerTool(
    "k8s_pod_logs",
    {
      title: "Kubernetes Pod Logs",
      description: "Fetch logs for a pod in a namespace (read-only).",
      inputSchema: {
        name: z.string(),
        namespace: z.string().optional(),
        container: z.string().optional(),
        tail: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isKubernetesAvailable(workspaceId))) {
        return textContent({
          error: "Kubernetes connector not configured. Connect Kubernetes in the dashboard.",
        });
      }

      const input = k8sPodLogsInputSchema.parse(args);
      const logs = await getPodLogs({ ...input, workspaceId });
      return textContent({ logs });
    },
  );

  server.registerTool(
    "k8s_get_events",
    {
      title: "Kubernetes Events",
      description: "List cluster or namespace events for debugging.",
      inputSchema: {
        namespace: z.string().optional(),
        fieldSelector: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isKubernetesAvailable(workspaceId))) {
        return textContent({
          error: "Kubernetes connector not configured. Connect Kubernetes in the dashboard.",
        });
      }

      const input = k8sGetEventsInputSchema.parse(args);
      const events = await listEvents({ ...input, workspaceId });
      return textContent({ events });
    },
  );
}
