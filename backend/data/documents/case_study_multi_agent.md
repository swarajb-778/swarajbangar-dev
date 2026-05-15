# Case Study: Multi-Agent Orchestration at Meshi.io

## Problem

Meshi.io's first agent product was a single-prompt chat that answered
operational questions for mid-market healthcare back-offices ("which
claims are stuck in PRE-AUTH for > 5 days for payer X?").  It worked
fine for direct lookups, but as customers pushed harder on multi-step
tasks — pulling data across three systems, reasoning about it, then
drafting an action — the single-prompt design started to fail in two
distinctive ways.  First, the model would hallucinate intermediate
results when the chain of reasoning exceeded ~4 tool calls.  Second,
when it didn't hallucinate, it would burn 18–25K tokens per
conversation chasing exhaustive paths, which destroyed the unit
economics.  We were paying $0.40 per resolved ticket against a
contract price of $0.12.

## Approach

I led the move to a multi-agent topology built on LangGraph.  Four
role-specialized agents share a typed state object: a **Planner**
decomposes the user's goal into a directed graph of subtasks; a
**Retriever** pulls evidence from the hybrid RAG corpus and the
customer's CRM/EHR via tool calls; an **Executor** invokes any
side-effectful tools (creating tickets, drafting messages); and a
**Critic** scores each finished branch against the success criteria
the Planner emitted at the start and either accepts the answer or
sends a targeted re-plan request back upstream.

Three design choices made the topology actually work in production
rather than just on the demo dataset.  First, every agent has a
hard token budget enforced by middleware, not a soft hint in the
prompt — exceeded budgets short-circuit to a graceful "I need to
narrow this down" reply.  Second, the Critic uses a smaller model
(Haiku) running a fixed rubric, never the same model that produced
the answer.  Third, all state lives in a single TypedDict that's
serialized at each step boundary, so a turn can resume on a
different host if one falls over.

## Architecture

The runtime is FastAPI + LangGraph.  Each agent is a node in the
graph; edges are conditional functions that read the shared state.
LiteLLM sits in front of the model APIs and routes by role and
estimated complexity: Planner and Critic get Claude Haiku, the
Retriever uses GPT-4o or Sonnet depending on tool-call breadth, the
Executor uses Sonnet for higher-stakes drafts.  Tool calls are
sandboxed inside a per-tenant gateway service that enforces RBAC,
PII redaction, and a structured-output schema.  Memory writes go to
a Neo4j entity graph with three partitions (episodic / semantic /
procedural); reads at the top of every turn pull only the subgraph
reachable from the current task's seed entities.

## Results

Six weeks after the migration, on a frozen evaluation set of 400
multi-step tickets: accuracy went from 71% to 89% (graded by senior
operators against a written rubric).  Average tokens per resolved
ticket dropped from 23.4K to 8.8K — a 62% cost reduction that put
us under the contract price for the first time.  Tail latency
(p95) rose from 4.1s to 5.7s, which we accepted because the
streaming reasoning UI made the perceived latency *lower*: users
saw progress within 400ms instead of staring at a spinner for four
seconds.  Six months in, the topology now handles five customer
segments with role rosters tuned per-segment but the same
underlying graph runtime.
