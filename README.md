# kube-memory

**Organizational memory for DevOps agents.**

[kube-memory.buildlab.in](https://kube-memory.buildlab.in/) gives AI coding assistants and CI pipelines a persistent, queryable record of your infrastructure history — incidents, fixes, deployments, and outcomes — so the next failure starts with context instead of a blank slate.

Every episode follows a simple loop: detect a symptom, diagnose the cause, apply a treatment, and remember the outcome. Over time, your cluster builds institutional memory that survives session resets, engineer handoffs, and repeat outages.

---

## Deployed URLs

| Surface | URL | Purpose |
|---------|-----|---------|
| **Dashboard (client)** | [https://kube-memory.buildlab.in/](https://kube-memory.buildlab.in/) | Sign up, connect integrations, manage API keys, IDE setup |
| **API server** | [https://kube.buildlab.in/](https://kube.buildlab.in/) | MCP (`POST /mcp`), REST (`/ingest`, `/memory/query`, `/status`), health |

**MCP endpoint for IDE config:** `https://kube.buildlab.in/mcp`

```json
{
  "mcpServers": {
    "kube-memory": {
      "url": "https://kube.buildlab.in/mcp",
      "headers": {
        "Authorization": "Bearer km_xxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Issue the `km_*` key from the [dashboard](https://kube-memory.buildlab.in/) → **API Keys**.

---

## What kube-memory offers

### Semantic memory for agents

Store and retrieve DevOps episodes through semantic search powered by [Cognee](https://www.cognee.ai/). Before acting on an alert or deploy, agents ask *"have we seen this before, and what fixed it?"* After resolving an incident, the outcome is written back for the next time.

| Tool | What it does |
|------|----------------|
| `memory_remember` | Persist incidents, fixes, deploy outcomes, and runbooks into workspace memory |
| `memory_recall` | Semantic search over past episodes — OOM kills, failed rollouts, config drift |
| `memory_forget` | Remove stale or sensitive entries (admin) |
| `predict_risk` | Score a planned deploy against similar past failures before you ship |

### MCP-native — one endpoint, every integration

Connect Cursor, VS Code, Claude Desktop, or any MCP-compatible client to `https://kube.buildlab.in/mcp`. One `km_*` API key unlocks the MCP tool surface across memory, platform status, and live infrastructure readouts — scoped per workspace, gated by connector configuration in the dashboard.

### Workspace dashboard

Manage everything at [kube-memory.buildlab.in](https://kube-memory.buildlab.in/):

1. **Sign up** — email/password or GitHub OAuth
2. **Integrations** — connect Kubernetes, GitHub, Slack, PagerDuty, Prometheus, ArgoCD, or Google Cloud (test → save → enable)
3. **API Keys** — issue `km_*` keys for IDE and automation (requires ≥1 integration)
4. **IDE setup** — copy the MCP snippet from the API Keys page

Each workspace is isolated: its own Cognee memory dataset, encrypted connector credentials, and role-scoped API keys (`reader`, `admin`).

### REST API for automation

The same memory graph agents use in the IDE is available at `https://kube.buildlab.in` for pipelines and cron jobs — ingest structured episodes, run semantic queries, and check workspace status. Full reference: [server/API_DOC.md](./server/API_DOC.md).

---

## How to get started

1. Open the dashboard → [https://kube-memory.buildlab.in/](https://kube-memory.buildlab.in/)
2. Complete the setup journey: **Integrations → API Keys → IDE**
3. Add kube-memory to your MCP config — endpoint `https://kube.buildlab.in/mcp`, key from the dashboard
4. Ask your agent to recall past incidents, pull pod logs, check ArgoCD sync status, or score deploy risk

Detailed walkthrough: [usage.md](./usage.md)

---

## MCP tool catalog

Tools are invoked via `POST https://kube.buildlab.in/mcp` with your workspace API key. Availability depends on which integrations you have enabled.

### Memory

| Tool | Access | Description |
|------|--------|-------------|
| `kube_memory_status` | reader+ | List enabled integrations and workspace hints |
| `memory_remember` | admin | Store incident, deployment, or fix |
| `memory_recall` | reader+ | Semantic search over past episodes |
| `memory_forget` | admin | Remove stale or sensitive memory |
| `predict_risk` | reader+ | Score deploy risk from recall similarity |

### Kubernetes

| Tool | Access | Description |
|------|--------|-------------|
| `k8s_pod_logs` | reader+ | Read pod logs from connected cluster |
| `k8s_get_events` | reader+ | List cluster or namespace events |

### GitHub

| Tool | Access | Description |
|------|--------|-------------|
| `github_get_authenticated_user` | reader+ | PAT user identity |
| `github_list_repositories` | reader+ | List repositories |
| `github_list_recent_commits` | reader+ | Recent commits across account activity |
| `github_list_issues` | reader+ | List issues for a repository |
| `github_list_pull_requests` | reader+ | List pull requests |
| `github_list_commits` | reader+ | List commits on a branch or path |
| `github_get_pull_request` | reader+ | Fetch a single pull request |

### Slack

| Tool | Access | Description |
|------|--------|-------------|
| `slack_get_history` | reader+ | Fetch recent channel messages |
| `slack_get_channel_info` | reader+ | Get channel metadata |
| `slack_get_replies` | reader+ | Fetch replies for a thread |
| `slack_list_channels` | reader+ | List channels the bot can access |
| `slack_list_users` | reader+ | List Slack users visible to the bot |
| `slack_post_message` | admin | Post a message to a channel |

### PagerDuty

| Tool | Access | Description |
|------|--------|-------------|
| `pagerduty_list_incidents` | reader+ | List incidents by status/service/time |
| `pagerduty_get_incident` | reader+ | Fetch incident details |
| `pagerduty_list_services` | reader+ | List services |
| `pagerduty_get_incident_log_entries` | reader+ | Fetch incident timeline log entries |
| `pagerduty_list_incident_notes` | reader+ | List notes on an incident |
| `pagerduty_list_oncalls` | reader+ | List who is currently on call |
| `pagerduty_list_users` | reader+ | List PagerDuty users |

### Prometheus

| Tool | Access | Description |
|------|--------|-------------|
| `prometheus_query` | reader+ | PromQL instant query |
| `prometheus_query_range` | reader+ | PromQL range query over a time window |
| `prometheus_list_alerts` | reader+ | List firing alerts |
| `prometheus_list_targets` | reader+ | List scrape targets and health |
| `prometheus_list_rules` | reader+ | List alerting and recording rules |
| `prometheus_list_alertmanagers` | reader+ | List active Alertmanager endpoints |
| `prometheus_list_labels` | reader+ | List metric label names |
| `prometheus_list_label_values` | reader+ | List values for a metric label |

### ArgoCD

| Tool | Access | Description |
|------|--------|-------------|
| `argocd_list_applications` | reader+ | List GitOps applications |
| `argocd_get_application` | reader+ | Application sync/health status |
| `argocd_get_app_history` | reader+ | Deployment revision history |
| `argocd_list_app_events` | reader+ | Sync and deploy event timeline |
| `argocd_get_app_resource_tree` | reader+ | Live resource tree for an app |
| `argocd_list_projects` | reader+ | List ArgoCD projects |
| `argocd_list_repositories` | reader+ | List connected Git repositories |
| `argocd_sync_application` | admin | Trigger a sync |
| `argocd_rollback_application` | admin | Roll back to a previous revision |

### Google Cloud

| Tool | Access | Description |
|------|--------|-------------|
| `gcp_list_instances` | reader+ | List Compute Engine VM instances |
| `gcp_get_instance` | reader+ | Get details for a single Compute Engine VM instance |
| `gcp_list_storage_buckets` | reader+ | List Cloud Storage buckets |
| `gcp_get_storage_bucket` | reader+ | Get metadata for a single Cloud Storage bucket |
| `gcp_list_bucket_objects` | reader+ | List objects stored in a Cloud Storage bucket |
| `gcp_query_logs` | reader+ | Query Cloud Logging entries |
| `gcp_list_metric_descriptors` | reader+ | List Cloud Monitoring metric descriptors |
| `gcp_query_metrics` | reader+ | Query Cloud Monitoring metrics |

---

## Architecture

```mermaid
flowchart TB
  subgraph Surfaces["Operator & agent surfaces"]
    direction LR
    IDE["IDE agents\nCursor · VS Code · Claude Desktop"]
    CI["CI / cron / scripts"]
    WEB["Web dashboard\nkube-memory.buildlab.in"]
  end

  subgraph Gateway["kube-memory server\nkube.buildlab.in"]
    direction TB
    AUTH["Auth layer\nJWT sessions · GitHub OAuth · km_* API keys"]
    MCP["MCP gateway\nPOST /mcp · JSON-RPC 2.0\ntools/list · tools/call"]
    REST["REST workspace API\n/ingest · /memory/query · /status"]
    CONN["Connector vault\nAES-encrypted per-workspace secrets\ntest · enable · disable"]
    CRON["Scheduled jobs\nCognee improve() on datasets"]
  end

  subgraph Tools["MCP tool plane"]
    direction TB

    subgraph MemTools["Semantic memory"]
      direction LR
      T_MR["memory_remember"]
      T_MRC["memory_recall"]
      T_MF["memory_forget"]
      T_PR["predict_risk"]
    end

    subgraph InfraTools["Live infrastructure readouts"]
      direction TB

      subgraph K8s["Kubernetes connector"]
        direction LR
        T_KPL["k8s_pod_logs"]
        T_KGE["k8s_get_events"]
      end

      subgraph GH["GitHub connector"]
        direction LR
        T_GHI["github_list_issues"]
        T_GHPR["github_list_prs"]
        T_GHC["github_list_commits"]
        T_GHGP["github_get_pr"]
      end

      subgraph Slack["Slack connector"]
        direction LR
        T_SH["slack_get_history"]
        T_SCI["slack_get_channel_info"]
        T_SGR["slack_get_replies"]
        T_SLC["slack_list_channels"]
        T_SLU["slack_list_users"]
        T_SPM["slack_post_message"]
      end

      subgraph PD["PagerDuty connector"]
        direction LR
        T_PDL["pagerduty_list_incidents"]
        T_PDG["pagerduty_get_incident"]
        T_PDS["pagerduty_list_services"]
        T_PDLE["pagerduty_get_incident_log_entries"]
        T_PDN["pagerduty_list_incident_notes"]
        T_PDO["pagerduty_list_oncalls"]
        T_PDU["pagerduty_list_users"]
      end

      subgraph Prom["Prometheus connector"]
        direction LR
        T_PQ["prometheus_query"]
        T_PQR["prometheus_query_range"]
        T_PA["prometheus_list_alerts"]
        T_PT["prometheus_list_targets"]
        T_PR["prometheus_list_rules"]
        T_PAM["prometheus_list_alertmanagers"]
        T_PL["prometheus_list_labels"]
        T_PLV["prometheus_list_label_values"]
      end

      subgraph Argo["ArgoCD connector"]
        direction LR
        T_AL["argocd_list_apps"]
        T_AG["argocd_get_app"]
        T_AH["argocd_get_history"]
        T_AE["argocd_list_app_events"]
        T_ART["argocd_get_app_resource_tree"]
        T_AP["argocd_list_projects"]
        T_ARP["argocd_list_repositories"]
        T_AS["argocd_sync"]
        T_AR["argocd_rollback"]
      end
    end
  end

  subgraph Data["Data & external systems"]
    direction LR
    COGNEE[("Cognee Cloud\nsemantic memory graph\nper-workspace dataset")]
    MONGO[("MongoDB\nusers · workspaces\nAPI keys · connectors")]
    K8S_EXT["Kubernetes API"]
    GH_EXT["GitHub API"]
    SL_EXT["Slack API"]
    PD_EXT["PagerDuty API"]
    PR_EXT["Prometheus"]
    AR_EXT["ArgoCD"]
  end

  subgraph Loop["Episode loop"]
    direction LR
    L1["1 · Detect\nalert · failed deploy · OOM"]
    L2["2 · Diagnose\nrecall · logs · metrics · events"]
    L3["3 · Treat\nsync · rollback · patch · post"]
    L4["4 · Remember\nremember outcome for next time"]
    L1 --> L2 --> L3 --> L4
    L4 -.->|"feeds recall"| L2
  end

  IDE -->|"Bearer km_*"| MCP
  CI -->|"Bearer km_*"| REST
  CI -->|"Bearer km_*"| MCP
  WEB -->|"JWT"| AUTH

  AUTH --> MCP
  AUTH --> REST
  AUTH --> CONN

  MCP --> MemTools
  MCP --> InfraTools
  REST --> MemTools

  CONN --> K8s
  CONN --> GH
  CONN --> Slack
  CONN --> PD
  CONN --> Prom
  CONN --> Argo

  MemTools --> COGNEE
  T_MR --> COGNEE
  T_MRC --> COGNEE
  T_MF --> COGNEE
  T_PR --> COGNEE

  K8s --> K8S_EXT
  GH --> GH_EXT
  Slack --> SL_EXT
  PD --> PD_EXT
  Prom --> PR_EXT
  Argo --> AR_EXT

  AUTH --> MONGO
  CONN --> MONGO
  CRON --> COGNEE

  Loop -.->|"agent workflow"| IDE
```

### Credentials & surfaces

| Surface | URL | Credential | Used by |
|---------|-----|------------|---------|
| Dashboard | [kube-memory.buildlab.in](https://kube-memory.buildlab.in/) | JWT (session) | Browser after login |
| MCP | [kube.buildlab.in/mcp](https://kube.buildlab.in/mcp) | `km_*` API key | Cursor, VS Code, Claude Desktop |
| REST | [kube.buildlab.in](https://kube.buildlab.in/) | `km_*` API key | CI pipelines, scripts, automation |

API keys are role-scoped: **reader** tools are read-only; **admin** can write memory, post to Slack, sync/rollback ArgoCD, and forget entries.

---

## Documentation

| Document | Description |
|----------|-------------|
| [usage.md](./usage.md) | Setup journey, integrations, and MCP usage |
| [docs/setup.md](./docs/setup.md) | Local development setup |
| [server/API_DOC.md](./server/API_DOC.md) | Complete REST and MCP API reference |
| [server/.env.example](./server/.env.example) | Server configuration |
| [PLAN.md](./PLAN.md) | Product vision and roadmap |

---

## License

See repository license file.
