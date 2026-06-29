import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  slackGetHistoryInputSchema,
  slackListChannelsInputSchema,
  slackPostMessageInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getChannelHistory,
  isSlackAvailable,
  listChannels,
  postMessage,
  resolveDefaultChannel,
} from "../../services/slack/client.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}

export function registerSlackTools(server: McpServer): void {
  server.registerTool(
    "slack_get_history",
    {
      title: "Slack Channel History",
      description: "Fetch recent messages from a Slack channel (read-only). Requires Slack connector.",
      inputSchema: {
        channel: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        oldest: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({ error: "Slack connector not configured. Connect Slack in the dashboard." });
      }
      try {
        const input = slackGetHistoryInputSchema.parse(args);
        const channel = input.channel ?? (await resolveDefaultChannel(workspaceId));
        if (!channel) {
          return textContent({ error: "channel is required (or set default channel in Slack connector config)" });
        }
        const messages = await getChannelHistory({ workspaceId, channel, limit: input.limit, oldest: input.oldest });
        return textContent({ channel, messages });
      } catch (err) {
        return connectorError("slack", err);
      }
    },
  );

  server.registerTool(
    "slack_list_channels",
    {
      title: "Slack List Channels",
      description: "List Slack channels the bot can access (read-only). Requires Slack connector.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({ error: "Slack connector not configured. Connect Slack in the dashboard." });
      }
      try {
        const input = slackListChannelsInputSchema.parse(args);
        const channels = await listChannels({ workspaceId, limit: input.limit });
        return textContent({ channels });
      } catch (err) {
        return connectorError("slack", err);
      }
    },
  );

  server.registerTool(
    "slack_post_message",
    {
      title: "Slack Post Message",
      description: "Post a message to a Slack channel. Requires Slack connector and admin role.",
      inputSchema: {
        channel: z.string().optional(),
        text: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to post Slack messages" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({ error: "Slack connector not configured. Connect Slack in the dashboard." });
      }
      try {
        const input = slackPostMessageInputSchema.parse(args);
        const channel = input.channel ?? (await resolveDefaultChannel(workspaceId));
        if (!channel) {
          return textContent({ error: "channel is required (or set default channel in Slack connector config)" });
        }
        const result = await postMessage({ workspaceId, channel, text: input.text });
        return textContent({ channel, result });
      } catch (err) {
        return connectorError("slack", err);
      }
    },
  );
}
