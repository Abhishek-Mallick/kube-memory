import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { ConnectorIcon } from "@/components/dashboard/ConnectorIcon";
import { getMcpEndpointUrl } from "@/lib/api";
import "@/styles/landing.css";

type ToolGroup = {
  id: string;
  label: string;
  connector?: "kubernetes" | "github" | "slack" | "pagerduty" | "prometheus" | "argocd";
  tools: Array<{ name: string; description: string; params: string; role?: string }>;
};

const toolGroups: ToolGroup[] = [
  {
    id: "memory",
    label: "Memory",
    tools: [
      {
        name: "memory_remember",
        description: "Store a deployment, incident, or fix as structured memory.",
        params: "episode (object), text (string), datasetName (optional)",
        role: "admin",
      },
      {
        name: "memory_recall",
        description: "Query past incidents and fixes by semantic similarity.",
        params: "query (required), topK, datasetName, sessionId",
      },
      {
        name: "memory_forget",
        description: "Remove stale or sensitive memory.",
        params: "datasetName, everything",
        role: "admin",
      },
      {
        name: "predict_risk",
        description: "Score planned deployment risk from historical failures.",
        params: "serviceName (required), query, datasetName",
      },
    ],
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    connector: "kubernetes",
    tools: [
      {
        name: "k8s_pod_logs",
        description: "Fetch read-only logs for a pod in a namespace.",
        params: "name (required), namespace, container, tail (1–500)",
      },
      {
        name: "k8s_get_events",
        description: "List cluster or namespace events for debugging.",
        params: "namespace, fieldSelector",
      },
    ],
  },
  {
    id: "github",
    label: "GitHub",
    connector: "github",
    tools: [
      {
        name: "github_list_issues",
        description: "List issues for a repository.",
        params: "owner (required), repo (required), state, labels, perPage",
      },
      {
        name: "github_list_pull_requests",
        description: "List pull requests for a repository.",
        params: "owner (required), repo (required), state, perPage",
      },
      {
        name: "github_list_commits",
        description: "List commits on a branch or path.",
        params: "owner (required), repo (required), sha, path, perPage",
      },
      {
        name: "github_get_pull_request",
        description: "Fetch details for a single pull request.",
        params: "owner (required), repo (required), pullNumber (required)",
      },
    ],
  },
  {
    id: "slack",
    label: "Slack",
    connector: "slack",
    tools: [
      {
        name: "slack_get_history",
        description: "Fetch recent messages from a Slack channel.",
        params: "channel (or default from connector), limit, oldest",
      },
      {
        name: "slack_list_channels",
        description: "List channels the bot token can access.",
        params: "limit",
      },
      {
        name: "slack_post_message",
        description: "Post a message to a Slack channel.",
        params: "channel (or default), text (required)",
        role: "admin",
      },
    ],
  },
  {
    id: "pagerduty",
    label: "PagerDuty",
    connector: "pagerduty",
    tools: [
      {
        name: "pagerduty_list_incidents",
        description: "List incidents by status, service, or time range.",
        params: "statuses[], serviceIds[], since, until, sortBy, limit",
      },
      {
        name: "pagerduty_get_incident",
        description: "Fetch a single incident by ID.",
        params: "incidentId (required)",
      },
      {
        name: "pagerduty_list_services",
        description: "List services in the PagerDuty account.",
        params: "limit",
      },
      {
        name: "pagerduty_get_incident_log_entries",
        description: "Fetch timeline log entries for an incident.",
        params: "incidentId (required), limit",
      },
      {
        name: "pagerduty_list_incident_notes",
        description: "List notes on a PagerDuty incident.",
        params: "incidentId (required), limit",
      },
      {
        name: "pagerduty_list_oncalls",
        description: "List who is currently on call.",
        params: "scheduleIds[], userIds[], limit",
      },
      {
        name: "pagerduty_list_users",
        description: "List users in the PagerDuty account.",
        params: "limit",
      },
    ],
  },
  {
    id: "prometheus",
    label: "Prometheus",
    connector: "prometheus",
    tools: [
      {
        name: "prometheus_query",
        description: "Run a PromQL instant query.",
        params: "query (required), time",
      },
      {
        name: "prometheus_query_range",
        description: "Run a PromQL range query over a time window.",
        params: "query (required), start (required), end (required), step",
      },
      {
        name: "prometheus_list_alerts",
        description: "List currently firing alerts.",
        params: "(none)",
      },
      {
        name: "prometheus_list_targets",
        description: "List scrape targets and health.",
        params: "(none)",
      },
      {
        name: "prometheus_list_rules",
        description: "List alerting and recording rules.",
        params: "type (alert|record), ruleName[], ruleGroup[]",
      },
      {
        name: "prometheus_list_alertmanagers",
        description: "List active Alertmanager endpoints.",
        params: "(none)",
      },
      {
        name: "prometheus_list_labels",
        description: "List metric label names for discovery.",
        params: "match[], start, end",
      },
      {
        name: "prometheus_list_label_values",
        description: "List values for a given label (e.g. namespace, pod).",
        params: "labelName (required), match[], start, end",
      },
    ],
  },
  {
    id: "argocd",
    label: "ArgoCD",
    connector: "argocd",
    tools: [
      {
        name: "argocd_list_applications",
        description: "List GitOps applications.",
        params: "(none)",
      },
      {
        name: "argocd_get_application",
        description: "Get sync and health status for an app.",
        params: "name (required)",
      },
      {
        name: "argocd_get_app_history",
        description: "List deployment history for rollback planning.",
        params: "name (required)",
      },
      {
        name: "argocd_list_app_events",
        description: "List sync and deploy events for an application.",
        params: "name (required)",
      },
      {
        name: "argocd_get_app_resource_tree",
        description: "Fetch the live resource tree for an application.",
        params: "name (required)",
      },
      {
        name: "argocd_list_projects",
        description: "List Argo CD projects.",
        params: "(none)",
      },
      {
        name: "argocd_list_repositories",
        description: "List Git repositories connected to Argo CD.",
        params: "(none)",
      },
      {
        name: "argocd_sync_application",
        description: "Trigger a sync for an application.",
        params: "name (required), revision, prune",
        role: "admin",
      },
      {
        name: "argocd_rollback_application",
        description: "Rollback to a prior deployment revision.",
        params: "name (required), id (required)",
        role: "admin",
      },
    ],
  },
];

