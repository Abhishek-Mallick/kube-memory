import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

interface SlackApiResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
  messages?: T;
  channels?: T;
}

async function slackApi<T>(
  workspaceId: string,
  method: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }

  const url = `https://slack.com/api/${method}${search.size ? `?${search}` : ""}`;
  const data = await connectorJson<SlackApiResponse<unknown>>(workspaceId, "slack", url);
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return data as T;
}

export async function listChannels(options: {
  workspaceId: string;
  types?: string;
  limit?: number;
}): Promise<unknown[]> {
  const data = await slackApi<{ channels: unknown[] }>(options.workspaceId, "conversations.list", {
    types: options.types ?? "public_channel,private_channel",
    limit: options.limit ?? 100,
  });
  return (data as { channels: unknown[] }).channels ?? [];
}

export async function getChannelHistory(options: {
  workspaceId: string;
  channel: string;
  limit?: number;
  oldest?: string;
}): Promise<unknown[]> {
  const data = await slackApi<{ messages: unknown[] }>(options.workspaceId, "conversations.history", {
    channel: options.channel,
    limit: options.limit ?? 50,
    oldest: options.oldest,
  });
  return (data as { messages: unknown[] }).messages ?? [];
}

export async function postMessage(options: {
  workspaceId: string;
  channel: string;
  text: string;
}): Promise<unknown> {
  const { secret } = await requireConnector(options.workspaceId, "slack");
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: options.channel, text: options.text }),
  });
  const data = (await res.json()) as SlackApiResponse<unknown>;
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return data;
}

export async function isSlackAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "slack");
    return true;
  } catch {
    return false;
  }
}

export async function resolveDefaultChannel(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "slack");
  const channel = String(config.channel ?? "").trim();
  return channel || undefined;
}
