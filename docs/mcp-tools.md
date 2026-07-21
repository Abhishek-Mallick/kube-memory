# kube-memory MCP tools reference

All DevOps actions flow through the **MCP server** at `POST /mcp` (Streamable HTTP, JSON-RPC 2.0). Authenticate with a workspace **`km_*` API key** from the [dashboard](https://kube-memory.buildlab.in/).

**Live catalog in the UI:** open the dashboard → **Documentation** (`/docs`) → **MCP tools** tab.

---

## Quick start

1. Connect at least one integration (start with **Kubernetes**) → **Enable** it.
2. Create an **admin** `km_*` API key (required for deploy and incident write tools).
3. Add MCP config to Cursor, VS Code, or Claude Desktop:

```json
{
  "mcpServers": {
    "kube-memory": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer km_your_api_key_here"
      }
    }
  }
}
```

Production endpoint: `https://kube.buildlab.in/mcp`

4. Call **`kube_memory_status`** first to see which connectors are active.

---

## API key roles

| Role | Read tools | Write tools |
|------|------------|-------------|
| **reader** | `k8s_get_*`, `memory_recall`, `predict_risk`, `kube_memory_status`, connector read tools | — |
| **admin** | All reader tools | `kube_deploy`, `k8s_apply_manifest`, `incident_open`, `slack_post_message`, `github_create_pull_request`, `memory_remember`, etc. |

Write/orchestrator tools require an **admin** key.

---

## Workflows

### One-shot deploy + incident (`kube_deploy`)

The **`kube_deploy`** orchestrator runs the full loop in a **single MCP call**:

| Phase | What happens |
|-------|----------------|
| `pre_deploy` | Scan manifest; optional Cognee risk score |
| `apply` | `k8s_apply_manifest` |
| `watch` | Poll pod health up to `watchDurationSec` (default 90s, max 600s) |
| `failure` | OOM / crash detected → incident pipeline |
| `diagnose` | Pod logs, events, impacted apps |
| `mitigate` | Route Service to stable; delete canary pods |
| `incident` | `incident_open` (Slack, optional PagerDuty) |
| `fix_pr` | Automated GitHub PR from `stableManifest` |
| `replay` | `replay_impacted_traffic` on stable services |
| `resolve` | Incident marked resolved |

**Parameters (key fields):**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `manifest` | Yes | Full deployment YAML |
| `stableManifest` | Recommended | Fixed YAML for automated PR on failure |
| `namespace` | No | Defaults from manifest |
| `serviceName` | No | Defaults from labels / deployment name |
| `watchDurationSec` | No | 30–600 (default 90) |
| `pollIntervalSec` | No | 5–60 (default 10) |
| `triggerPagerDuty` | No | `true` for full demo |
| `githubOwner` / `githubRepo` | No | For fix PR (or `PAYMENT_SERVICE_GITHUB_*` env) |
| `slackChannel` | No | Defaults to connector default |
| `dryRun` | No | Scan + risk only; no apply |

**Cursor slash command:** type `/kube-deploy` in Agent chat (see [Cursor commands](#cursor-slash-commands-vs-mcp-tools)).

**Demo:**

```
/kube-deploy @demos/payment-service/k8s/payment-service-canary.yaml stableManifest=@demos/payment-service/k8s/payment-service-canary-fixed.yaml triggerPagerDuty=true watchDurationSec=90
```

Setup: [`demos/payment-service/scripts/demo-setup.sh`](../demos/payment-service/scripts/demo-setup.sh)  
Details: [demo-kube-deploy.md](./demo-kube-deploy.md)

**Local server recommended** for long watches — hosted Vercel may timeout on 90s+ orchestration. Use `http://localhost:3000/mcp` when running `cd server && npm run dev`.

---

### Open incident only (`incident_open`)

Use when failure is already known (no deploy/watch):

1. Enrich from Kubernetes, GitHub, Prometheus, ArgoCD
2. Classify root cause (heuristics)
3. Persist incident in MongoDB
4. Optional Slack + PagerDuty
5. Optional `memory_remember`

Follow with `incident_get`, `incident_list`, `incident_update`.

See [demo-full-loop.md](./demo-full-loop.md).

---

### Manual detect → diagnose → remember

| Step | Tool |
|------|------|
| Check connectors | `kube_memory_status` |
| Pod failing? | `k8s_get_pod`, `k8s_pod_logs`, `k8s_get_events` |
| Seen before? | `memory_recall` |
| Firing alerts? | `prometheus_list_alerts`, `prometheus_query` |
| Save outcome | `memory_remember` |

---

## Cognee (memory) resilience

Memory tools use [Cognee Cloud](https://www.cognee.ai/) when `COGNEE_API_KEY` is set on the server.

| Scenario | Behavior |
|----------|----------|
| Cognee unreachable during **`kube_deploy`** | Risk scoring **skipped**; deploy and incident pipeline **continue** |
| Cognee unreachable during **`incident_open`** | Memory enrichment skipped; incident still opens |
| Cognee unreachable during **`memory_remember`** | Episode saved locally with `indexingStatus: failed` (no throw) |
| **`memory_recall`** standalone | Returns error if Cognee is down (read-only tool) |

Deploy and incident workflows do **not** abort when Cognee fails.

---

## Tool catalog

### Platform

| Tool | Role | Description |
|------|------|-------------|
| `kube_memory_status` | reader+ | Enabled integrations, workspace info, MCP hints |

### Memory

| Tool | Role | Description |
|------|------|-------------|
| `memory_remember` | admin | Store incident, deployment, or fix |
| `memory_recall` | reader+ | Semantic search over past episodes |
| `memory_forget` | admin | Remove stale or sensitive memory |
| `predict_risk` | reader+ | Score deploy risk from recall similarity |

### Deploy & incidents

| Tool | Role | Description |
|------|------|-------------|
| `kube_deploy` | admin | Full deploy → monitor → incident orchestrator |
| `replay_impacted_traffic` | admin | Replay HTTP health/order on stable services |
| `incident_open` | admin | Open incident with enrichment + Slack/PD |
| `incident_get` | reader+ | Fetch incident by ID |
| `incident_list` | reader+ | List workspace incidents |
| `incident_update` | admin | Update status; optional Slack notify |

### Kubernetes

| Tool | Role | Description |
|------|------|-------------|
| `k8s_pod_logs` | reader+ | Pod logs (tail 1–500) |
| `k8s_get_events` | reader+ | Namespace/cluster events |
| `k8s_get_pod` | reader+ | Pod phase, OOMKilled detection |
| `k8s_apply_manifest` | admin | Apply YAML (Deployment, Service, Job, …) |
| `k8s_delete_pod` | admin | Delete a pod |

### GitHub, Slack, PagerDuty, Prometheus, ArgoCD, GCP, AWS, Azure, Linear, Notion, Jira, Datadog, Splunk

Full per-tool parameters: dashboard **Documentation → MCP tools**, or [server/API_DOC.md](../server/API_DOC.md) / server root HTML index.

### Jira & Jira Service Management

| Tool | Role | Description |
|------|------|-------------|
| `jira_search_issues` | reader+ | Bounded JQL search across Jira Software and JSM work |
| `jira_get_issue` | reader+ | Fetch an issue, comments, and linked context |
| `jira_list_service_requests` | reader+ | List requests in the configured service desk |

### Datadog

| Tool | Role | Description |
|------|------|-------------|
| `datadog_get_service_context` | reader+ | Service definition/ownership and associated monitors |
| `datadog_list_monitors` | reader+ | Monitor query with bounded results |
| `datadog_search_evidence` | reader+ | Read-only bounded logs or trace search |

### Splunk

| Tool | Role | Description |
|------|------|-------------|
| `splunk_search_logs` | reader+ | Run bounded SPL searches (50 records / 5 seconds maximum) |
| `splunk_list_saved_searches` | reader+ | List available saved searches and alert definitions |
| `splunk_list_fired_alerts` | reader+ | List recent fired alerts for incident correlation |

### AWS

| Tool | Role | Description |
|------|------|-------------|
| `aws_get_service_context` | reader+ | Read resources matching a service tag |
| `aws_list_alarms` | reader+ | List bounded CloudWatch alarms |
| `aws_search_logs` | reader+ | Run a bounded CloudWatch Logs Insights query |

### Azure

| Tool | Role | Description |
|------|------|-------------|
| `azure_get_service_context` | reader+ | Read resources tagged with a service name |
| `azure_list_alerts` | reader+ | List bounded metric and scheduled query alert rules |
| `azure_search_logs` | reader+ | Run a bounded KQL query against Log Analytics |

---

## Cursor slash commands vs MCP tools

| | Cursor command (`.cursor/commands/`) | MCP tool (server) |
|---|--------------------------------------|-------------------|
| **What it is** | Agent prompt/instructions in your repo | JSON-RPC tool on kube-memory server |
| **Shipped by MCP?** | No | Yes — via `tools/list` |
| **Example** | `/kube-deploy` | `kube_deploy` |
| **Keep in repo?** | Optional but recommended for demos | Always on server |

The **`/kube-deploy`** command tells the Cursor agent *how* to call `kube_deploy` (read manifests, relay phases, print `actionSummary`). Without it, you can still ask: *“Call kube_deploy with this manifest…”* — the MCP tool is the same.

Other project commands can live in `.cursor/commands/` the same way; they are **not** auto-synced from the MCP server.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `kube_deploy` returns `fetch failed` immediately | Was Cognee blocking pre-deploy — fixed: Cognee failures are skipped. Restart local server after pull. |
| MCP timeout on long watch | Use local server (`localhost:3000/mcp`); reduce `watchDurationSec` for quick demos |
| Connector missing | `kube_memory_status` → enable integration in dashboard |
| MCP 401 | Regenerate `km_*` key; update IDE config |
| No fix PR | Admin key + GitHub PAT with repo write + `PAYMENT_SERVICE_GITHUB_*` env |
| `k8s_*` fails but status shows kubernetes enabled | MCP server must reach cluster (kind → use local server, not prod Vercel) |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [demo-kube-deploy.md](./demo-kube-deploy.md) | Payment-service OOM demo script |
| [demo-full-loop.md](./demo-full-loop.md) | Manual step-by-step MCP flow |
| [test-k8.md](./test-k8.md) | Kubernetes integration test |
| [setup.md](./setup.md) | Local dev setup |
| [client `/docs`](https://kube-memory.buildlab.in/docs) | Interactive tool browser |
