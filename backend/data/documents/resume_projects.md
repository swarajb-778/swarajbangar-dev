# Notable Projects

## Collaborito — Real-time collaborative notepad with CRDT sync

A production-grade collaborative document editor built end-to-end as a
demonstration of a low-latency, conflict-free multi-user system.  Lives
under `/lab/fullstack` on this site.

- **Why it's interesting.** Most "Google Docs clone" demos cheat by
  using operational transformation (OT) on the server; Collaborito uses
  Yjs CRDTs end-to-end so the client model and server model are the
  same data structure.  Adding a third backend (or zero backends, in
  peer-to-peer mode) is a configuration change.
- **Stack.** Next.js 14 (App Router) on the frontend with a custom
  Yjs binding.  A FastAPI WebSocket gateway in front of a Postgres
  `documents` table that stores the Y.Doc binary state + a circular
  buffer of recent updates for fast late-joiner sync.  Redis Streams
  for the per-document presence channel.  Hetzner CX31 deploy with
  Caddy fronting two app containers behind a sticky-session load balancer.
- **Hard parts.** Awareness state (cursors, selections, names) had to
  ride a different channel from the document updates to keep the
  presence ticker from drowning the persistence pipeline.  Late-joiner
  sync is two-phase: snapshot of the current Y.Doc state, then a
  catch-up replay of any updates that landed during the snapshot
  transfer.
- **Results.** 50ms median sync latency in same-region clients; 180ms
  cross-continent.  Zero divergence events across 14 days of automated
  chaos testing that injected packet loss, connection resets, and
  clock skew.

## RapidOrch — Self-hosted workflow orchestrator

A lightweight Airflow alternative for teams that want declarative
pipelines without the operational burden of running a full Airflow
deployment.  Built when Softgenio's data team had three
Airflow-on-Kubernetes outages in two months.

- **Why it's interesting.** Single binary, SQLite or Postgres backend,
  no Celery / no Redis required.  Pipelines defined in YAML and version-
  controlled with the application code.  Backfill, retry-with-backoff,
  and dependency-aware scheduling all behave the same locally and in
  production.
- **Stack.** Go binary with Bubble Tea TUI for the operator console.
  Embedded BadgerDB for state, with Postgres as an optional adapter
  for HA deploys.  Goroutine-pool task runner with structured logging
  to stderr and JSON-line emission to a configurable sink.
- **Hard parts.** Getting time-based scheduling right across DST
  transitions and timezone changes — the kind of bug you only see
  twice a year and that has eaten months of senior engineers' time
  at other companies.  Designed catch-up semantics around explicit
  "as of" timestamps stored alongside every run record.
- **Results.** Replaced 11 internal cron-based and Airflow-based
  workflows at Softgenio.  ~2K lines of Go.  Open-source on GitHub
  with 380 stars at the time of this writing; one external contributor
  has shipped a Slack notification adapter.

## SwarajOS — Multi-agent orchestration playground

A tabbed lab for trying out agent topologies (planner/executor,
debate, hierarchical) against a fixed set of tasks (file Q/A,
math word problems, code generation).  Lives under `/lab/agent`
on this site.  Open-source on GitHub.

- Implements four agent patterns on top of LangGraph: ReAct,
  Plan-and-Execute, Reflexion-style self-critique, and a hierarchical
  "manager + workers" pattern.  Each runs on the same task set so
  you can see the latency / cost / accuracy trade-offs side by side.
- All agent state is streamed to the frontend over Server-Sent Events
  so users can watch the planning, tool calls, and intermediate
  reasoning in real time rather than waiting for a single batched
  response.
- Cost guardrails baked in: per-conversation token cap, per-day
  spend cap, and a kill-switch the operator can flip to force-route
  everything to Haiku.

## Chaos Lab — Failure injection visualizer

The `/lab/backend/chaos` demo on this site.  A toy distributed system
(3 services, 1 database, 1 cache) that the visitor can deliberately
break — kill a service, slow the database, partition the network — and
watch the system's behavior in a live request-flow visualization.

- Demonstrates load-shedding, circuit-breaking, retry-with-backoff,
  and graceful degradation patterns in a way that doesn't require
  the visitor to set up a Kubernetes cluster.
- The entire thing runs in the browser: each "service" is a Web Worker
  with simulated latency and failure modes, the "network" is a
  pub/sub channel between workers, and the "database" is a simple
  in-memory store with configurable consistency knobs.
- Used during system-design interview prep with two coworkers; both
  reported it helped them articulate trade-offs they had been
  taking for granted.