const allTools = toolGroups.flatMap((g) => g.tools);

const connectorSetup = [
  {
    type: "kubernetes" as const,
    title: "Kubernetes",
    credential: "Kubeconfig YAML",
    tools: "k8s_pod_logs, k8s_get_events",
    priority: "Required — core of kube-memory",
    webhook: false,
    steps: [
      "Create a demo cluster (kind, minikube, or a small cloud cluster).",
      "Deploy a sample workload in a demo namespace — e.g. a pod that OOMs for incident demos.",
      "Create a read-only ServiceAccount (pods, pods/log, events: get/list/watch) or use a sandbox kubeconfig.",
      "Dashboard → Integrations → Kubernetes → paste kubeconfig YAML.",
      "Test connection → Save → Enable.",
    ],
    dashboardFields: "Kubeconfig YAML (textarea)",
    demoPrompt: "Get events and pod logs in namespace demo — have we seen this OOM before?",
  },
  {
    type: "github" as const,
    title: "GitHub",
    credential: "Personal access token + optional org scope",
    tools: "github_list_issues, github_list_pull_requests, github_list_commits, github_get_pull_request",
    priority: "Recommended — links deploys to source",
    webhook: false,
    steps: [
      "GitHub → Settings → Developer settings → Personal access tokens.",
      "Create a fine-grained or classic token with repo read access (public_repo for public repos only).",
      "Optional: set org/user scope in dashboard (e.g. my-org) to default repository queries.",
      "Dashboard → Integrations → GitHub → paste token → Test → Save → Enable.",
      "Seed memory episodes that reference PR numbers/commits for richer recall demos.",
    ],
    dashboardFields: "Personal access token (secret), Org or user scope (optional)",
    demoPrompt: "List open PRs on my demo repo — any fix similar to this OOM incident?",
  },
  {
    type: "prometheus" as const,
    title: "Prometheus",
    credential: "Base URL + optional bearer token",
    tools: "prometheus_query, prometheus_query_range, prometheus_list_alerts, prometheus_list_targets, prometheus_list_rules, prometheus_list_alertmanagers, prometheus_list_labels, prometheus_list_label_values",
    priority: "Recommended — metrics and firing alerts",
    webhook: false,
    steps: [
      "Install Prometheus in your demo cluster (e.g. kube-prometheus-stack Helm chart in a monitoring namespace).",
      "Base URL is the Prometheus server root only — include scheme and port (e.g. http://localhost:9090). Do not append /api/v1 or a trailing slash; kube-memory adds API paths.",
      "kube-prometheus-stack: run kubectl get svc -n monitoring | grep prometheus — common service is prometheus-kube-prometheus-prometheus on port 9090.",
      "Local dev: kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 → Base URL http://localhost:9090.",
      "In-cluster (kube-memory server in same cluster): http://prometheus-kube-prometheus-prometheus.monitoring.svc:9090.",
      "Standalone/Docker: default http://localhost:9090. Ingress: use the hostname where the Prometheus UI loads (e.g. https://prometheus.example.com).",
      "Managed (Grafana Cloud, AWS AMP): copy the query endpoint root from the provider console; strip query paths so only the server base remains.",
      "Bearer token: leave empty for typical in-cluster or port-forward setups with no auth. Required when Prometheus is behind OAuth2 proxy, API gateway, or nginx expecting Authorization: Bearer ….",
      "Dashboard → Integrations → Prometheus → paste Base URL (+ bearer token if needed) → Test → Save → Enable.",
      "Test connection calls /-/healthy then /api/v1/status/config. If it fails, verify the URL is reachable from the kube-memory server (not just your laptop), check the bearer token, and confirm no /api/v1 suffix in the Base URL field.",
      "Configure Alertmanager rules in Prometheus for alert demos — kube-memory reads firing alerts via API (no webhook to register).",
    ],
    dashboardFields: "Base URL (required), Bearer token (optional)",
    demoPrompt: "List firing alerts and query container_memory_working_set_bytes for namespace demo.",
  },
  {
    type: "argocd" as const,
    title: "ArgoCD",
    credential: "Base URL + API token",
    tools: "argocd_list_applications, argocd_get_application, argocd_get_app_history, argocd_list_app_events, argocd_get_app_resource_tree, argocd_list_projects, argocd_list_repositories, argocd_sync_application, argocd_rollback_application",
    priority: "Recommended — GitOps deploy cycle",
    webhook: false,
    steps: [
      "Install Argo CD in your demo cluster (official Helm chart or argocd CLI) and create a demo Application (synced or deliberately OutOfSync).",
      "Base URL is the Argo CD server root only — include scheme and port (https:// is typical). Do not append /api/v1 or a trailing slash; kube-memory adds API paths.",
      "Find the server: kubectl get svc -n argocd argocd-server.",
      "Local dev: kubectl port-forward svc/argocd-server -n argocd 8080:443 → Base URL https://localhost:8080.",
      "In-cluster (kube-memory server in same cluster): https://argocd-server.argocd.svc (or your cluster DNS equivalent).",
      "Ingress: use the hostname where the Argo CD UI loads (e.g. https://argocd.example.com).",
      "TLS note: Argo CD often uses self-signed certs — the URL must be reachable and trusted from the kube-memory server, not just your laptop.",
      "Get initial admin password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d",
      "Generate API token — CLI: argocd login <base-url> --username admin --password <password>, then argocd account generate-token --account admin.",
      "Generate API token — UI: Avatar → User Info → Generate New (copy token once).",
      "Dashboard → Integrations → ArgoCD → paste Base URL + API token → Test → Save → Enable.",
      "Test connection calls /healthz then GET /api/v1/applications with Bearer token. If it fails, verify URL reachability from the server, token validity, HTTPS vs HTTP, and no /api/v1 suffix in Base URL.",
    ],
    dashboardFields: "Base URL (required), API token (secret, required)",
    demoPrompt: "Which apps are OutOfSync? Show deploy history before rollback.",
  },
  {
    type: "slack" as const,
    title: "Slack",
    credential: "Bot token + optional default channel",
    tools: "slack_get_history, slack_list_channels, slack_post_message",
    priority: "Optional — incident channel context",
    webhook: false,
    steps: [
      "Create a Slack app at api.slack.com → add Bot token scopes: channels:history, channels:read, chat:write.",
      "Install app to workspace and copy Bot User OAuth Token (xoxb-…).",
      "Optional: set default channel (e.g. #incidents) in dashboard.",
      "Dashboard → Integrations → Slack → paste token → Test → Save → Enable.",
      "No incoming webhook needed — kube-memory posts via Slack Bot API.",
    ],
    dashboardFields: "Bot token (secret), Default channel (optional)",
    demoPrompt: "Read recent #incidents messages and post a memory snippet after resolution.",
  },
  {
    type: "pagerduty" as const,
    title: "PagerDuty",
    credential: "REST API key",
    tools: "pagerduty_list_incidents, pagerduty_get_incident, pagerduty_list_services, pagerduty_get_incident_log_entries, pagerduty_list_incident_notes, pagerduty_list_oncalls, pagerduty_list_users",
    priority: "Optional — on-call incident enrichment",
    webhook: false,
    steps: [
      "PagerDuty → Integrations → API Access Keys → create read-only key for demo.",
      "Dashboard → Integrations → PagerDuty → paste API key → Test → Save → Enable.",
      "Use with memory_recall to enrich synthetic or live incidents during demos.",
    ],
    dashboardFields: "API key (secret)",
    demoPrompt: "List triggered incidents and cross-reference with past memory episodes.",
  },
];

