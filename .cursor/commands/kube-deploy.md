# kube-deploy — Deploy, monitor, and respond via kube-memory MCP

You are running the **kube-deploy** workflow: analyze a Kubernetes manifest, deploy through kube-memory MCP, watch pod health, then either complete a success path or execute the full failure/incident path.

## Hard rules

1. Use **kube-memory MCP tools only** for all cluster, GitHub, Slack, PagerDuty, Prometheus, ArgoCD, and memory operations.
2. **Never** run local `kubectl`, `git`, or `curl` to external APIs.
3. Call `kube_memory_status` first. If a required connector is missing, stop and tell the user to connect it at [kube-memory dashboard](https://kube-memory.buildlab.in/).
4. Write tools (`k8s_apply_manifest`, `k8s_delete_pod`, `incident_open`, `slack_post_message`) require an **admin** API key.
5. Read the manifest file from the user's message (`@path/to/manifest.yaml`) before calling `k8s_apply_manifest`.

## Inputs (extract from user message)

| Input | Required | Default |
|-------|----------|---------|
| Manifest path | Yes | — |
| `namespace` | No | From manifest `metadata.namespace` |
| `serviceName` | No | Pod/deployment name or `app` label |
| `podName` | No | Pod `metadata.name` |
| `githubOwner` / `githubRepo` | No | For commit/PR correlation on failure |
| `argocdApplication` | No | For GitOps rollback on failure |
| `slackChannel` | No | Workspace default |
| `pagerDutyServiceId` | No | Connector default |

Anything after `/kube-deploy` in the user message is additional context — use it.

---

## Phase A — Pre-deploy

1. **`kube_memory_status`** — confirm `kubernetes` is enabled (and note Slack, PagerDuty, GitHub, Prometheus, ArgoCD availability).
2. **Read the manifest** locally — summarize: kinds, names, namespace, image, CPU/memory limits, restart policy.
3. **`predict_risk`** with `serviceName` — if score is high or similar past failures exist, warn the user before applying.

---

## Phase B — Deploy and watch

1. **`k8s_apply_manifest`** — pass the full YAML as `manifest`; set `namespace` if overriding; use `dryRun: true` only if the user asked for a dry run.
2. **Poll health** — every ~15 seconds for up to 5 minutes:
   - **`k8s_get_pod`** for the target pod (phase, `terminalFailure`, `healthy`, OOMKilled)
   - **`k8s_get_events`** for the namespace
3. **Stop polling when:**
   - **Success:** `healthy === true` (Running with ready containers, or Succeeded)
   - **Failure:** `terminalFailure === true` (OOMKilled, CrashLoopBackOff, Failed, Evicted)

---

## Phase C — Success path

1. **`slack_post_message`** — deployment success summary (service, namespace, applied resources).
2. **`memory_remember`** — episode with entity `Deployment`, outcome resolved, namespace, image/limits if known.
3. **`k8s_delete_pod`** — if replacing a prior standalone pod revision and the user indicated cleanup, delete the n-1 pod when safe.

---

## Phase D — Failure path (OOM, crash, etc.)

### D1 — Diagnose

- **`k8s_pod_logs`** — tail 100+ lines
- **`k8s_get_events`** — namespace events
- **`prometheus_list_alerts`** — firing alerts
- **`prometheus_query`** — memory/cpu pressure if useful
- **`memory_recall`** — query: `OOMKilled / similar failure for {serviceName} in {namespace}`

### D2 — Mitigate

- If **`argocdApplication`** is set: **`argocd_get_app_history`** → **`argocd_rollback_application`** to last healthy revision.
- Else: apply last-known-good manifest via **`k8s_apply_manifest`** (from recall, fixed file in repo, or user-provided).

### D3 — Incident and notify

1. **`pagerduty_list_oncalls`** — identify on-call engineer.
2. **`incident_open`** with:
   - `serviceName`, `namespace`, `podName`
   - `githubOwner`, `githubRepo`, `argocdApplication` when available
   - `notifySlack: true`, `slackChannel` if provided
   - `triggerPagerDuty: true`, `pagerDutyServiceId` if provided
   - `rememberInMemory: true`
3. **`slack_list_users`** — resolve Slack user ID for on-call.
4. **`slack_post_message`** — alert with incident ID; tag on-call as `<@SLACK_USER_ID>`.

### D4 — Root cause and fix

1. **`github_list_commits`** and **`github_list_pull_requests`** — find suspect change.
2. Propose and implement fix in the repo (edit manifest or source).
3. Re-deploy fix: **`k8s_apply_manifest`** with corrected YAML.
4. **`incident_update`** — add `note` with fix summary and PR link when available.

**Known MCP gaps (workarounds):**

- No `github_create_pull_request` — user may create PR manually or via `gh` locally if they explicitly approve.
- No `pagerduty_add_incident_note` — use `incident_update` note + Slack thread for PR link.
- No traffic replay tool — use **`prometheus_query`** on error rates as a proxy; note manual replay if needed.

### D5 — Resolve

- Poll **`k8s_get_pod`** until healthy.
- **`memory_remember`** — resolution outcome.
- **`incident_update`** — `status: "resolved"` with summary.

---

## Output format

End with a concise summary:

| Phase | Result |
|-------|--------|
| Pre-deploy | Connectors, risk score |
| Apply | Resources created/updated |
| Pod status | Phase, OOM/crash flags |
| Incident | ID, Slack/PD links (if failure) |
| Next steps | Any manual actions needed |

Reference: [docs/demo-full-loop.md](docs/demo-full-loop.md), [docs/test-k8.md](docs/test-k8.md).
