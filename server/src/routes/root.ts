import { Router } from "express";

export interface ApiEntry {
  method: string;
  path: string;
  auth: string;
  description: string;
}

export interface ApiSection {
  title: string;
  description: string;
  endpoints: ApiEntry[];
}

export interface McpToolEntry {
  name: string;
  role: string;
  description: string;
}

export const API_SECTIONS: ApiSection[] = [
  {
    title: "Health",
    description: "Probes and readiness checks. No authentication.",
    endpoints: [
      { method: "GET", path: "/health", auth: "None", description: "Liveness probe" },
      { method: "GET", path: "/ready", auth: "None", description: "Readiness probe (Mongo + Cognee)" },
    ],
  },
  {
    title: "Workspace API",
    description: "Automation and agent pipelines. Requires workspace API key (km_*).",
    endpoints: [
      { method: "GET", path: "/status", auth: "API key", description: "Workspace summary and integration flags" },
      { method: "POST", path: "/ingest", auth: "API key (admin)", description: "Ingest structured DevOps episode into memory" },
      { method: "POST", path: "/memory/query", auth: "API key", description: "Semantic recall over workspace memory" },
    ],
  },
  {
    title: "Authentication",
    description: "Dashboard session management. Returns JWT on register/login.",
    endpoints: [
      { method: "POST", path: "/auth/register", auth: "None", description: "Create user, workspace, and JWT" },
      { method: "POST", path: "/auth/login", auth: "None", description: "Email/password login" },
      { method: "GET", path: "/auth/me", auth: "JWT", description: "Current user and workspace" },
      { method: "POST", path: "/auth/logout", auth: "None", description: "Logout acknowledgement" },
      { method: "GET", path: "/auth/github", auth: "None", description: "Redirect to GitHub OAuth" },
      { method: "GET", path: "/auth/github/callback", auth: "None", description: "OAuth callback (server-side)" },
    ],
  },
  {
    title: "Connectors",
    description: "Integration credentials for the workspace. JWT required; write ops need workspace owner.",
    endpoints: [
      { method: "GET", path: "/connectors", auth: "JWT", description: "List all connector types and status" },
      { method: "PUT", path: "/connectors/:type", auth: "JWT (owner)", description: "Create or update connector config + secret" },
      { method: "DELETE", path: "/connectors/:type", auth: "JWT (owner)", description: "Remove connector" },
      { method: "POST", path: "/connectors/:type/test", auth: "JWT (owner)", description: "Test connector connectivity" },
    ],
  },
  {
    title: "API Keys",
    description: "Issue and revoke km_* keys for MCP and REST. JWT required; write ops need workspace owner.",
    endpoints: [
      { method: "GET", path: "/api-keys", auth: "JWT", description: "List key metadata (no raw keys)" },
      { method: "POST", path: "/api-keys", auth: "JWT (owner)", description: "Create key (raw key returned once)" },
      { method: "DELETE", path: "/api-keys/:id", auth: "JWT (owner)", description: "Revoke key" },
    ],
  },
  {
    title: "MCP",
    description: "Model Context Protocol over Streamable HTTP. Requires workspace API key.",
    endpoints: [
      { method: "POST", path: "/mcp", auth: "API key", description: "JSON-RPC 2.0 — tools/list, tools/call" },
    ],
  },
  {
    title: "Cron",
    description: "Scheduled maintenance jobs.",
    endpoints: [
      {
        method: "GET",
        path: "/api/cron/improve",
        auth: "CRON_SECRET (optional)",
        description: "Run Cognee improve() on a dataset",
      },
    ],
  },
];

export const MCP_TOOLS: McpToolEntry[] = [
  { name: "memory_remember", role: "admin", description: "Store incident, deployment, or fix in memory" },
  { name: "memory_recall", role: "reader+", description: "Semantic search over past episodes" },
  { name: "memory_forget", role: "admin", description: "Remove stale or sensitive memory" },
  { name: "predict_risk", role: "reader+", description: "Score deploy risk from recall similarity" },
  { name: "k8s_pod_logs", role: "reader+", description: "Read pod logs (Kubernetes connector)" },
  { name: "k8s_get_events", role: "reader+", description: "List cluster or namespace events" },
  { name: "github_list_issues", role: "reader+", description: "List GitHub issues for a repository" },
  { name: "github_list_pull_requests", role: "reader+", description: "List GitHub pull requests" },
  { name: "github_list_commits", role: "reader+", description: "List commits on a branch or path" },
  { name: "github_get_pull_request", role: "reader+", description: "Fetch a single pull request" },
  { name: "slack_get_history", role: "reader+", description: "Fetch recent Slack channel messages" },
  { name: "slack_list_channels", role: "reader+", description: "List Slack channels the bot can access" },
  { name: "slack_post_message", role: "admin", description: "Post a message to a Slack channel" },
  { name: "pagerduty_list_incidents", role: "reader+", description: "List PagerDuty incidents" },
  { name: "pagerduty_get_incident", role: "reader+", description: "Fetch a PagerDuty incident" },
  { name: "pagerduty_list_services", role: "reader+", description: "List PagerDuty services" },
  { name: "pagerduty_get_incident_log_entries", role: "reader+", description: "Fetch incident timeline log entries" },
  { name: "pagerduty_list_incident_notes", role: "reader+", description: "List notes on a PagerDuty incident" },
  { name: "pagerduty_list_oncalls", role: "reader+", description: "List who is currently on call" },
  { name: "pagerduty_list_users", role: "reader+", description: "List PagerDuty users" },
  { name: "prometheus_query", role: "reader+", description: "Run a PromQL instant query" },
  { name: "prometheus_query_range", role: "reader+", description: "Run a PromQL range query" },
  { name: "prometheus_list_alerts", role: "reader+", description: "List firing Prometheus alerts" },
  { name: "prometheus_list_targets", role: "reader+", description: "List Prometheus scrape targets" },
  { name: "prometheus_list_rules", role: "reader+", description: "List alerting and recording rules" },
  { name: "prometheus_list_alertmanagers", role: "reader+", description: "List active Alertmanager endpoints" },
  { name: "prometheus_list_labels", role: "reader+", description: "List metric label names" },
  { name: "prometheus_list_label_values", role: "reader+", description: "List values for a metric label" },
  { name: "argocd_list_applications", role: "reader+", description: "List ArgoCD applications" },
  { name: "argocd_get_application", role: "reader+", description: "Get ArgoCD application status" },
  { name: "argocd_get_app_history", role: "reader+", description: "List deployment history for an app" },
  { name: "argocd_list_app_events", role: "reader+", description: "List sync and deploy events for an app" },
  { name: "argocd_get_app_resource_tree", role: "reader+", description: "Fetch application resource tree" },
  { name: "argocd_list_projects", role: "reader+", description: "List ArgoCD projects" },
  { name: "argocd_list_repositories", role: "reader+", description: "List connected Git repositories" },
  { name: "argocd_sync_application", role: "admin", description: "Trigger an ArgoCD sync" },
  { name: "argocd_rollback_application", role: "admin", description: "Rollback an ArgoCD application" },
];