const futureConnectors = [
  { name: "Grafana", why: "Dashboard links and alert annotations alongside Prometheus metrics" },
  { name: "Loki / Elasticsearch", why: "Cluster-wide log search beyond single-pod tail" },
  { name: "Helm", why: "Chart revision diffing for deploy forensics" },
  { name: "Jira / Linear", why: "Link incidents to tickets and sprint context" },
  { name: "Sentry", why: "App errors tied to deploy episodes" },
  { name: "Datadog / New Relic", why: "APM traces for post-deploy regressions" },
  { name: "Cloud APIs (AWS/GCP/Azure)", why: "Node pool and managed service state during infra incidents" },
  { name: "Webhook ingest", why: "Push Alertmanager/PagerDuty events → auto memory_remember" },
];

const setupSteps = [
  {
    step: "1",
    title: "Create a workspace",
    body: "Sign up with email or GitHub at kube-memory dashboard.",
  },
  {
    step: "2",
    title: "Connect integrations",
    body: "Start with Kubernetes, then add Prometheus, ArgoCD, and GitHub for full demo coverage.",
  },
  {
    step: "3",
    title: "Create an API key",
    body: "Keys unlock after at least one integration is saved. Copy the raw key once.",
  },
  {
    step: "4",
    title: "Configure your IDE",
    body: "Paste the MCP JSON into Cursor, VS Code, or Claude Desktop with your km_* key.",
  },
];

