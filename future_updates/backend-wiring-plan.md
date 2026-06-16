# Plan — Wire the new `/` landing page to the live backend

> Restructured from the original "wire frontend to VPS backend" prompt, adapted to the
> **redesigned landing page** (`src/components/landing/*`) which is currently 100% mocked.
> Each phase is self-contained and can be executed in a fresh chat context.

---

## Context & decisions (read first)

**Codebase:** `/Users/swarajbangar/Documents/Coding/swarajbangar-dev` (NOT the `MyPortfolio` docs dir).
Branch: `feat/design-system`.

**What changed since the original prompt was written:**
- The main page (`/`) is now the awwwards-style `Landing` component
  ([src/components/landing/Landing.tsx](../src/components/landing/Landing.tsx)). The old design
  lives at `/portfolio` ([src/app/portfolio/page.tsx](../src/app/portfolio/page.tsx)).
- The new landing is **fully self-contained and hardcoded** — none of its components import
  `api-client.ts`:
  - `ChatDock` uses canned regex replies ([ChatDock.tsx:23-33](../src/components/landing/ChatDock.tsx)),
    hint literally says *"responses are canned for this portfolio"*.
  - The Lab modals (`ChaosLabDemo`, `AgentDemo`, `RagDemo`, `RealtimeDemo`) are client-side
    simulations ([LabDemos.tsx](../src/components/landing/LabDemos.tsx)).
  - `MetricsChart`, `MetricsExtra`, and the stats/KPI numbers in `Landing.tsx` are static / jittered fakes.
- `api-client.ts` **already** has real wiring for the RAG endpoints with a `withMockFallback`
  helper ([api-client.ts:82-98](../src/lib/api-client.ts)) — but only the old `/portfolio` page
  consumes any of it, and chat goes through `/v1/rag/query` (single-shot), not the streaming agent.
- There are **no Next.js API proxy routes** yet — `src/app/api/` is empty.

**Decisions locked in (from the user):**
1. **Backend is a DigitalOcean droplet over HTTP only** (no TLS yet).
2. **Scope = new landing `/` + the Lab modal demos.** Chaos stays a client sim (no backend endpoint).
3. **ChatDock = full SSE streaming answer + live reasoning trace.**

**The architectural consequence of decision #1 (critical):**
A Vercel page is served over **HTTPS**. The browser **cannot** call `http://<droplet>:8000` directly —
it's blocked as *mixed content*, and `ws://` is blocked too. Vercel also **cannot** host long-lived
WebSocket connections. Therefore:

- **All backend traffic goes through same-origin Next.js Route Handler proxies** (`/api/*`), which run
  server-side and `fetch()` the droplet over HTTP. This kills mixed-content AND CORS in one move, and
  hides the droplet IP from the browser.
- **The reasoning trace is driven from the SSE `step` events** that `/v1/agent/orchestrate` already
  emits ([agent.py:66-92](../backend/app/routers/agent.py)) — so we do **NOT** need the WebSocket in
  production. The WS endpoint (`/v1/agent/stream`) stays available for local dev only.
- The backend origin becomes a **server-only** env var (`BACKEND_ORIGIN`), never `NEXT_PUBLIC_*`.

**Graceful-degradation contract (unchanged, mandatory):** every backend call must fall back to mock
data on failure. The portfolio must NEVER show a broken state to a hiring manager. When `BACKEND_ORIGIN`
is unset or the droplet is down, the proxy returns a fast error and the client renders mocks +
fires a one-time "demo mode" toast.

---

## Phase 0 — Documentation Discovery (Allowed APIs)

**Goal:** establish the exact, verified backend contract so later phases copy real shapes, not invented ones.
This phase is **reference only** — no code changes. Source of truth = the FastAPI source, not the README
(the README still shows several endpoints as `501`; they are in fact implemented).

### Allowed backend endpoints (verified against source)

