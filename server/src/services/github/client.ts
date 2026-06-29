import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

interface GitHubUser {
  login: string;
  name?: string;
  type?: string;
}

interface GitHubPushEvent {
  type?: string;
  repo?: { name?: string };
  actor?: { login?: string };
  payload?: { commits?: Array<Record<string, unknown>> };
}

export async function getAuthenticatedUser(workspaceId: string): Promise<GitHubUser> {
  return connectorJson<GitHubUser>(workspaceId, "github", "https://api.github.com/user");
}

export async function resolveDefaultOwner(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "github");
  const org = String(config.org ?? "").trim();
  return org || undefined;
}

export async function resolveOwner(
  workspaceId: string,
  owner?: string,
): Promise<string> {
  if (owner?.trim()) return owner.trim();
  const configured = await resolveDefaultOwner(workspaceId);
  if (configured) return configured;
  const user = await getAuthenticatedUser(workspaceId);
  return user.login;
}

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

export async function listRepositories(options: {
  workspaceId: string;
  owner?: string;
  type?: "all" | "owner" | "public" | "private" | "member";
  perPage?: number;
}): Promise<unknown[]> {
  const perPage = String(options.perPage ?? 30);
  const owner = options.owner?.trim();

  if (!owner) {
    const params = new URLSearchParams({
      per_page: perPage,
      sort: "updated",
      type: options.type ?? "owner",
    });
    return connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/user/repos?${params}`,
    );
  }

  const user = await getAuthenticatedUser(options.workspaceId);
  if (owner === user.login) {
    const params = new URLSearchParams({
      per_page: perPage,
      sort: "updated",
      type: options.type ?? "owner",
    });
    return connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/user/repos?${params}`,
    );
  }

  const params = new URLSearchParams({
    per_page: perPage,
    sort: "updated",
    type: options.type ?? "all",
  });

  try {
    return await connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos?${params}`,
    );
  } catch {
    return connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/users/${encodeURIComponent(owner)}/repos?${params}`,
    );
  }
}

export async function listRecentCommits(options: {
  workspaceId: string;
  owner?: string;
  repo?: string;
  perPage?: number;
}): Promise<unknown[]> {
  const limit = options.perPage ?? 30;

  if (options.repo) {
    const owner = await resolveOwner(options.workspaceId, options.owner);
    return listCommits({
      workspaceId: options.workspaceId,
      owner,
      repo: options.repo,
      perPage: limit,
    });
  }

  const events = await connectorJson<GitHubPushEvent[]>(
    options.workspaceId,
    "github",
    `https://api.github.com/user/events?per_page=100`,
  );

  const commits: Array<Record<string, unknown>> = [];
  const ownerFilter = options.owner?.trim().toLowerCase();

  for (const event of events) {
    if (event.type !== "PushEvent") continue;

    const repoFullName = event.repo?.name ?? "";
    if (ownerFilter && !repoFullName.toLowerCase().startsWith(`${ownerFilter}/`)) {
      continue;
    }

    for (const commit of event.payload?.commits ?? []) {
      commits.push({
        ...commit,
        repository: repoFullName,
        pushedBy: event.actor?.login,
      });
      if (commits.length >= limit) return commits;
    }
  }

  return commits;
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
