# kube-memory

### A Memory-Native MCP Platform for Autonomous DevOps

*Design Document & Feasibility Analysis · Express.js MCP Server on Cognee Cloud*

Version 1.0 · June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Design Principles](#3-vision--design-principles)
4. [Feasibility Reality Check](#4-feasibility-reality-check)
5. [Personas](#5-personas)
6. [User Journeys](#6-user-journeys)
7. [System Architecture](#7-system-architecture)
8. [MCP Server Responsibilities & Tool Registry](#8-mcp-server-responsibilities--tool-registry)
9. [Required Integrations / Connector Matrix](#9-required-integrations--connector-matrix)
10. [Knowledge Graph Data Schema](#10-knowledge-graph-data-schema)
11. [Failure Taxonomy](#11-failure-taxonomy)
12. [Memory Lifecycle (Cognee)](#12-memory-lifecycle-cognee)
13. [Diagnosis & Remediation Pipeline](#13-diagnosis--remediation-pipeline)
14. [Similarity & Risk Scoring](#14-similarity--risk-scoring)
15. [kube-memory Cloud — Managed Platform](#15-kube-memory-cloud--managed-platform)
16. [Security & Privacy](#16-security--privacy)
17. [Scalability & Performance](#17-scalability--performance)
18. [Testing Strategy](#18-testing-strategy)
19. [Tech Stack](#19-tech-stack)
20. [MVP Roadmap & Phasing](#20-mvp-roadmap--phasing)
21. [Success Metrics](#21-success-metrics)
22. [Risks, Open Questions & Recommendation](#22-risks-open-questions--recommendation)

---

## 1. Executive Summary

Modern DevOps teams operate without institutional memory. Every incident, every fix, and every near-miss is captured somewhere — a Slack thread, a postmortem doc, a closed GitHub issue — but none of it is connected, queryable, or available to the AI agents and engineers who need it at the moment of the next failure.

kube-memory is a memory-native Model Context Protocol (MCP) server, built on Express.js, that gives DevOps tooling and AI coding assistants (Claude, Cursor, VS Code, Windsurf) a persistent, queryable memory of an organization's infrastructure history. It integrates with Kubernetes, Prometheus, Grafana, ArgoCD, GitHub, Slack, and PagerDuty, and stores everything as a knowledge graph in Cognee Cloud.

The core idea is a closed loop: before acting, recall what happened last time; after acting, remember the outcome. Over weeks of operation, this loop turns raw telemetry into an organizational memory that AI agents and humans can both query — "has this failed before, and how was it fixed?"

This document is a refactor and expansion of the original AgentMD proposal, renamed kube-memory, with two material additions:

- **A feasibility analysis** that separates what is realistically buildable with the current Cognee Cloud and MCP ecosystem from what is aspirational and needs validation or a fallback plan.
- **A managed-platform extension** (kube-memory Cloud) that turns the self-hosted MCP server into a hosted, multi-tenant SaaS product with one-click connectors, instead of something every team has to clone and operate.

Bottom line: the memory loop (remember → recall) is solid and buildable today on top of Cognee's documented API. The harder, less certain parts are automated root-cause diagnosis, self-improving memory at scale, and the breadth of third-party connectors implied by the managed-platform vision — these are real engineering projects in their own right, not configuration tasks, and are scoped accordingly in the roadmap below.

## 2. Problem Statement

CI/CD pipelines, observability tools, and incident trackers all record what happened, but none of them answer the more useful question: "have we seen this before, and what fixed it?" Each tool's data lives in its own silo, and AI coding assistants reset their context after every session — so the same outage gets re-diagnosed from scratch by whoever happens to be on call.

This is expensive in a very specific way: it is not that the information doesn't exist, it's that nothing connects it. The fix that resolved a payment-service OOMKill three weeks ago is sitting in a Slack thread that nobody will think to search the next time the same pod crashes.

> "The organization already has memory. It lives in Slack, email, documents, meetings, issues, pull requests, support tickets… The hard problem is turning that into reliable context."

kube-memory's premise is to treat each deployment or incident like a patient encounter in an Electronic Health Record: symptom, diagnosis, treatment, outcome — stored as structured, linked knowledge rather than scattered logs, so the next encounter starts with context instead of from zero.

## 3. Vision & Design Principles

kube-memory's goal is to give DevOps agents the same continuity a hospital's electronic record gives a doctor seeing a returning patient. Each pipeline run or alert becomes a tracked episode:

| Stage | Description |
| --- | --- |
| Symptom | A deployment failure or anomaly — pod crash, failed test, alert fired. |
| Diagnosis | Automated classification of the failure (e.g. OOMKilled, ConfigError, CrashLoop). |
| Treatment | A recommended or applied fix (rollback, config change, scale-up). |
| Outcome | Recorded result — recovered, recurred, or escalated to a human. |

### 3.1 Design Principles

- **Automated capture:** every pipeline run, alert, and incident is ingested into memory without manual effort.
- **Contextual recall:** before or during an action, the agent queries the memory graph for similar past events.
- **Self-improvement:** memory is periodically re-indexed and enriched so frequently useful links get stronger over time.
- **Human-in-the-loop:** SREs can confirm or correct automated diagnoses, and that feedback improves future accuracy.
- **Actionable output:** kube-memory should hand back a recommendation or a fix, not a wall of raw logs.

This is what distinguishes kube-memory from a chatbot wrapped around log search: the knowledge graph itself — not any single conversation — is the product. It persists across agents, sessions, and engineers.

## 4. Feasibility Reality Check

Before committing to an architecture, it's worth being explicit about which parts of this idea are well-supported by existing tooling today, and which parts require real engineering investment or carry open risk. This section exists because the gap between "the API has a remember() and recall() method" and "this reliably prevents repeat incidents" is large, and a design doc that glosses over it sets the wrong expectations.

### 4.1 What is solid and buildable now

| Capability | Why it's solid |
| --- | --- |
| Memory ingest/query loop (remember/recall) | Cognee's remember(), recall(), forget(), and improve() are real, documented operations in the open-source library and are exposed the same way via Cognee Cloud's hosted REST API. This is the one piece of the pitch that is not aspirational. |
| MCP server scaffolding | The @modelcontextprotocol/sdk TypeScript SDK is mature and well-trodden for building tools/list and tools/call handlers over HTTP, SSE, or stdio transports. Wrapping an existing Express REST layer with MCP is a documented, common pattern. |
| Kubernetes, GitHub, Slack, PagerDuty clients | All have official, well-maintained Node.js SDKs (@kubernetes/client-node, @octokit/rest, @slack/web-api). Building read-only ingestion tools against these is routine integration work. |
| Heuristic failure classification | Regex/keyword matching on known strings ("OOMKilled", "CrashLoopBackOff") is simple, fast, and reliable for the handful of failure categories that show up most often. This should be the MVP's primary classifier, not an LLM. |
| Cognee Cloud multi-tenant datasets | Dataset-level ownership and RBAC are part of Cognee's documented permissions model, which is the right primitive for workspace isolation in a managed platform. |

### 4.2 What needs validation, a fallback plan, or real engineering

| Capability | Risk / what's actually required |
| --- | --- |
| Node.js access to Cognee | Cognee's primary SDK is Python; there is no official first-party Node/TypeScript SDK. The Express server must call Cognee Cloud's REST endpoints directly over HTTP (axios/fetch) rather than importing a native client, which means hand-rolling a thin typed client and tracking the REST API as it evolves rather than relying on a stable SDK contract. |
| Reusing the official cognee-mcp server | Cognee already ships its own MCP server (cognee-mcp) exposing remember/recall/forget as MCP tools directly, with a Cloud Mode pointed at Cognee Cloud. kube-memory should evaluate proxying or composing with this server instead of reimplementing the memory tools from scratch — this could cut real build time, but means taking on a dependency with its own release cadence and auth model, separate from Cognee Cloud's own API/auth. |
| Background indexing latency | remember() can run in the background and return before indexing finishes; recall() against graph memory only sees fully-indexed data. A fix recorded seconds ago during an active incident may not be recallable yet. Any "recall before deploying" workflow needs to either wait on indexing status or accept that very recent memory isn't always queryable in real time. |
| Automated root-cause diagnosis beyond heuristics | Classifying anything beyond a handful of known string patterns (ambiguous stack traces, novel error messages, multi-cause incidents) needs an LLM-based classifier with real evaluation data and a tolerance for wrong answers. This is a project of its own, not a one-line prompt, and should ship after the heuristic MVP, with confidence scores surfaced to humans. |
| improve() / memify quality at scale | The strengthen-links-and-prune-stale-nodes behavior is real but its outcomes depend on data volume and quality; on a small or noisy graph it can have little visible effect. Treat its benefit as something to measure with the success metrics in Section 21, not assume. |
| Auto-remediation (auto-applying fixes) | Patching live Kubernetes resources automatically is the highest-blast-radius feature in this document. It needs its own approval workflow, blast-radius limits, and audit trail before it runs unattended — start suggest-only, gate auto-apply behind explicit opt-in per fix type. |
| Breadth of the managed-platform connector list | The addendum lists 18 connectors (Jira, Linear, Discord, Datadog, Terraform, Helm, AWS, Azure, GCP, etc.). Each is a real integration with its own auth flow, rate limits, and data model — this is a multi-quarter roadmap item, not a feature flag. Section 9 prioritizes a build order. |
| "Cognee Cloud" branding | Cognee's commercial hosted offering is referred to in its own materials as Cogwit; "Cognee Cloud" and "Cogwit" appear used interchangeably in places. Confirm the current product name, plan tiers, and SLAs directly with Cognee before finalizing customer-facing docs or pricing dependent on it. |

### 4.3 Net assessment

The memory primitive (ingest, store as a graph, recall by similarity) is genuinely available off-the-shelf and is not the risky part of this project. The risk is concentrated in two places: (1) how much of the diagnosis and remediation logic is hand-built heuristics versus how much leans on an LLM, and (2) how wide the connector and tenancy surface needs to be before the product is useful to a real team. The roadmap in Section 20 is sequenced to prove the memory loop first, on one connector (Kubernetes), before spending effort on breadth.

## 5. Personas

| Persona | Goal | Primary touchpoint |
| --- | --- | --- |
| SRE | Rapid incident resolution by leveraging past fixes; root-cause recall during postmortems. | Chat (Cursor / VS Code / Claude Desktop): "Show me the failure history for service X." |
| DevOps Engineer | Check deployment risk against past failed deployments before shipping; document fixes as they're applied. | CI/CD pipeline calling kube-memory's MCP tools for a pre-deploy risk check. |
| Platform Engineer | Automate routine operations and avoid repeat mistakes across the fleet; monitor memory coverage and connector health. | kube-memory dashboard / nightly ingestion jobs / connector health page. |

## 6. User Journeys

### 6.1 Pre-Deployment Check

A developer merges code and triggers a deployment to payment-service. Before applying, the pipeline's AI agent calls kube-memory: "Recall any failures for payment-service since last release." kube-memory's memory_recall tool finds a high-similarity match: the same service failed last week due to OOMKilled on an undersized node, and the fix was a memory-limit increase. The pipeline applies that fix preemptively and proceeds.

### 6.2 Incident Triage

notification-service pods enter CrashLoopBackOff. The on-call SRE asks kube-memory, from inside VS Code, what happened to this service last month. kube-memory returns a timeline: a past crash from missing Redis credentials, fixed by rotating a secret, and a second recurrence with the same fix. The SRE verifies and applies the known fix before reading a single log line.

### 6.3 Automated Remediation Warning

A nightly database migration job is about to run. kube-memory recognizes a strong similarity to a past migration that always failed on Wednesdays at 3 AM due to lock contention, and surfaces a warning before the job starts: reschedule or reindex first. The engineer adjusts the plan and avoids a repeat outage.

### 6.4 Continuous Learning

After every run, kube-memory remembers the outcome — success or failure, with root cause and fix if applicable. A scheduled job runs Cognee's improve() nightly to strengthen frequently-useful links and surface implicit patterns (for example, a higher failure rate for deploys after 5 PM). Stale data, like old test-namespace events, is pruned with forget(). Over weeks, this turns into a constantly-updated organizational memory rather than a one-time report.

## 7. System Architecture

kube-memory is an Express.js application that speaks MCP (JSON-RPC 2.0 over HTTP/SSE) to AI clients on one side, and calls out to Cognee Cloud plus a set of DevOps tool APIs on the other. It is intentionally stateless at the request level — all durable state lives in Cognee's knowledge graph, not in the Express process — so the server can run as multiple replicas behind a load balancer.

| Layer | Responsibility |
| --- | --- |
| MCP layer | Implements tools/list and tools/call over @modelcontextprotocol/sdk; this is the surface AI clients (Cursor, Claude Desktop, VS Code) talk to. |
| REST layer | Internal/admin endpoints (/status, /ingest, /memory/query, /metrics) for pipelines, cron jobs, and a future dashboard. |
| Tool implementations | One module per integration (Kubernetes, GitHub, Slack, PagerDuty, Prometheus, ArgoCD) translating MCP tool calls into provider API calls. |
| Memory client | A thin HTTP client wrapping Cognee Cloud's REST API for remember / recall / forget / improve calls (see Section 4.2 — no native Node SDK exists, so this layer owns retries, auth, and schema mapping). |
| Ingestion jobs | Scheduled (CronJob) or webhook-triggered processes that pull from each connected tool and call memory_remember. |
| Cognee Cloud | Hosted vector + graph + relational storage for the knowledge graph itself — outside the Express process entirely. |

Architecture flow: an AI client or CI pipeline calls kube-memory over MCP → kube-memory either queries Cognee Cloud for memory or calls out to Kubernetes/GitHub/Prometheus/Slack/PagerDuty for live data → results are composed into a single MCP tool response. Ingestion runs the same path in reverse: external events flow into kube-memory's REST ingestion endpoint, get classified, and are written to Cognee as graph nodes.

## 8. MCP Server Responsibilities & Tool Registry

### 8.1 Core responsibilities

- **Tool registration:** define every tool's name, description, and JSON schema so clients can discover capabilities via tools/list.
- **Request handling:** implement tools/call dispatch, routing to the correct integration module.
- **Session context:** optionally track short-term session state; Cognee's own session_id mechanism can absorb this rather than kube-memory maintaining its own cache.
- **Security:** authenticate callers (API key or OAuth/OIDC) and scope tool access by role.
- **Orchestration:** for compound operations (e.g. risk check), sequence multiple tool calls internally — recall memory, then decide whether to call a Kubernetes tool.
- **Error handling:** return structured MCP errors rather than raw exceptions, so the calling agent can react sensibly.
- **Background jobs:** ingestion and nightly improve() runs happen outside the MCP request/response cycle, on a schedule.

### 8.2 Tool registry

| Tool | Function | Output |
| --- | --- | --- |
| memory_recall | Query the knowledge graph for relevant past incidents by free-text or structured query. | Text answer or structured JSON with matched incidents |
| memory_remember | Store a new event (deployment, incident, fix) as a memory node. | Acknowledgment |
| memory_forget | Remove stale or sensitive memory matching a filter. | Acknowledgment |
| k8s_pod_logs | Fetch logs for a given namespace/pod/container. | Raw log text |
| k8s_get_events | Return Kubernetes events for a pod, service, or namespace. | JSON list of events |
| deploy_service | Trigger or simulate a deployment via ArgoCD/GitOps. | Deployment status |
| rollback_service | Roll back a deployment to a prior version. | Status / confirmation |
| github_list_issues | Query GitHub issues/PRs by label or keyword. | JSON list of issues |
| slack_get_history | Search recent messages in an ops/dev channel. | JSON list of messages |
| pagerduty_list_incidents | Query PagerDuty incidents by service or status. | JSON list of incidents |
| predict_risk | Score a planned deployment's risk using recall similarity (optional ML refinement later). | { score, reason } |

Note on predict_risk: ship it first as a thin wrapper over memory_recall's similarity score, not a trained model — see Section 14 for the heuristics-vs-ML tradeoff.

## 9. Required Integrations / Connector Matrix

Every connector beyond the first is a discrete integration effort (auth, rate limits, data shape). The table below orders them by build priority for the standalone MCP server; Section 15 covers the much larger connector list implied by the managed-platform vision.

| Connector | Priority | What it contributes to memory |
| --- | --- | --- |
| Kubernetes | P0 — MVP | Pod logs, events, CrashLoopBackOff/OOMKilled signals, deployment state via @kubernetes/client-node. |
| Cognee Cloud | P0 — MVP | Not a DevOps tool, but the memory backbone every other connector writes into. |
| GitHub | P1 | Commit IDs, issue/PR context, linking code changes to incidents via @octokit/rest. |
| ArgoCD / GitOps | P1 | Deployment results and commit linkage via webhooks. |
| Prometheus / Grafana | P1 | Metric anomalies (CPU/memory spikes) as MetricsObservation nodes. |
| Slack | P2 | Incident-channel conversations as evidence for FixAction nodes, via @slack/web-api. |
| PagerDuty | P2 | Incident timelines and responder data. |
| Jira / Linear | P3 (managed platform) | Ticket-level context for teams not using GitHub Issues. |
| Datadog | P3 (managed platform) | Alternative metrics/alerting source for teams not on Prometheus. |
| AWS / Azure / GCP | P3 (managed platform) | Cloud-provider events (autoscaling, node failures) outside the cluster itself. |
| Terraform / Helm | P4 (managed platform) | Infra-as-code diffs correlated with incidents. |

## 10. Knowledge Graph Data Schema

The schema below maps DevOps concepts onto graph entities and relations so multi-hop queries are possible — e.g. "find all services where a deployment led to an OOMKilled failure last week" traverses Service → Deployment → Incident → RootCause.

### 10.1 Entities

- Service, Deployment, Incident, RootCause, FixAction
- Person, Commit, Configuration, ErrorLogSnippet, MetricsObservation

### 10.2 Key relations

- Service —hasDeployment→ Deployment —hasIncident→ Incident
- Incident —hasRootCause→ RootCause; Incident —resolvedBy→ FixAction
- Person —appliedFix→ FixAction; Commit —triggered→ Deployment
- ErrorLogSnippet —indicates→ RootCause; FixAction —basedOn→ RootCause

### 10.3 Key properties

| Entity | Properties |
| --- | --- |
| Service | name, team, criticality |
| Deployment | timestamp, image tag, cluster namespace |
| Incident | time, severity, status (open/resolved) |
| RootCause | category (Resource, Config, CodeError…), description |
| FixAction | type (rollback, patch, config-change), description, applied_at |

## 11. Failure Taxonomy

A small, fixed set of standardized categories keeps querying and aggregation tractable, and is what makes the heuristic classifier in Section 4.1 viable for an MVP. Incidents are often multi-label.

| Category | Examples |
| --- | --- |
| Resource Limit | OOMKilled, CPU throttling |
| Configuration Error | Wrong API version, bad env vars, missing secrets |
| Dependency Failure | Downstream DB/cache unreachable or erroring |
| Network / DNS | Partitions, DNS lookup failures, firewall blocks |
| CrashLoop / App Exception | Startup exceptions, repeated restarts |
| Timeout / Latency | API timeouts, hung tests |
| Permission / Auth | 403s, denied secret access |
| CI/CD Pipeline | Build or test script failures |
| Cluster Issues | Disk full, version mismatch, scheduling failure |
| Agent Error | LLM hallucination, malformed JSON, infinite tool-call loops |

Classification starts with heuristic rules (regex/string match against known signatures) and graduates to an NLP/LLM classifier only for the residual cases the heuristics miss — see Section 4.2 for why this ordering matters.

## 12. Memory Lifecycle (Cognee)

kube-memory's memory layer maps directly onto Cognee's four documented operations. These are real, current Cognee API calls (confirmed against Cognee's own documentation), not a metaphor invented for this document.

| Operation | How kube-memory uses it |
| --- | --- |
| remember() | Called after every pipeline run or detected incident, writing structured event data (service, timestamp, failure type, root cause, fix, resolved flag) into the graph. Can run in the background; indexing completes asynchronously. |
| recall() | Called before or during an action to retrieve similar past incidents, auto-routing between vector similarity and graph traversal. |
| improve() / memify | Run on a schedule (e.g. nightly) to re-embed, deduplicate, link related nodes, and strengthen frequently-useful connections. |
| forget() | Applied on a retention policy — purge incidents past a TTL, or scrub sensitive fields from logs. |

Operationally important caveat: because remember() can return before indexing finishes, a recall() issued immediately after a remember() during the same incident may not yet see it. Workflows that need same-incident recall should check dataset indexing status rather than assume instant consistency.

## 13. Diagnosis & Remediation Pipeline

1. Detection — a webhook or poller notices a failure state (CrashLoopBackOff, failed CI run, fired alert).
2. Collection — gather pod logs, cluster events, and relevant metrics.
3. Root-cause analysis — apply heuristic rules first; fall back to LLM classification only for unmatched cases (see Section 4.2).
4. Candidate treatment — propose a fix based on root-cause category (e.g. raise memory limit for OOMKilled).
5. Memory check — call recall() to find the most similar past incident and its recorded fix.
6. Response — present a recommendation to the human or pipeline: what failed before, what fixed it, and a confidence indicator.
7. Feedback — record whether the fix was applied and whether it worked, closing the loop with remember().

Auto-apply should be opt-in per fix type and logged with full audit trail — see Section 4.2 on auto-remediation risk before enabling it for anything beyond the lowest-risk, highest-confidence fix categories.

## 14. Similarity & Risk Scoring

There are two viable approaches to deciding "is this new event similar to a past one," with different tradeoffs:

| Aspect | Heuristic | ML / Embedding-based |
| --- | --- | --- |
| Data needed | Low — rules and keywords | Higher — needs enough history to be meaningful |
| Interpretability | High — explicit logic | Lower — similarity scores are not self-explaining |
| Robustness | Brittle to wording changes | Handles paraphrases and novel wording |
| Best for | Exact known signatures ("is this an OOMKilled?") | Fuzzy matching across noisy, varied log text |

Recommendation: start with heuristics for the known failure categories in Section 11, and lean on Cognee's built-in vector similarity (already part of recall()) for fuzzy matching, rather than building a separate embedding pipeline. A bespoke supervised classifier is a later-stage investment once there's enough labeled outcome data to train and evaluate one — not an MVP item.

## 15. kube-memory Cloud — Managed Platform

The standalone MCP server requires every team to clone the repository, host it, and manage their own secrets and Cognee dataset. kube-memory Cloud is the managed evolution: a hosted, multi-tenant MCP endpoint that removes that setup burden entirely.

### 15.1 Onboarding flow

1. Create a kube-memory workspace.
2. Connect infrastructure via OAuth or API keys.
3. Receive a dedicated MCP endpoint and workspace API key.
4. Paste the endpoint into Cursor, VS Code, Claude Desktop, or any MCP-compatible client.

```json
{
  "mcpServers": {
    "kube-memory": {
      "url": "https://api.kube-memory.ai/mcp",
      "headers": {
        "Authorization": "Bearer km_xxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 15.2 Workspace architecture

Each organization gets an isolated workspace: a dedicated Cognee dataset, its own connector configuration, API keys, RBAC, organizational knowledge graph, memory retention policies, and connector health status. Workspaces are multi-tenant-safe at the dataset level, consistent with Cognee's documented permissions model (Section 4.1).

### 15.3 Automatic infrastructure discovery

After connecting Kubernetes, the platform can attempt to auto-detect adjacent infrastructure — ArgoCD applications, Helm releases, namespaces, services, a linked GitHub repository, a Prometheus/Grafana instance, or a Slack incident channel — and suggest one-click connector setup. This materially improves onboarding, but it is itself nontrivial discovery logic (cluster introspection + heuristic matching to external accounts) and should be scoped as its own milestone rather than bundled into core MVP delivery.

### 15.4 Connector marketplace

A pluggable Connector SDK lets third parties publish connectors that expose MCP tools, webhooks, background sync jobs, and memory-enrichment pipelines, so the integration surface can grow without the core platform team building all 18+ connectors itself. This is a post-MVP, ecosystem-stage feature.

### 15.5 Enterprise features

| Feature | Note |
| --- | --- |
| Multi-workspace / team collaboration | Standard SaaS tenancy on top of Cognee's dataset isolation. |
| RBAC & scoped API keys | Reader vs. admin distinctions map to Cognee's dataset-level permissions. |
| Audit logs | Every remember()/tool call is timestamped and attributable; this is mostly a logging/UI exercise on top of data kube-memory already has. |
| Secret rotation | Provider tokens (GitHub PAT, Slack token) stored in a secrets manager, never passed to the LLM or stored in memory nodes. |
| Memory versioning | Track graph state over time — useful for debugging "why did the agent suggest this fix," but adds real storage and complexity; treat as a later milestone. |

### 15.6 Positioning

> kube-memory — the memory-native MCP platform for autonomous DevOps. Instead of deploying infrastructure, teams connect their tools and get an agent that remembers every deployment, incident, diagnosis, and recovery across the engineering organization.

Important framing note: the managed-platform vision is a substantially larger product than the standalone MCP server in Sections 7–9. It should be sequenced after the standalone server proves the memory loop works on real incidents (Section 20) — selling hosted infrastructure before the core value proposition is validated inverts the risk order.

## 16. Security & Privacy

### 16.1 Authentication & access control

- **MCP auth:** API keys or OAuth2 on every MCP and REST endpoint; no anonymous tool calls.
- **RBAC:** reader roles can query memory but not alter it; admin roles can manage connectors and run memory_forget. Tools should be tagged with the minimum role they require.
- **Kubernetes scope:** operate read-only by default; any write/auto-remediation tool needs explicit, narrowly-scoped cluster RBAC.

### 16.2 Encryption & secrets

- HTTPS/TLS for all MCP, REST, Cognee, and provider API traffic.
- Provider tokens (GitHub PAT, Slack token, PagerDuty key) stored in a secrets manager — never logged, never passed to an LLM prompt, never stored as a memory node field.

### 16.3 PII and sensitive data

- Mask obvious secrets and PII in logs before calling remember() (regex-based redaction for the MVP; a small classifier later if needed).
- Use forget() on a retention schedule to purge logs and incident data past their relevance window.
- Workspace-level dataset isolation (Section 15.2) prevents cross-team memory leakage in the managed platform.

### 16.4 Auditability

The memory graph is itself a partial audit log — every remember() call is timestamped and attributable. Combine this with standard MCP server request logging for a full trace of what an agent asked for and what it was told.

## 17. Scalability & Performance

- **Storage:** Cognee Cloud's managed backend (relational + vector + graph stores) scales independently of the Express tier; self-hosting Cognee OSS would mean operating that stack directly.
- **Express tier:** stateless, horizontally scalable behind a load balancer; MCP calls are JSON-RPC and largely idempotent.
- **Caching:** an LRU cache in front of frequent recall() queries reduces latency for repeated questions (e.g. "any known issues with payment-service" asked by multiple pipelines).
- **Ingestion throughput:** batch or rate-limit large log ingestion; queue via SQS/RabbitMQ if ingestion volume spikes beyond what synchronous calls to Cognee can absorb.
- **Retention:** define explicit retention windows and apply forget() on a schedule to keep the active graph lean; archive older data to a separate cold dataset rather than deleting it outright if compliance requires it.

## 18. Testing Strategy

- **Unit tests:** mock Cognee's REST API and each provider SDK; verify tool implementations return correctly-shaped MCP responses.
- **Integration tests:** spin up a local cluster (kind/minikube) and a Cognee test dataset; ingest synthetic events and verify they're recallable.
- **End-to-end tests:** simulate a full incident loop — recall, apply fix, remember outcome — and confirm graph state changed as expected.
- **Mocking external services:** use Nock or similar to test GitHub/Slack/PagerDuty calls offline.
- **Load testing:** k6 or ab against the MCP endpoint to validate latency targets under concurrent agent calls.

Target >80% coverage on tool implementation and memory-client code specifically, since those are the modules most exposed to upstream API drift.

## 19. Tech Stack

| Component | Choice |
| --- | --- |
| MCP server | Express.js + @modelcontextprotocol/sdk (TypeScript recommended for schema safety) |
| Memory backend | Cognee Cloud, accessed via a hand-rolled HTTP client (no native Node SDK — see Section 4.2) |
| Kubernetes client | @kubernetes/client-node |
| GitHub client | @octokit/rest |
| Slack client | @slack/web-api |
| Metrics | prom-client, exposing /metrics for Prometheus scraping |
| CI/CD | GitHub Actions for build/test/scan; ArgoCD/GitOps for deployment |
| Testing | Jest, Nock, kind/minikube for integration, k6 for load testing |
| Container runtime | Docker + Kubernetes for kube-memory's own deployment |

## 20. MVP Roadmap & Phasing

Sequenced to validate the riskiest, most novel assumption first — that recall actually helps — before investing in breadth (more connectors) or scale (the managed platform).

| Phase | Theme | Deliverables |
| --- | --- | --- |
| 1 | Core memory loop | MCP server with memory_remember / memory_recall; manual /ingest endpoint; verify Cognee remember/recall round-trip on real data. |
| 2 | Kubernetes integration | k8s_pod_logs, k8s_get_events; auto-ingest a real CrashLoopBackOff/OOMKilled event end to end. |
| 3 | Heuristic diagnosis | Rule-based root-cause classification for the taxonomy in Section 11; generate a FixAction suggestion for at least one category (OOMKilled → raise memory limit). |
| 4 | Recall-driven suggestions | Cause a second, similar failure; confirm recall surfaces the first and the agent returns a usable suggestion via MCP. |
| 5 | Security & multi-tenancy baseline | API-key auth on MCP; per-team Cognee dataset isolation if more than one team is using it. |
| 6 | Breadth | GitHub, Slack, PagerDuty, Prometheus connectors per the priority order in Section 9. |
| 7 | Self-improvement | Schedule nightly improve(); measure its effect against the metrics in Section 21 rather than assuming benefit. |
| 8 | Remediation automation (opt-in) | Auto-patch and rollback_service, gated per fix type behind explicit approval, with full audit trail. |
| 9 | kube-memory Cloud | Managed workspace provisioning, connector dashboard, and the broader connector matrix — only after Phases 1–4 demonstrate the loop works on real incidents. |

## 21. Success Metrics

- **MTTR reduction:** mean time to recovery compared to a pre-kube-memory baseline.
- **Repeat incident rate:** fewer recurring incidents because memory caught them before or during the next occurrence.
- **Memory coverage:** incidents logged vs. queries answered with a relevant match.
- **Suggestion accuracy:** fraction of kube-memory's recommendations that led to a successful fix, tracked against actual outcomes.
- **Latency:** MCP recall response time, target sub-1-second for the common case.
- **Adoption:** share of services/pipelines actively calling kube-memory tools.

These should be tracked from Phase 3 onward — without baseline numbers, it's not possible to tell whether improve() or the LLM-based classifier (Section 4.2) are actually earning their complexity.

## 22. Risks, Open Questions & Recommendation

### 22.1 Open questions to resolve before Phase 1

- Confirm Cognee Cloud's current product name, pricing tier, and SLA directly with Cognee (Section 4.2) before any customer-facing commitment depends on it.
- Decide whether to call Cognee Cloud's REST API directly or proxy through the official cognee-mcp server — this changes the auth model and how much memory-tool logic kube-memory needs to own itself.
- Decide the indexing-latency tolerance for "recall during an active incident" — this affects whether real-time remediation suggestions are reliable in the first minutes of an outage.

### 22.2 Recommendation

Build the standalone MCP server first, on a single connector (Kubernetes), with heuristic-only diagnosis. This is the smallest version of the idea that can prove or disprove the central claim — that persistent memory measurably reduces repeat incidents — before committing engineering time to LLM-based diagnosis, auto-remediation, or the full managed-platform connector matrix. Everything in Sections 15 and 20 (Phases 6–9) should be funded by evidence from Phases 1–4, not by the strength of the pitch alone.