function mcpSnippet() {
  return JSON.stringify(
    {
      mcpServers: {
        "kube-memory": {
          url: getMcpEndpointUrl(),
          headers: { Authorization: "Bearer km_your_api_key_here" },
        },
      },
    },
    null,
    2,
  );
}

const DOC_TABS = ["setup", "connectors", "tools", "ide", "api"] as const;
type DocTab = (typeof DOC_TABS)[number];

const CONNECTOR_TYPES = connectorSetup.map((c) => c.type);

function parseDocTab(value: string | null): DocTab {
  if (value && DOC_TABS.includes(value as DocTab)) {
    return value as DocTab;
  }
  return "setup";
}

function parseConnector(value: string | null): string | undefined {
  if (value && CONNECTOR_TYPES.includes(value as (typeof CONNECTOR_TYPES)[number])) {
    return value;
  }
  return undefined;
}

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseDocTab(searchParams.get("tab"));
  const activeConnector = parseConnector(searchParams.get("connector"));
  const [activeGroup, setActiveGroup] = useState(toolGroups[0].id);
  const [activeTool, setActiveTool] = useState(allTools[0].name);
  const group = toolGroups.find((g) => g.id === activeGroup) ?? toolGroups[0];
  const selected = group.tools.find((t) => t.name === activeTool) ?? group.tools[0];
  const snippet = mcpSnippet();

  function selectGroup(id: string) {
    setActiveGroup(id);
    const next = toolGroups.find((g) => g.id === id);
    if (next?.tools[0]) setActiveTool(next.tools[0].name);
  }

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "setup") {
      next.delete("tab");
      next.delete("connector");
    } else {
      next.set("tab", value);
      if (value !== "connectors") {
        next.delete("connector");
      }
    }
    setSearchParams(next, { replace: true });
  }

  function handleConnectorAccordionChange(value: string) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "connectors");
    if (value) {
      next.set("connector", value);
    } else {
      next.delete("connector");
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-heading text-sm font-medium tracking-tight hover:opacity-80">
            kube-memory
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="landing-section">
        <div className="mx-auto max-w-4xl space-y-4">
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">Documentation</h1>
          <p className="text-lg text-muted-foreground">
            All DevOps actions flow through the MCP server — connect integrations in the dashboard, then call tools from your IDE.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mx-auto mt-12 max-w-4xl">
          <TabsList className="mb-8 h-9 w-fit flex-wrap">
            <TabsTrigger value="setup">Getting started</TabsTrigger>
            <TabsTrigger value="connectors">Integrations</TabsTrigger>
            <TabsTrigger value="tools">MCP tools</TabsTrigger>
            <TabsTrigger value="ide">IDE setup</TabsTrigger>
            <TabsTrigger value="api">REST API</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {setupSteps.map((item) => (
                <div key={item.step} className="landing-journey-step">
                  <p className="font-display text-sm text-[var(--color-accent-signal)]">
                    Step {item.step}
                  </p>
                  <h3 className="mt-2 font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-heading font-medium">Prerequisites</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  Dashboard at{" "}
                  <a href="https://kube-memory.buildlab.in" className="text-foreground underline underline-offset-2">
                    kube-memory.buildlab.in
                  </a>
                </li>
                <li>
                  <code className="font-mono text-xs">COGNEE_API_KEY</code> on the server for memory tools
                </li>
                <li>At least one integration connected and enabled before MCP tools work</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="connectors" className="space-y-6">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-heading font-medium">Product focus</h3>
              <p className="text-sm text-muted-foreground">
                kube-memory is institutional memory for the <strong className="font-medium text-foreground">Kubernetes pod lifecycle and deploy cycle</strong> — detect → diagnose → treat → remember. Connect Kubernetes first, then add metrics (Prometheus), GitOps (ArgoCD), and source (GitHub) to demo the full MCP loop.
              </p>
              <p className="text-sm text-muted-foreground">
                All connectors are <strong className="font-medium text-foreground">pull-based</strong> — kube-memory queries APIs on demand. No webhooks to register in Prometheus, GitHub, or other services.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-heading font-medium">Recommended setup order</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                <li>Set <code className="font-mono text-xs">COGNEE_API_KEY</code> on the server → memory tools work</li>
                <li>Kubernetes → pod logs and events</li>
                <li>Seed 2–3 incident episodes via MCP or <code className="font-mono text-xs">POST /ingest</code></li>
                <li>Prometheus → metrics and firing alerts</li>
                <li>ArgoCD → sync status, history, rollback</li>
                <li>GitHub → PR/commit context linked to episodes</li>
                <li>Slack / PagerDuty (optional) → channel and on-call enrichment</li>
              </ol>
            </div>

            <p className="text-sm text-muted-foreground">
              Configure under <strong className="font-medium text-foreground">Dashboard → Integrations</strong>. Workflow: fill credentials → Test connection → Save → Enable.
            </p>

            <Accordion
              type="single"
              collapsible
              className="space-y-2"
              value={activeTab === "connectors" ? activeConnector : undefined}
              onValueChange={handleConnectorAccordionChange}
            >
              {connectorSetup.map((c) => (
                <AccordionItem key={c.type} value={c.type} className="rounded-xl border bg-card px-5">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                        <ConnectorIcon type={c.type} className="size-5" />
                      </div>
                      <div>
                        <p className="font-heading font-medium">{c.title}</p>
                        <p className="text-xs font-normal text-muted-foreground">{c.priority}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dashboard fields</p>
                        <p className="mt-1 text-sm text-muted-foreground">{c.dashboardFields}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MCP tools</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{c.tools}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Setup steps</p>
                      <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
                        {c.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {!c.webhook && (
                      <p className="text-xs text-muted-foreground">
                        No webhook required — kube-memory pulls data via API when your agent calls MCP tools.
                      </p>
                    )}

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-foreground">Demo prompt</p>
                      <p className="mt-1 text-sm italic text-muted-foreground">&ldquo;{c.demoPrompt}&rdquo;</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-heading font-medium">MCP demo loop (10 min)</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Phase</th>
                      <th className="pb-2 pr-4 font-medium">Agent asks</th>
                      <th className="pb-2 font-medium">Tools</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Detect</td>
                      <td className="py-2 pr-4">Pod crashing in demo namespace</td>
                      <td className="py-2 font-mono text-xs">k8s_get_events, k8s_pod_logs</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Diagnose</td>
                      <td className="py-2 pr-4">Have we seen this before?</td>
                      <td className="py-2 font-mono text-xs">memory_recall</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Correlate</td>
                      <td className="py-2 pr-4">Memory metrics and firing alerts</td>
                      <td className="py-2 font-mono text-xs">prometheus_query, prometheus_list_alerts</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Deploy</td>
                      <td className="py-2 pr-4">Sync status and deploy history</td>
                      <td className="py-2 font-mono text-xs">argocd_get_application</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Risk</td>
                      <td className="py-2 pr-4">Safe to ship this change?</td>
                      <td className="py-2 font-mono text-xs">predict_risk</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Remember</td>
                      <td className="py-2 pr-4">Save fix for next time</td>
                      <td className="py-2 font-mono text-xs">memory_remember</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-heading font-medium">Future integrations</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {futureConnectors.map((item) => (
                  <li key={item.name}>
                    <span className="font-medium text-foreground">{item.name}</span> — {item.why}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                {toolGroups.map((g) => (
                  <div key={g.id}>
                    <button
                      type="button"
                      onClick={() => selectGroup(g.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                        activeGroup === g.id
                          ? "bg-[var(--color-accent-signal-muted)] text-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {g.connector ? <ConnectorIcon type={g.connector} className="size-4" /> : null}
                      {g.label}
                    </button>
                    {activeGroup === g.id && (
                      <div className="mt-1 flex flex-col gap-0.5 pl-2">
                        {g.tools.map((tool) => (
                          <button
                            key={tool.name}
                            type="button"
                            onClick={() => setActiveTool(tool.name)}
                            className={`rounded-md px-2 py-1.5 text-left font-mono text-[10px] transition-colors ${
                              activeTool === tool.name
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/60"
                            }`}
                          >
                            {tool.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-mono text-sm font-medium">{selected.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
                {selected.role && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Role required: <span className="font-medium text-foreground">{selected.role}</span>
                  </p>
                )}
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Parameters
                </p>
                <code className="code-block mt-2 block">{selected.params}</code>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ide" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="cursor">
              <AccordionItem value="cursor">
                <AccordionTrigger>Cursor</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Open Settings → MCP → Add server. Paste the config below and restart Cursor.</p>
                  <CopyButton value={snippet} label="Copy config" toastMessage="Config copied" />
                  <pre className="code-block overflow-x-auto whitespace-pre">{snippet}</pre>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="vscode">
                <AccordionTrigger>VS Code</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Add to .vscode/mcp.json or your user-level MCP configuration file.</p>
                  <pre className="code-block overflow-x-auto whitespace-pre">{snippet}</pre>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="claude">
                <AccordionTrigger>Claude Desktop</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Edit claude_desktop_config.json (macOS: ~/Library/Application Support/Claude/).
                    Restart the app after saving.
                  </p>
                  <pre className="code-block overflow-x-auto whitespace-pre">{snippet}</pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <p className="text-xs text-muted-foreground">
              Endpoint: <code className="font-mono">{getMcpEndpointUrl()}</code>
            </p>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                REST endpoints use the same km_* API key as MCP. Connector credentials are managed via JWT-authenticated dashboard routes. Full reference: server/API_DOC.md in the repo.
              </p>
              <Accordion type="single" collapsible>
                <AccordionItem value="connectors">
                  <AccordionTrigger>GET /connectors</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      List integration status for the workspace (JWT required).
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="memory">
                  <AccordionTrigger>POST /memory/query</AccordionTrigger>
                  <AccordionContent>
                    <code className="code-block block">{`{ "query": "OOM errors", "topK": 10 }`}</code>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="ingest">
                  <AccordionTrigger>POST /ingest</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Ingest structured DevOps episodes from CI or automation pipelines.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="status">
                  <AccordionTrigger>GET /status</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Health and workspace metadata for monitoring integrations.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="landing-footer">kube-memory documentation</footer>
    </div>
  );
}