export const CONNECTOR_TYPES = [
  "kubernetes",
  "github",
  "slack",
  "pagerduty",
  "prometheus",
  "argocd",
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(): string {
  const sections = API_SECTIONS.map(
    (section) => `
    <section class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <p class="muted">${escapeHtml(section.description)}</p>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${section.endpoints
            .map(
              (ep) => `
          <tr>
            <td><code class="method">${escapeHtml(ep.method)}</code></td>
            <td><code>${escapeHtml(ep.path)}</code></td>
            <td>${escapeHtml(ep.auth)}</td>
            <td>${escapeHtml(ep.description)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`,
  ).join("");

  const mcpRows = MCP_TOOLS.map(
    (tool) => `
          <tr>
            <td><code>${escapeHtml(tool.name)}</code></td>
            <td>${escapeHtml(tool.role)}</td>
            <td>${escapeHtml(tool.description)}</td>
          </tr>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>kube-memory API</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #fafafa;
      --fg: #171717;
      --muted: #737373;
      --border: #e5e5e5;
      --code-bg: #f4f4f5;
      --accent: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --fg: #fafafa;
        --muted: #a3a3a3;
        --border: #262626;
        --code-bg: #171717;
        --accent: #60a5fa;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
    }
    .wrap { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    header { margin-bottom: 2.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; font-weight: 600; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
    .lead { color: var(--muted); margin: 0 0 1rem; max-width: 42rem; }
    .links { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.875rem; }
    .links a { color: var(--accent); text-decoration: none; }
    .links a:hover { text-decoration: underline; }
    .section { margin-bottom: 2.5rem; }
    h2 { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.25rem; }
    .muted { color: var(--muted); font-size: 0.875rem; margin: 0 0 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { font-weight: 500; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem; background: var(--code-bg); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
    .method { font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .chip { font-size: 0.75rem; padding: 0.25rem 0.5rem; border: 1px solid var(--border); border-radius: 999px; color: var(--muted); }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.8125rem; color: var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>kube-memory API</h1>
      <p class="lead">
        REST and MCP endpoints exposed by the kube-memory server.
        Use an API key (<code>km_*</code>) for MCP and automation; use a JWT for dashboard routes.
      </p>
      <div class="links">
        <a href="/health">/health</a>
        <a href="/ready">/ready</a>
        <a href="/?format=json">JSON catalog</a>
      </div>
    </header>

    ${sections}

    <section class="section">
      <h2>MCP tools</h2>
      <p class="muted">Invoked via <code>POST /mcp</code> with <code>tools/call</code>.</p>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Role</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>${mcpRows}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Connector types</h2>
      <p class="muted">Valid values for <code>:type</code> in connector routes.</p>
      <div class="chips">
        ${CONNECTOR_TYPES.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("")}
      </div>
    </section>

    <footer>
      Full request/response reference: <code>server/API_DOC.md</code> in the repository.
      JSON catalog: <code>GET /?format=json</code> or <code>Accept: application/json</code>.
    </footer>
  </div>
</body>
</html>`;
}

export const rootRouter = Router();

rootRouter.get("/", (req, res) => {
  const wantsJson =
    req.query.format === "json" ||
    (req.accepts(["json", "html"]) === "json" && req.query.format !== "html");

  if (wantsJson) {
    res.json({
      service: "kube-memory",
      version: "0.0.1",
      documentation: "See server/API_DOC.md in the repository",
      auth: {
        apiKey: "Authorization: Bearer km_*",
        jwt: "Authorization: Bearer <jwt> (dashboard routes)",
        cron: "Authorization: Bearer CRON_SECRET (when configured)",
      },
      sections: API_SECTIONS,
      mcpTools: MCP_TOOLS,
      connectorTypes: CONNECTOR_TYPES,
    });
    return;
  }

  res.type("html").send(renderHtml());
});
