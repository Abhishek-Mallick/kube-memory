import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

export async function listIssues(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  perPage?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({
    state: options.state ?? "open",
    per_page: String(options.perPage ?? 30),
  });
  if (options.labels) params.set("labels", options.labels);

  const data = await connectorJson<unknown[]>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/issues?${params}`,
  );
  return data;
}

export async function listPullRequests(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  perPage?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({
    state: options.state ?? "open",
    per_page: String(options.perPage ?? 30),
  });

  return connectorJson(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/pulls?${params}`,
  );
}

export async function listCommits(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  sha?: string;
  path?: string;
  perPage?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ per_page: String(options.perPage ?? 30) });
  if (options.sha) params.set("sha", options.sha);
  if (options.path) params.set("path", options.path);

  return connectorJson(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/commits?${params}`,
  );
}

export async function getPullRequest(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<unknown> {
  return connectorJson(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/pulls/${options.pullNumber}`,
  );
}

export async function isGitHubAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "github");
    return true;
  } catch {
    return false;
  }
}

export async function resolveDefaultOwner(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "github");
  const org = String(config.org ?? "").trim();
  return org || undefined;
}
