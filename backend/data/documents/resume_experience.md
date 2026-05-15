# Work Experience

## Meshi.io (MyAscend AI) — Senior AI Engineer (2024–present)

Building the multi-tenant AI agent platform that powers Meshi.io's enterprise customers (mid-market healthcare, fintech, and logistics).

- Architected a multi-agent orchestration platform on LangGraph with CrewAI-style role specialization (planner, retriever, executor, critic). Sustained 3.5K req/sec across enterprise tenants during the Q1 2026 load test, with p95 < 900 ms end-to-end on the chat completion path.
- Built the production RAG pipeline: pgvector HNSW + Postgres FTS BM25 hybrid retrieval with a cross-encoder reranker. Lifted answer accuracy by 45% over the dense-only baseline on the internal benchmark suite (1,200 manually-graded Q/A pairs).
- Designed the agent memory layer on Neo4j Aura: episodic, semantic, and procedural memory partitions linked through a typed entity graph. Cut context tokens per turn by 38% by retrieving only the subgraph relevant to the current task.
- Owned the LiteLLM routing layer across Claude 3.5 Sonnet, GPT-4o, and self-hosted Llama 3.1 70B. Spot-route cheap turns to Haiku/Llama; escalate ambiguous turns to Sonnet/Opus. Reduced average cost-per-conversation by 62% while keeping CSAT flat.
- Shipped streaming SSE + WebSocket tool-call interfaces so the front-end can render mid-step reasoning, tool invocations, and partial answers without buffering. Enabled the "Show me what you're thinking" UX that customers consistently flag as the product's most differentiated feature.
- Owned the prompt-engineering CI: every prompt change is gated by a regression test against 400+ recorded turns with grade-LLM evaluation. Caught 11 silent regressions in the first quarter that would otherwise have shipped.
- Mentored two junior engineers through their first production agent rollout; co-authored the internal "Agents in Prod" runbook covering tool-call sandboxing, prompt injection defense, and cost guardrails.

## Amazon — SDE II, Payment Platform (2022–2024)

Worked on the global payment authorization service — the system that decides whether a card / wallet / promotional-credit transaction is approved at checkout for amazon.com and AWS Marketplace.

- Led the monolith-to-microservices migration of the auth-decisioning path. Carved out fraud-scoring, ledger-write, and risk-policy services from a 12-year-old Java monolith. Handled 50M+ daily auth requests at steady state, with bursts to 4× during Prime Day.
- Designed the event-driven backbone on Kafka with CQRS read-models and exactly-once idempotent consumers. Built the dead-letter queue + replay tooling that on-call engineers use to recover stuck transactions without paging the team.
- Drove latency: p95 on the critical-path auth call dropped from 450 ms to 180 ms after the migration. Combined three wins — gRPC instead of HTTP/JSON inter-service, async non-blocking I/O on the JVM (Project Reactor), and a Redis-backed L1 cache for the rate-policy lookup.
- Hardened the rollout: feature flags via internal AppConfig, shadow traffic comparison against the monolith for six weeks, gradual cell-by-cell cutover. Zero customer-visible incidents during the cutover window.
- Raised the team's availability SLA from 99.95% to 99.99% through automated dependency-health probes, circuit-breakers on every downstream call (Hystrix → Resilience4j), and a load-shedding policy that prefers degraded-mode auth over total failure.
- Wrote the chaos-engineering playbook for the auth pipeline: weekly game days, GameDay tooling that injects latency / 5xx / region failover at the service-mesh level. Adopted org-wide six months in.

## Softgenio Technology — Software Engineer (2020–2022)

Full-stack engineer on a B2B logistics product (route optimization + last-mile dispatch) for ~30 enterprise customers.

- Built the order ingestion service in Spring Boot — REST + Kafka producers — that normalized customer-specific CSV/EDI formats into the internal schema. Handled 2M+ orders/day in the steady state.
- Implemented the dispatch engine: a constraint-solver wrapper around OR-Tools that produced driver routes minimizing total drive-time under vehicle capacity and time-window constraints. Cut average delivery time per order by 18%.
- Built the operations dashboard in React + TypeScript: live map of in-flight vehicles, exception queue for stuck deliveries, manual re-route UI. Used Mapbox GL JS with WebSockets feeding position updates every 5s.
- Owned the on-call rotation for two years. Authored 14 production runbooks covering the most common failure modes.

## Black Box Corporation — Frontend Developer (2018–2020)

First full-time role out of undergrad; worked on the internal customer-portal redesign and the public marketing site.

- Re-platformed the customer portal from server-rendered JSP to a React SPA with a typed REST client generated from the backend's OpenAPI spec. Cut average page-load p95 from 2.4 s to 600 ms.
- Built the design-system library (React + Storybook + Emotion) consumed by three product teams. Documented every component with usage examples, accessibility notes, and contrast ratios.
- Drove the accessibility audit: WCAG 2.1 AA compliance for the portal. Fixed 200+ issues across keyboard navigation, color contrast, ARIA labelling, and screen-reader landmarks. Passed an external Deque audit on the first attempt.
- Mentored two interns; one converted to full-time.