| Method | Path | Request | Response (key fields) | Source |
|---|---|---|---|---|
| GET | `/health` | — | `{status, version, uptime_seconds}` | [models.py:304-319](../backend/app/models.py) |
| GET | `/ready` | — | `{status, dependencies:{postgres,redis,neo4j}}` | [models.py:322-335](../backend/app/models.py) |
| POST | `/v1/rag/query` | `{query, top_k=5, show_pipeline=false, source_filter=null}` | `{query, answer, chunks[], pipeline[], total_latency_ms}` | [rag.py:63-145](../backend/app/routers/rag.py), [models.py:219-238](../backend/app/models.py) |
| POST | `/v1/rag/embed` | `{text}` | `{embedding[384], dimensions, model, latency_ms}` | [rag.py:153-172](../backend/app/routers/rag.py) |
| GET | `/v1/rag/documents` | — | `{documents[{source,chunk_count,latest_update}], total_chunks}` | [rag.py:180-205](../backend/app/routers/rag.py) |
| GET | `/v1/rag/embeddings/3d` | — | `{points[{id,x,y,z,text_preview,source}], method, dimensions, cached}` | [rag.py:287-334](../backend/app/routers/rag.py) |
| POST | `/v1/agent/orchestrate` | `{message, session_id (UUID), context?}` | **SSE stream** (see below) | [agent.py:60-100](../backend/app/routers/agent.py) |
| GET | `/v1/stats` | — | `{total_requests, requests_today, p95_latency_ms, error_rate, uptime_seconds, uptime_percent, agent_interactions_today, active_sessions, cache_hit_rate}` | [stats.py:47-97](../backend/app/routers/stats.py) |
| GET | `/v1/stats/github` | — | `{public_repos, ..., source}` (shape varies — see anti-patterns) | [stats.py:100-149](../backend/app/routers/stats.py) |
| WS | `/v1/agent/stream?session_id=<id>` | — | frames `{type:'step'\|'token'\|'done'\|'ping', data}` | [ws.py:85-112](../backend/app/routers/ws.py) — **local dev only, do not use on Vercel** |

### SSE event contract for `/v1/agent/orchestrate` (the showpiece)

The stream yields these named events ([agent.py:71-91](../backend/app/routers/agent.py)):

- `event: step` → `data:` = `AgentStepEvent`:
  `{type, status, data, latency_ms, timestamp}` where
  `type ∈ {classify, route, tool_call, retrieve, generate, synthesize, memory}` and
  `status ∈ {pending, active, complete, error}` ([models.py:95-126](../backend/app/models.py)).
  Per-type `data` payloads (use for the trace UI): classify → `{intent, confidence}`,
  route → `{agent, reason}`, tool_call → `{tool, input, result_count, latency_ms}`,
  retrieve → `{chunk_count, top_score}`, generate → `{model, tokens}`.
- `event: token` → `data:` = `{text}` (append for the typing effect).
- `event: done` → `data:` = `{total_latency_ms, tokens_used, model}` ([models.py:137-152](../backend/app/models.py)).
- `event: error` → `data:` = `{message, code}`.

### Frontend types that already mirror the contract

`src/lib/types.ts` already defines `AgentStep`, `AgentStepType`, `StepStatus`, `RAGResult`,
`RAGPipelineStep`, `EmbeddingPoint`, `MetricCard`, `ChatMessage`
([types.ts](../src/lib/types.ts)). Reuse these; extend, don't duplicate.

### Existing patterns to COPY (not reinvent)

