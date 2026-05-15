# Skills

A snapshot of the tools I reach for. Depth varies — the categories below
are roughly ordered by how often I use each item day-to-day.

## Languages & Frameworks

**Python** is my primary language for AI / backend work — comfortable with
asyncio, dataclasses, type hints, and the modern stdlib. **Java** (Spring
Boot) was my daily driver at Amazon for two years on the payment-platform
team. **Go** for high-throughput services and CLI tooling. **TypeScript**
and **JavaScript** for frontends — strict mode, no `any`, types as
documentation. **React** + **Next.js 14** (App Router, Server Components,
Server Actions). **FastAPI** for Python APIs; **Spring Boot** for JVM
services. **Node.js** for tooling and Edge / Lambda runtimes.

## AI/ML & Agents

**LangChain** and **LangGraph** for agent orchestration — I lean on
LangGraph for anything stateful or branching, and treat raw LangChain as
a library of useful components rather than an opinionated framework.
**CrewAI** patterns (specialist roles, hand-offs) implemented on top of
LangGraph. Experience with **AutoGPT**-style planner/executor loops, and
strong opinions on when not to use them (most of the time). **PyTorch**
for the rare bits of custom modeling. **Transformers** (HuggingFace) for
local inference and fine-tuning small models. **sentence-transformers**
for the embedding side of RAG. **Anthropic SDK** as my default LLM client;
**OpenAI SDK** when I have to. **LiteLLM** for multi-provider routing
with per-route fallbacks and budget caps. **Tiktoken** for token counting.

## Vector & Graph Databases

**pgvector** is my default for RAG — HNSW with cosine distance, paired
with Postgres FTS for hybrid retrieval. **Pinecone** and **Weaviate** when
the team already has them; pgvector if I'm picking. **Neo4j** for entity
graphs and agent memory — Cypher, graph schemas, traversal patterns.
**Redis Streams** for ephemeral event buses and as the agent's short-term
working memory. **Qdrant** for one project where we needed Rust-grade
recall and payload filtering at scale.

## Cloud & Infrastructure

**AWS** is where I have the most operational depth: EC2, S3, RDS, Lambda,
ECS, EKS, SQS, SNS, CloudFront, Route 53, IAM. Comfortable enough with
**GCP** (Cloud Run, GKE, BigQuery) and **Hetzner / DigitalOcean** for
cost-sensitive deploys. **Docker** and **Docker Compose** for everything;
**Kubernetes** for production workloads requiring auto-scaling.
**Terraform** for IaC — modules, remote state in S3 with DynamoDB locking.
**GitHub Actions** and **CircleCI** for CI/CD. **Caddy** and **Nginx** for
reverse proxies. **Cloudflare** for DNS, edge caching, and Workers.

## Data & Messaging

**Apache Kafka** in anger — partitioning strategies, consumer groups,
idempotent producers, exactly-once semantics with transactions. **RabbitMQ**
for simpler queue-and-fan-out work. **Apache Spark** for the few batch
ETL jobs I've owned. **PostgreSQL** is my default OLTP store — comfortable
with EXPLAIN ANALYZE, partial / GIN / GiST indexes, materialized views,
LATERAL joins, and Common Table Expressions. **MongoDB** when a document
model fits and consistency requirements are relaxed. **ClickHouse** for
observability data and analytics workloads. **DuckDB** for one-off
analyses.

## Observability & Reliability

**Prometheus** + **Grafana** for metrics. **OpenTelemetry** for distributed
tracing across services. **Loki** for structured logs at low cost. **Sentry**
for error aggregation. Chaos-engineering experience (Gremlin and home-grown
fault injection at the service-mesh level). On-call rotations for four
years across Amazon and Softgenio.
