import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import { READ_ONLY_ANNOTATIONS, integrationToolDescription } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";
import {
  githubGetPullRequestInputSchema,
  githubListCommitsInputSchema,
  githubListIssuesInputSchema,
  githubListPullRequestsInputSchema,
  githubListRecentCommitsInputSchema,
  githubListRepositoriesInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getAuthenticatedUser,
  getPullRequest,
  isGitHubAvailable,
  listCommits,
  listIssues,
  listPullRequests,
  listRecentCommits,
  listRepositories,
  resolveOwner,
} from "../../services/github/client.js";

export function registerGitHubTools(server: McpServer): void {
  server.registerTool(
    "github_get_authenticated_user",
    {
      title: "GitHub Authenticated User",
      description: integrationToolDescription(
        "GitHub",
        "Get the GitHub user for the workspace PAT",
        "Use this to discover the default owner/login before listing repos or commits.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const user = await getAuthenticatedUser(workspaceId);
        return textContent({ user });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_repositories",
    {
      title: "GitHub List Repositories",
      description: integrationToolDescription(
        "GitHub",
        "List repositories for the authenticated user or configured org scope",
        "Omit owner to list repos for the PAT user. Set owner to org/user from dashboard org scope.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        type: z.enum(["all", "owner", "public", "private", "member"]).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListRepositoriesInputSchema.parse(args);
        const repositories = await listRepositories({ ...input, workspaceId });
        return textContent({ repositories });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_recent_commits",
    {
      title: "GitHub List Recent Commits",
      description: integrationToolDescription(
        "GitHub",
        "List recent commits across the authenticated user's GitHub activity",
        "PREFERRED for 'latest commits from my account'. Uses the dashboard PAT — never local git. Optionally filter by owner or single repo.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string().optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListRecentCommitsInputSchema.parse(args);
        const commits = await listRecentCommits({ ...input, workspaceId });
        return textContent({ commits, count: commits.length });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_issues",
    {
      title: "GitHub List Issues",
      description: integrationToolDescription("GitHub", "List issues for a repository"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        state: z.enum(["open", "closed", "all"]).optional(),
        labels: z.string().optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListIssuesInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const issues = await listIssues({ ...input, owner, workspaceId });
        return textContent({ issues, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_pull_requests",
    {
      title: "GitHub List Pull Requests",
      description: integrationToolDescription("GitHub", "List pull requests for a repository"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        state: z.enum(["open", "closed", "all"]).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListPullRequestsInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const pullRequests = await listPullRequests({ ...input, owner, workspaceId });
        return textContent({ pullRequests, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_commits",
    {
      title: "GitHub List Commits",
      description: integrationToolDescription(
        "GitHub",
        "List commits for a single repository branch or path",
        "For account-wide recent commits use github_list_recent_commits instead.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        sha: z.string().optional(),
        path: z.string().optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListCommitsInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const commits = await listCommits({ ...input, owner, workspaceId });
        return textContent({ commits, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_get_pull_request",
    {
      title: "GitHub Get Pull Request",
      description: integrationToolDescription("GitHub", "Fetch details for a single pull request"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        pullNumber: z.number().int().min(1),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubGetPullRequestInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const pullRequest = await getPullRequest({ ...input, owner, workspaceId });
        return textContent({ pullRequest, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );
}