- `withMockFallback(realCall, mockCall, label)` — [api-client.ts:82-98](../src/lib/api-client.ts).
- `fetchJSON<T>(path, init)` with `AbortController` timeout — [api-client.ts:50-76](../src/lib/api-client.ts).
- Wire-shape mappers `toRAGResult` / `toEmbeddingPoint` — [api-client.ts:157-202](../src/lib/api-client.ts).
- Mock generators in [mock-data.ts](../src/lib/mock-data.ts) (already named `getMock*` — **no `_mock`
  rename needed**, the original prompt's step 2 is obsolete here).
- Live-series + jitter hooks already in [LabDemos.tsx:29-54](../src/components/landing/LabDemos.tsx) and
  [MetricsExtra.tsx:14-54](../src/components/landing/MetricsExtra.tsx) — reuse as the *between-poll* /
  fallback animation.
- Chart primitives `TrendChart`, `BarsChart`, `DonutChart`, `CornerGlowCard`
  ([src/components/charts](../src/components/charts), [src/components/ui/CornerGlowCard.tsx](../src/components/ui/CornerGlowCard.tsx)) —
  already used with the exact prop shapes; just feed them real data.

### Anti-patterns to AVOID

- ❌ **Do NOT invent a chaos endpoint.** There is no `/v1/chaos/*`. `ChaosLabDemo` and `ChaosMiniSim`
  stay client-side simulations. `getChaosMetrics()` remains mock-only.
- ❌ **Do NOT expose the droplet via `NEXT_PUBLIC_API_URL`.** That leaks the IP and reintroduces
  mixed-content. Backend origin is server-only (`BACKEND_ORIGIN`); the browser only ever calls `/api/*`.
- ❌ **Do NOT open a browser WebSocket to the droplet from production.** Mixed content + Vercel can't
  proxy WS. Drive the trace from SSE `step` events instead.
- ❌ **Do NOT assume `/v1/stats/github` always returns `contributions_last_year`/`top_languages`.**
  The live path returns `{public_repos, followers, following, name, bio, source}`; only the static
  fallback returns `{public_repos, contributions_last_year, top_languages, source}`
  ([stats.py:32-37,131-138](../backend/app/routers/stats.py)). The mapper must handle both and
  default missing fields.
- ❌ **Do NOT let any backend failure throw to the UI.** Always route through `withMockFallback` (JSON)
  or the streaming generator's `try/catch → yield mock` path (SSE).
- ❌ **Do NOT swallow errors silently.** `console.warn` + fire the `swarajos:demo-mode` event.

### Phase 0 verification

- [ ] Backend reachable locally: `cd backend && uvicorn app.main:app --reload` then
      `curl http://localhost:8000/health` → `{"status":"ok",...}`.
- [ ] Confirm the agent stream emits steps:
      `curl -N -X POST http://localhost:8000/v1/agent/orchestrate -H 'Content-Type: application/json'
      -d '{"message":"What did Swaraj build at Amazon?","session_id":"00000000-0000-0000-0000-000000000001"}'`
      → observe `event: step` … `event: token` … `event: done`.
- [ ] Confirm stats increments: `curl http://localhost:8000/v1/stats` twice; `total_requests` rises.

---

## Phase 1 — Transport layer: proxy routes + server-only config

**Goal:** introduce same-origin `/api/*` proxies and a server-only backend origin, so the browser
never touches the droplet directly. No UI changes yet.

### Tasks

1. **Env config.**
   - Add server-only `BACKEND_ORIGIN` (no `NEXT_PUBLIC_`). Local `.env.local`:
     ```
     BACKEND_ORIGIN=http://localhost:8000
     ```
   - Update [.env.example](../.env.example): replace the `NEXT_PUBLIC_API_URL` block with a
     `BACKEND_ORIGIN` block documenting local (`http://localhost:8000`) and prod
     (`http://<DROPLET_IP>:8000`) values, and a note that unset → mock-only mode.
   - Add a tiny helper `src/lib/server/backend.ts` exporting
     `getBackendOrigin(): string | null` (reads `process.env.BACKEND_ORIGIN`, trims trailing slash,
     returns `null` if unset).

2. **JSON proxy route handler factory.** Create `src/app/api/_proxy.ts` (shared, server-only) with a
   `proxyJson(req, upstreamPath, init?)` that: returns `503 {error:'backend-unconfigured'}` when
   `getBackendOrigin()` is null; else `fetch`es `${origin}${upstreamPath}` with a 30s `AbortController`
   timeout, forwarding method + body; returns the upstream JSON (or a `502` on upstream failure).
   Pattern mirrors [api-client.ts fetchJSON:50-76](../src/lib/api-client.ts), but server-side.

3. **Create the JSON proxy routes** (each a 1-line call into `proxyJson`):
   - `src/app/api/rag/query/route.ts` → POST `/v1/rag/query`
   - `src/app/api/rag/embed/route.ts` → POST `/v1/rag/embed`
   - `src/app/api/rag/documents/route.ts` → GET `/v1/rag/documents`
   - `src/app/api/rag/embeddings-3d/route.ts` → GET `/v1/rag/embeddings/3d`
   - `src/app/api/stats/route.ts` → GET `/v1/stats`
   - `src/app/api/stats/github/route.ts` → GET `/v1/stats/github`

4. **Create the streaming agent proxy** `src/app/api/agent/route.ts`:
   - `export const runtime = 'edge';` and `export const dynamic = 'force-dynamic';`
     (Edge supports response streaming and longer stream durations than the default Node function).
   - POST handler: if no `BACKEND_ORIGIN` → `503`. Else `fetch(`${origin}/v1/agent/orchestrate`, {method:'POST', body, headers:{'Content-Type':'application/json'}})` and return a new
     `Response(upstream.body, {headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}})` — i.e. **pipe the SSE body straight through** untouched.

5. **Repoint `api-client.ts` at same-origin `/api/*`.**
   - Replace `API_BASE_URL` (which read `NEXT_PUBLIC_API_URL`) with a constant base of `'/api'` and
     drop the `isBackendConfigured` gate on the browser side (the *proxy* now decides config; the client
     just calls `/api/*` and falls back to mock on any non-2xx).
   - Update existing paths: `/v1/rag/query` → `/api/rag/query`, `/v1/rag/embed` → `/api/rag/embed`,
     `/v1/rag/embeddings/3d` → `/api/rag/embeddings-3d`, `/v1/rag/documents` → `/api/rag/documents`.
   - Keep `withMockFallback` exactly as-is — it already does the right thing.

6. **Add the demo-mode event.** In `api-client.ts`, add (copy from the original prompt's `notifyDemoMode`):
   ```ts
   let demoModeNotified = false;
   export function notifyDemoMode(reason: string) {
     if (typeof window === 'undefined' || demoModeNotified) return;
     demoModeNotified = true;
     window.dispatchEvent(new CustomEvent('swarajos:demo-mode', { detail: { reason } }));
     console.warn('[swarajos] demo mode:', reason);
   }
   ```
   Call `notifyDemoMode(label)` inside the `catch` of `withMockFallback` (and later in the streaming
   generator's fallback).

### Phase 1 verification

- [ ] `npm run dev`, backend up. `curl http://localhost:3000/api/stats` → real stats JSON (proxied).
- [ ] `curl -N -X POST http://localhost:3000/api/agent -H 'Content-Type: application/json' -d '{"message":"hi","session_id":"00000000-0000-0000-0000-000000000002"}'` → SSE frames stream through.
- [ ] Unset `BACKEND_ORIGIN`, restart: `/api/stats` → `503`; existing `/portfolio` page still renders
      (mock fallback), no console errors beyond the demo-mode warn.
- [ ] `grep -rn "NEXT_PUBLIC_API_URL" src` → **no results** (fully migrated to server-side origin).
- [ ] `npm run build` succeeds; `grep -rn "http://" src/components` → no hardcoded droplet URLs.

### Anti-pattern guards

- Route handlers must NOT import client components or `mock-data`. Proxies are pure pass-through.
- Do not add CORS headers to the proxy — it's same-origin by construction.

---

## Phase 2 — Agent SSE client + `useAgentChat` hook

**Goal:** a typed streaming generator + a React hook that yields the answer tokens AND the reasoning
steps from one SSE stream.

### Tasks

1. **`streamAgent()` in `api-client.ts`** — async generator over `/api/agent`:
   ```ts
   export type AgentEvent =
     | { type: 'step'; data: AgentStep }
     | { type: 'token'; data: { text: string } }
     | { type: 'done'; data: { total_latency_ms: number; tokens_used: number; model: string } }
     | { type: 'error'; data: { message: string; code?: string } };

   export async function* streamAgent(message: string, sessionId: string):
     AsyncGenerator<AgentEvent> { ... }
   ```
   - Copy the **fetch + ReadableStream + buffer/`event:`/`data:` parse loop** from the original prompt's
     step 3 (it is correct), but POST to `/api/agent` and parse the `event:`/`data:` lines into the
     `AgentEvent` union. Map the backend `AgentStepEvent` → frontend `AgentStep` (add an `id`, e.g.
     `${type}-${index}`; the frontend `AgentStepType` is the narrower set — pass through unknown types
     or drop `synthesize`/`memory` if the UI doesn't render them).
   - On `!res.ok` / `!res.body` / thrown error → `notifyDemoMode('Agent backend unavailable')` then
     `yield*` a **mock generator** that emits a few fake `step` events followed by `token` chunks of a
     canned answer (reuse the `ChatDock` regex replies as the canned text). This preserves the
     streaming UX offline.

2. **`src/lib/hooks/useAgentChat.ts`** — copy the hook from the original prompt's step 5, adapted:
   - State: `messages: ChatMessage[]`, `agentSteps: AgentStep[]`, `isLoading`, `error`, `sessionId`.
   - `sessionId`: `crypto.randomUUID()` held in `useState` initializer; **React state only — do NOT use
     sessionStorage** (project rule in [CLAUDE.md](../CLAUDE.md): "No localStorage or sessionStorage").
   - `sendMessage(text)`: push user msg, push empty streaming assistant msg, iterate `streamAgent`,
     append `step` events to `agentSteps`, accumulate `token` text into the last assistant message,
     finalize on `done`, set `error` on `error`.
   - `clearHistory()`: reset messages + steps (no storage to clear).
   - Return `{ messages, agentSteps, isLoading, error, sessionId, sendMessage, clearHistory }`.

### Phase 2 verification

- [ ] Add a throwaway test page or use the existing ChatDock (Phase 3) to call `sendMessage("What did
      Swaraj build at Amazon?")`; confirm `agentSteps` populates with classify→route→tool_call→generate
      and the assistant message text streams in.
- [ ] Kill the backend → `sendMessage` still streams the canned mock answer + fake steps; demo-mode
      toast fires once.
- [ ] `npx tsc --noEmit` clean (no `any`, all step types covered).

### Anti-pattern guards

- No `sessionStorage`/`localStorage`. No `any`. No default exports (project conventions in CLAUDE.md).
- The generator must never throw to the caller — all failures convert to the mock `yield*`.

---

## Phase 3 — Wire `ChatDock` to the live agent

**Goal:** the floating SwarajOS dock streams real answers + shows a live reasoning trace, with the
current canned replies demoted to the offline fallback.

### Tasks (edit [ChatDock.tsx](../src/components/landing/ChatDock.tsx))

1. Replace the local `reply()`/`setTimeout` mock send ([ChatDock.tsx:50-60](../src/components/landing/ChatDock.tsx))
   with `useAgentChat()`. Map its `messages` to the existing `Msg` bubble rendering (keep the Avatar,
   typing-bubble, suggestions, composer markup — only swap the data source).
2. Drive the typing indicator off `isLoading`; stream assistant tokens into the active bubble.
3. **Add a compact live reasoning trace** above/below the active assistant bubble: render `agentSteps`
   as small rows (`classify · intent · 0.94`, `route · experience_navigator`,
   `tool_call · vector_search · 45ms`, `generate · claude-sonnet-4 · N tok`). Reuse the existing
   `.trace`/`.t` markup already shown statically in [Landing.tsx:270-275](../src/components/landing/Landing.tsx)
   and [LabDemos.tsx:178-183](../src/components/landing/LabDemos.tsx) so styling is free.
4. On `error`, show an inline error bubble with a "Try again" affordance that re-sends the last user message.
5. Make the footer hint conditional: real backend → `"SwarajOS · live multi-agent · LangGraph"`;
   after a demo-mode event → keep the "demo agent · canned responses" copy. (Listen for
   `swarajos:demo-mode`, or read a flag exported from api-client.)

### Phase 3 verification

- [ ] `npm run dev`; open the dock; ask "What did Swaraj build at Amazon?" → answer streams in, trace
      rows appear live, citations/numbers come from the backend.
- [ ] Network tab shows the request to `/api/agent` (same-origin), **not** to the droplet.
- [ ] Stop the backend → dock still answers (canned), trace shows fake steps, footer flips to demo copy.
- [ ] Reduced-motion: no layout jank; `prefers-reduced-motion` respected.

### Anti-pattern guards

- Keep ChatDock a single chat affordance (don't also mount the old `ChatButton`/`ChatPanel`).
- Don't block the input while a previous stream is mid-flight beyond the existing `typing` guard.

---

## Phase 4 — Wire the Lab modal demos (Agent + RAG)

**Goal:** `AgentDemo` and `RagDemo` modals use real endpoints; Chaos + Realtime stay simulated.

### Tasks (edit [LabDemos.tsx](../src/components/landing/LabDemos.tsx))

1. **`AgentDemo`** ([LabDemos.tsx:139-187](../src/components/landing/LabDemos.tsx)): replace the
   `REPLIES` lookup `send()` with `useAgentChat()`. Stream the answer into the thread; update the
   intent `DonutChart` from the **real** `classify` step `data.intent`/`confidence`; populate the
   trace island from live `agentSteps` instead of the static four rows.
2. **`RagDemo`** ([LabDemos.tsx:196-227](../src/components/landing/LabDemos.tsx)): on "Run query again",
   call a new `queryRAG(query, { showPipeline:true })` (the existing `queryRAG` already hits
   `/api/rag/query` after Phase 1's repoint — just thread a real query string, e.g. a fixed demo query
   or a small input). Feed the returned `pipeline[]` stage latencies into the existing `BarsChart` and
   the `.rag` step rows; show `total_latency_ms`. Fall back to the current jittered `RAG_BASE` on failure.
3. **`ChaosLabDemo` + `RealtimeDemo`**: leave as-is. Add a one-line code comment in each:
   `// Client-side simulation — no backend endpoint exists (see backend-wiring-plan Phase 0).`
   Optionally soften the `RealtimeDemo` note copy so it doesn't over-claim a live socket.

### Phase 4 verification

- [ ] Open the **SwarajOS** bento card → modal streams a real answer; intent donut shifts to the
      backend-returned intent; trace is live.
- [ ] Open the **AI Intelligence Lab** card → "Run query again" pulls real per-stage latencies from
      `/api/rag/query`; total matches `total_latency_ms`.
- [ ] Backend down → both modals fall back to the simulation without errors.
- [ ] Chaos modal still fully interactive (kill/slow toggles) — unchanged.

### Anti-pattern guards

- Don't fabricate a chaos/realtime backend. Don't remove the simulations — they're the fallback AND the
  intended behavior for those two demos.

---

## Phase 5 — Live metrics & stats

**Goal:** the `#metrics` section + the stat KPIs reflect real `/api/stats` data, animating between polls.

### Tasks

1. **`getStats()` + `getGitHubStats()` in `api-client.ts`** (copy the `withMockFallback` shape):
   - `getStats(): Promise<StatsSnapshot>` → `/api/stats`; mock fallback returns the same shape with the
     current hardcoded landing numbers (142ms p95, 847 agent chats, etc.).
   - `getGitHubStats()` → `/api/stats/github`; **handle both response shapes** (Phase 0 anti-pattern) —
     read `public_repos`, and `top_languages ?? []`, `contributions_last_year ?? null`.
   - Wire `getObservabilityMetrics()` (currently mock-only at [api-client.ts:233-238](../src/lib/api-client.ts))
     to map a `StatsSnapshot` → `MetricCard[]`.
2. **`src/lib/hooks/useLiveStats.ts`**: polls `getStats()` on mount + every 30s via
   `useEffect`+`setInterval` (clear on unmount); exposes `{ stats, isLive, lastUpdated }`. `isLive` =
   whether the last fetch came from the backend (set `false` after a demo-mode event).
3. **Wire the UI** in [Landing.tsx](../src/components/landing/Landing.tsx):
   - KPI cards at [Landing.tsx:329-331](../src/components/landing/Landing.tsx): bind p95 → `p95_latency_ms`,
     "agent chats today" → `agent_interactions_today`. (Keep "deploys this week" static — not in the API.)
   - The `#stats` count-up at [Landing.tsx:177-184](../src/components/landing/Landing.tsx): the
     "this site's uptime" stat can read `uptime_percent`; leave the résumé stats (4+ yrs, 50M+, 1800+)
     static — they're biographical, not telemetry.
   - Add a small "live" vs "demo mode" badge (accent-teal pulse when `isLive`, accent-gold "Demo mode"
     otherwise) on the metrics header.
4. **`MetricsExtra` / `MetricsChart`**: keep the smooth jittered animation as the visual, but seed/anchor
   it to real values from `useLiveStats` (e.g. center the p95 line on `p95_latency_ms`, the intent donut
   from a future intents endpoint or leave mocked). Add "Last updated: Xs ago" muted footer.
   Note: there is **no per-minute request timeseries endpoint** — `MetricsChart`'s 24-point series stays
   synthetic, anchored to real current totals; do not invent a history endpoint.

### Phase 5 verification

- [ ] `#metrics` p95 + agent-chats KPIs match `curl http://localhost:3000/api/stats`.
- [ ] Open the dock, send a few messages → `agent_interactions_today` ticks up within the 30s poll.
- [ ] Backend down → KPIs hold last/mock values, badge flips to "Demo mode", no errors.
- [ ] "Last updated" footer counts up and resets on each successful poll.

### Anti-pattern guards

- Don't poll faster than 30s (backend rate-limits `/v1/stats` at 60/min).
- Don't claim a metric is live if it's synthetic (request-history chart) — only badge real fields.

---

## Phase 6 — Demo-mode toast (global)

**Goal:** a one-time, unobtrusive "demo mode" toast so a degraded backend is honest but not alarming.

### Tasks

1. Create `src/components/ui/DemoModeToast.tsx` (copy the original prompt's step 11 behavior):
   - `'use client'`; listens for the `swarajos:demo-mode` window event.
   - Slides up from bottom, auto-dismiss after 5s, copy: *"Running in demo mode — backend offline"*.
   - Shows once per page load (module-level flag; **no sessionStorage** per project rule).
   - Use GSAP or a CSS transition to match the landing's motion language (the landing uses GSAP, not
     Framer Motion — prefer CSS/GSAP here for consistency).
2. Mount it once in [src/app/layout.tsx](../src/app/layout.tsx) so it's available on every route
   (landing, `/portfolio`, `/lab/*`).

### Phase 6 verification

- [ ] With backend down, loading `/` and interacting with the dock shows the toast exactly once.
- [ ] With backend up, the toast never appears.
- [ ] Toast respects `prefers-reduced-motion` (no slide, just fade/instant).

---

## Phase 7 — Production env, deploy & full-loop verification

**Goal:** ship to Vercel against the droplet and prove the end-to-end loop both online and offline.

### Tasks

1. **Vercel env var** (Project → Settings → Environment Variables, **Production**):
   ```
   BACKEND_ORIGIN = http://<DROPLET_IP>:8000
   ```
   (Server-only — NOT `NEXT_PUBLIC_*`. This is why HTTP droplet works: the fetch happens server-side on
   Vercel, so there's no browser mixed-content block.)
   - **Recommended hardening (note for later):** put the droplet behind the existing
     [Caddyfile](../backend/Caddyfile) with a real cert (e.g. `api.swarajbangar.dev`) and switch
     `BACKEND_ORIGIN` to `https://...`. Not required for this phase since the proxy is server-side.
2. **Backend CORS** ([backend/.env.example:39](../backend/.env.example)) already lists
   `https://swarajbangar-dev.vercel.app,http://localhost:3000`. With the proxy, CORS is moot for the
   browser, but keep it correct for `/docs` and any direct curl.
3. **Deploy:** commit on `feat/design-system`, push; Vercel auto-builds. (Or
   `git commit --allow-empty -m "chore: trigger deploy" && git push`.)

### Full-loop verification (the acceptance test)

1. Local: `cd backend && docker compose up -d` (or `uvicorn app.main:app --reload`).
2. Local: `npm run dev` → http://localhost:3000.
3. Open the chat dock → "What did Swaraj build at Amazon?"
   → reasoning trace shows `classify → route → tool_call → generate` live.
4. Answer streams in token-by-token with backend-sourced facts.
5. `#metrics` request/agent counters increment within 30s as you chat.
6. Open the **Backend Chaos Lab** card → kill a service → charts re-shape (client sim, expected).
7. **Kill the backend** (`docker compose down`), reload `/`:
   → dock falls back to canned streaming answer, metrics hold/mock, **demo-mode toast appears once**.
8. `git push` → Vercel deploys.
9. Open https://swarajbangar-dev.vercel.app and repeat 3–5 against the droplet:
   - DevTools Network shows calls to `/api/agent`, `/api/stats` (same-origin) — **no `http://<droplet>`
     request, no mixed-content error in console.**
   - If the droplet is unreachable, the prod site shows demo mode, never a broken state.

### Final cross-checks (anti-pattern sweep)

- [ ] `grep -rn "NEXT_PUBLIC_API_URL\|NEXT_PUBLIC_WS_URL" src` → no results.
- [ ] `grep -rn "ws://\|new WebSocket" src` → only local-dev-guarded code, never reached in prod.
- [ ] `grep -rn "http://" src/components src/app` → no hardcoded backend URLs.
- [ ] `grep -rn "sessionStorage\|localStorage" src` → none added by this work.
- [ ] `grep -rn "/v1/" src` → only inside `src/app/api/**` proxy routes (server-side); never in components.
- [ ] `npm run build` and `npx tsc --noEmit` clean; `npm run lint` clean.
- [ ] No `any`, no default exports, no direct `mock-data` imports in components (CLAUDE.md conventions).

---

## File-change summary (for the executor)

**New files**
- `src/lib/server/backend.ts` — `getBackendOrigin()`
- `src/app/api/_proxy.ts` — `proxyJson()` factory
- `src/app/api/rag/query/route.ts`, `.../rag/embed/route.ts`, `.../rag/documents/route.ts`, `.../rag/embeddings-3d/route.ts`
- `src/app/api/stats/route.ts`, `src/app/api/stats/github/route.ts`
- `src/app/api/agent/route.ts` (Edge, SSE pass-through)
- `src/lib/hooks/useAgentChat.ts`
- `src/lib/hooks/useLiveStats.ts`
- `src/components/ui/DemoModeToast.tsx`

**Edited files**
- `src/lib/api-client.ts` — repoint to `/api/*`, add `notifyDemoMode`, `streamAgent`, `getStats`,
  `getGitHubStats`, wire `getObservabilityMetrics`
- `src/lib/types.ts` — add `AgentEvent`, `StatsSnapshot` (if not derivable)
- `src/components/landing/ChatDock.tsx` — use `useAgentChat` + live trace
- `src/components/landing/LabDemos.tsx` — wire `AgentDemo` + `RagDemo`; comment Chaos/Realtime sims
- `src/components/landing/Landing.tsx` — live KPIs + live/demo badge
- `src/components/landing/MetricsExtra.tsx` / `MetricsChart.tsx` — anchor to `useLiveStats`
- `src/app/layout.tsx` — mount `<DemoModeToast />`
- `.env.example` — `BACKEND_ORIGIN` (replace `NEXT_PUBLIC_API_URL`)

**Untouched by design**
- Chaos + Realtime simulations, `getChaosMetrics()` (no backend endpoint).
- The old `/portfolio` page (out of scope per decision #2) — it keeps working via existing mock fallbacks.

---

## Phasing / dependency order

```
Phase 0 (reference) ─┐
Phase 1 (proxies+config) ─→ Phase 2 (SSE client+hook) ─→ Phase 3 (ChatDock)
                          └─→ Phase 4 (Lab modals)  [needs Phase 2]
                          └─→ Phase 5 (stats/metrics) [needs Phase 1]
Phase 6 (toast) [needs Phase 1's demo-mode event]
Phase 7 (deploy+verify) [needs all]
```
Phases 3, 4, 5, 6 are independent of each other once 1–2 land and can be done in any order or parallel.

---

## AS-BUILT (implemented) & deployment

All phases shipped on `feat/design-system`. Notable as-built decisions vs. the original draft:

- **Transport:** browser → same-origin Next.js Route Handlers under `src/app/api/*` → backend.
  Backend origin is the **server-only** `BACKEND_ORIGIN` env (never `NEXT_PUBLIC_*`). Helpers live in
  `src/lib/server/{backend,proxy}.ts`. The agent stream proxy (`/api/agent`) runs on the **Node runtime**
  (`maxDuration = 30`) and pipes the upstream SSE body straight through.
- **Reasoning trace** is driven entirely from the SSE `step` events — no browser WebSocket in production.
- **Backend additions:** `GET /v1/stats/timeseries` + `/v1/stats/intents`, `p50_latency_ms` on `/v1/stats`,
  a `stats:history` sampler in the 60s loop, and per-intent counters (`agent:intents` hash).
- **Dropped:** `getGitHubStats` / `/api/stats/github` (no consumer on the new landing).
- **Graceful degradation everywhere:** every call falls back to mock; the first fallback fires
  `swarajos:demo-mode`, surfaced once by `DemoModeToast` (mounted in `app/layout.tsx`). Charts with no
  backend history self-animate synthetically and badge "demo mode".

### Local dev

```bash
# 1. backend
cd backend && cp .env.example .env   # fill creds
uvicorn app.main:app --reload        # or: docker compose up -d   → :8000

# 2. frontend
echo 'BACKEND_ORIGIN=http://localhost:8000' > .env.local
npm run dev                          # → http://localhost:3000
```

Without `.env.local` the proxies return 503 and the whole site runs on mock data (demo mode) — useful
for frontend-only work.

### Production (Vercel)

1. Vercel → Project → Settings → Environment Variables → **Production**:
   `BACKEND_ORIGIN = http://<DROPLET_IP>:8000` (server-only; this is why a plain-HTTP droplet works
   behind the HTTPS site — the fetch happens server-side, no mixed content).
2. Redeploy the **backend** (droplet) so the new `/v1/stats/*` endpoints + intent counters are live.
3. Push `feat/design-system` → Vercel auto-builds.
4. **Risk to watch:** Vercel Hobby caps function duration ~10s; agent runs are ~2–6s. If a slow Sonnet
   call truncates, raise the plan or `maxDuration`. Optional hardening: put the droplet behind the
   existing Caddyfile with TLS and switch `BACKEND_ORIGIN` to `https://…`.

### Verification status

- `npm run build` ✓ (all 8 `/api/*` routes registered as dynamic functions; static pages prerender).
- `npx tsc --noEmit` ✓ · ESLint ✓ for all changed files.
- In-browser (offline / mock path): ChatDock streams + live trace + `[Source:]` pills + demo footer;
  AgentDemo + RagDemo wired; metrics show mock values + "demo mode" badge; demo toast fires once.
- **Pending live check:** end-to-end against the running backend (started in this session against mocks
  only) — run the full loop in the Verification section above once the droplet is reachable.
- **Pre-existing (out of scope):** `src/components/ui/Reveal.tsx` trips `react-hooks/set-state-in-effect`
  (from commit 16cd0f5, unrelated to this work).
