import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  githubGetPullRequestInputSchema,
  githubListCommitsInputSchema,
  githubListIssuesInputSchema,
  githubListPullRequestsInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getPullRequest,
  isGitHubAvailable,
  listCommits,
  listIssues,
  listPullRequests,
} from "../../services/github/client.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}

export function registerGitHubTools(server: McpServer): void {
  server.registerTool(
    "github_list_issues",
    {
      title: "GitHub List Issues",
      description: "List issues for a repository (read-only). Requires GitHub connector.",
      inputSchema: {
        owner: z.string(),
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
        return textContent({ error: "GitHub connector not configured. Connect GitHub in the dashboard." });
      }
      try {
        const input = githubListIssuesInputSchema.parse(args);
        const issues = await listIssues({ ...input, workspaceId });
        return textContent({ issues });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_pull_requests",
    {
      title: "GitHub List Pull Requests",
      description: "List pull requests for a repository (read-only). Requires GitHub connector.",
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
        state: z.enum(["open", "closed", "all"]).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured. Connect GitHub in the dashboard." });
      }
      try {
        const input = githubListPullRequestsInputSchema.parse(args);
        const pullRequests = await listPullRequests({ ...input, workspaceId });
        return textContent({ pullRequests });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_commits",
    {
      title: "GitHub List Commits",
      description: "List commits for a repository branch or path (read-only). Requires GitHub connector.",
      inputSchema: {
        owner: z.string(),
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
        return textContent({ error: "GitHub connector not configured. Connect GitHub in the dashboard." });
      }
      try {
        const input = githubListCommitsInputSchema.parse(args);
        const commits = await listCommits({ ...input, workspaceId });
        return textContent({ commits });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_get_pull_request",
    {
      title: "GitHub Get Pull Request",
      description: "Fetch details for a single pull request (read-only). Requires GitHub connector.",
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.number().int().min(1),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured. Connect GitHub in the dashboard." });
      }
      try {
        const input = githubGetPullRequestInputSchema.parse(args);
        const pullRequest = await getPullRequest({ ...input, workspaceId });
        return textContent({ pullRequest });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );
}
