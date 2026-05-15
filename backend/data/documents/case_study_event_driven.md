# Case Study: Event-Driven Migration of Amazon's Payment Auth

## Problem

The Amazon payment-authorization service I joined in 2022 was a
Java monolith that had been load-bearing since roughly 2010.  It
made the final go/no-go decision on every card / wallet /
promotional-credit charge across amazon.com and AWS Marketplace.
By the time I came on, the service handled around 35M requests per
day in the steady state, and the team had a hard ceiling problem:
peak Prime Day traffic was projected to be 4× the steady state,
and the synchronous-everything design couldn't be scaled
horizontally past one more provisioning cycle.  Latency was
deteriorating too — p95 had drifted from 280ms to 450ms over
eighteen months as the team added fraud-scoring rules and
compliance checks inline.  Worse, an incident in the fraud-scoring
DB had caused a four-hour partial outage because there was no
circuit-breaker; the entire auth path queued up waiting on a slow
downstream.

## Approach

I led the carve-out of three services from the monolith:
**Fraud-Scorer**, **Ledger-Writer**, and **Risk-Policy-Eval**.  The
contract between them and the auth orchestrator became Kafka events
plus targeted gRPC RPCs for synchronous reads.  We kept the original
auth orchestrator as the system of record; new services produced
events that were consumed by it, not the other way around.  That
choice preserved the monolith's existing audit trail and meant we
could roll back any service independently.

The migration ran in three phases over nine months.  Phase one was
shadow-traffic: every auth request ran through both the monolith
and the new services, the new services' decisions were logged but
not used, and a daily reconciliation job flagged any decision
divergence above a tolerance.  Phase two flipped a feature flag,
cell by cell, to use the new services' decisions for a percentage
of traffic — starting at 0.1% and ramping over four weeks.  Phase
three retired the monolithic copies of the carved-out logic.

## Architecture

Kafka with 24 partitions per topic, idempotent producers, exactly-
once semantics enabled via transactional writes.  Each new service
maintained a CQRS read-model (Postgres) updated from the event
stream; the orchestrator read from those rather than calling
synchronously, which collapsed three serial RPCs into a single
local lookup.  Dead-letter queues sat in front of each consumer
with replay tooling that an on-call could trigger from a Slack
slash command.  Resilience4j circuit-breakers wrapped every
remaining downstream RPC, with bulkheads partitioning thread pools
per call site so a slow downstream couldn't starve the rest.  Redis
held an L1 cache for the rate-policy lookup (90% hit rate).
Service mesh: Envoy sidecars handling mTLS, retries, and traffic
shifting.

## Results

End-state numbers, measured against the pre-migration baseline:
**p95 latency 450ms → 180ms** on the critical-path auth call.
**Steady-state throughput 35M → 50M+** auth requests per day with
4× burst capacity demonstrated during the Prime Day 2023 load
test.  **Availability 99.95% → 99.99%** measured over the trailing
year.  Zero customer-visible incidents during the nine-month cutover.
After the migration, an unplanned fraud-scorer slowdown in Q4 2023
that would have caused another four-hour outage instead caused
seventeen seconds of elevated p99 — the circuit-breaker opened, the
orchestrator fell back to the cached policy, and on-call closed the
incident from their laptop without paging anyone else.
