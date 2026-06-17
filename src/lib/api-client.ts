// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — API Client
// Typed async wrappers. Each function calls the same-origin `/api/*`
// proxy (which forwards to the backend server-side), then falls back to
// mock data on any failure. That way:
//   - Backend reachable (BACKEND_ORIGIN set, server up) → real data.
//   - Backend offline / not configured                  → mock data, no crash.
// Components import from here, never from mock-data.ts directly.
// ═══════════════════════════════════════════════════════════════

import type {
  AgentEvent,
  AgentStep,
  AgentStepType,
  BlogPost,
  CaseStudy,
  ChaosMetrics,
  ChatMessage,
  EmbeddingPoint,
  ExperienceEntry,
  IntentCount,
  MetricCard,
  RAGResult,
  SkillNode,
  StatsSnapshot,
  StatsTimeseriesPoint,
  StepStatus,
} from './types';
import {
  getMockAgentAnswer,
  getMockAgentSteps,
  getMockBlogPosts,
  getMockCaseStudies,
  getMockChaosMetrics,
  getMockChatResponse,
  getMockEmbeddingPoints,
  getMockExperience,
  getMockIntents,
  getMockObservabilityMetrics,
  getMockRAGResult,
  getMockSkills,
  getMockStats,
  getMockStatsTimeseries,
} from './mock-data';
import { sleep } from './utils';

// ─── Backend connection ──────────────────────────────────────────

// The browser never calls the backend directly — it calls same-origin
// Next.js route handlers under `/api/*`, which proxy to the FastAPI backend
// server-side (the droplet is plain-HTTP, so a direct browser call from an
// HTTPS page would be blocked as mixed content). When the proxy can't reach
// the backend it returns 5xx, and each wrapper falls back to mock data.
const API_BASE_URL = '/api';

/** Always true now that calls go through the same-origin proxy. */
export const isBackendConfigured = true;

const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Demo-mode notification ──────────────────────────────────────

// Fired once per page load the first time any backend call falls back to
// mock data, so the UI can surface a single unobtrusive "demo mode" toast.
let demoModeNotified = false;

/** Announce that we've degraded to mock data (once per page load). */
export function notifyDemoMode(reason: string): void {
  if (typeof window === 'undefined' || demoModeNotified) return;
  demoModeNotified = true;
  window.dispatchEvent(
    new CustomEvent('swarajos:demo-mode', { detail: { reason } })
  );
  console.warn('[swarajos] demo mode — using mock data:', reason);
}

/**
 * Fetch JSON from the backend with a hard timeout.  Throws on non-2xx
 * or transport failure — the *caller* decides whether to fall back to
 * mocks (so we never silently mask a real production bug).
 */
async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Backend ${res.status} ${res.statusText} on ${path}: ${text.slice(0, 200)}`
      );
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap a backend call with a mock fallback.  Logs a warning on failure
 * (so we see the error in the browser console) but never throws.
 */
async function withMockFallback<T>(
  realCall: () => Promise<T>,
  mockCall: () => T | Promise<T>,
  label: string
): Promise<T> {
  try {
    return await realCall();
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn(`[api-client] ${label} failed, using mock:`, err);
    }
    notifyDemoMode(`${label} unavailable`);
    return await mockCall();
  }
}

// ─── Backend response shapes (subset of what FastAPI returns) ──────

interface BackendRAGChunk {
  id: string;
  text: string;
  source: string;
  score: number;
  metadata: Record<string, unknown>;
  vector_score?: number | null;
  bm25_score?: number | null;
  reranker_score?: number | null;
}

interface BackendRAGPipelineStep {
  step: 'embed' | 'retrieve' | 'vector_search' | 'bm25_search' | 'fuse' | 'rerank' | 'generate';
  status: 'pending' | 'active' | 'complete' | 'error';
  data: Record<string, unknown>;
  latency_ms: number | null;
}

interface BackendRAGQueryResponse {
  query: string;
  answer: string;
  chunks: BackendRAGChunk[];
  pipeline: BackendRAGPipelineStep[];
  total_latency_ms: number;
}

interface BackendEmbed3DPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  text_preview: string;
  source: string;
}

interface BackendEmbed3DResponse {
  points: BackendEmbed3DPoint[];
  method: 'umap';
  dimensions: 3;
  cached: boolean;
}

interface BackendDocumentSummary {
  source: string;
  chunk_count: number;
  latest_update: string | null;
}

interface BackendDocumentsResponse {
  documents: BackendDocumentSummary[];
  total_chunks: number;
}

// ─── Wire shape mappers (backend → frontend types) ─────────────────

function toRAGResult(r: BackendRAGQueryResponse): RAGResult {
  // Keep only the frontend's narrower step names; drop the granular
  // retrieve sub-steps if the backend ever starts emitting them.
  const knownSteps = new Set(['embed', 'retrieve', 'rerank', 'generate']);
  return {
    query: r.query,
    answer: r.answer,
    chunks: r.chunks.map((c) => ({
      id: c.id,
      text: c.text,
      source: c.source,
      score: c.score,
      metadata: c.metadata ?? {},
    })),
    pipeline: r.pipeline
      .filter((s) => knownSteps.has(s.step))
      .map((s) => ({
        step: s.step as RAGResult['pipeline'][number]['step'],
        status: s.status,
        data: s.data ?? {},
        latency_ms: s.latency_ms ?? 0,
      })),
    totalLatency: r.total_latency_ms,
  };
}

// Stable per-text-source category mapping for the 3D explorer scatter.
const SOURCE_TO_CATEGORY: Record<string, string> = {
  resume: 'backend',
  case_study: 'ai-ml',
  about: 'ai-ml',
  project: 'backend',
  blog: 'frontend',
};

function toEmbeddingPoint(p: BackendEmbed3DPoint): EmbeddingPoint {
  return {
    id: p.id,
    x: p.x,
    y: p.y,
    z: p.z,
    text: p.text_preview,
    source: p.source,
    category: SOURCE_TO_CATEGORY[p.source] ?? 'tools',
  };
}

// ═══════════════════════════════════════════════════════════════
// ── Public API ──
// ═══════════════════════════════════════════════════════════════

export async function getExperience(): Promise<readonly ExperienceEntry[]> {
  await sleep(300);
  return getMockExperience();
}

export async function getSkills(): Promise<readonly SkillNode[]> {
  await sleep(200);
  return getMockSkills();
}

export async function getChaosMetrics(): Promise<ChaosMetrics> {
  await sleep(400);
  return getMockChaosMetrics();
}

export async function getBlogPosts(): Promise<readonly BlogPost[]> {
  await sleep(200);
  return getMockBlogPosts();
}

export async function getCaseStudies(): Promise<readonly CaseStudy[]> {
  await sleep(200);
  return getMockCaseStudies();
}

export async function getObservabilityMetrics(): Promise<
  readonly MetricCard[]
> {
  await sleep(300);
  return getMockObservabilityMetrics();
}

// ═══════════════════════════════════════════════════════════════
// ── Live stats (returns a live/mock flag for the UI badge) ──
// ═══════════════════════════════════════════════════════════════

/**
 * Like withMockFallback, but also reports whether the data came from the
 * backend (`live: true`) or a mock fallback — the metrics UI uses this to
 * render a "live" vs "demo mode" badge.
 */
async function liveOrMock<T>(
  realCall: () => Promise<T>,
  mockCall: () => T,
  label: string
): Promise<{ data: T; live: boolean }> {
  try {
    return { data: await realCall(), live: true };
  } catch (err) {
    console.warn(`[api-client] ${label} failed, using mock:`, err);
    notifyDemoMode(`${label} unavailable`);
    return { data: mockCall(), live: false };
  }
}

/** Live service snapshot for the observability KPIs. */
export function getStats(): Promise<{ data: StatsSnapshot; live: boolean }> {
  return liveOrMock(
    () => fetchJSON<StatsSnapshot>('/stats'),
    getMockStats,
    'getStats'
  );
}

/** Rolling p50/p95/request history for the timeseries chart. */
export function getStatsTimeseries(): Promise<{
  data: StatsTimeseriesPoint[];
  live: boolean;
}> {
  return liveOrMock(
    async () =>
      (await fetchJSON<{ points: StatsTimeseriesPoint[] }>('/stats/timeseries'))
        .points,
    getMockStatsTimeseries,
    'getStatsTimeseries'
  );
}

/** Agent interaction counts grouped by classified intent (donut source). */
export function getIntentDistribution(): Promise<{
  data: IntentCount[];
  live: boolean;
}> {
  return liveOrMock(
    async () =>
      (await fetchJSON<{ intents: IntentCount[] }>('/stats/intents')).intents,
    getMockIntents,
    'getIntentDistribution'
  );
}

// ─── RAG (real backend) ───────────────────────────────────────────

/**
 * Run a full RAG query with pipeline detail.  Used by the RAG X-ray
 * lab demo — returns chunks, per-stage timings, and the final answer.
 */
export async function queryRAG(query: string): Promise<RAGResult> {
  return withMockFallback(
    async () => {
      const res = await fetchJSON<BackendRAGQueryResponse>('/rag/query', {
        method: 'POST',
        body: JSON.stringify({ query, top_k: 5, show_pipeline: true }),
      });
      return toRAGResult(res);
    },
    () => getMockRAGResult(),
    'queryRAG'
  );
}

/**
 * Single-turn chat: send a user message, get an assistant reply.
 * Maps the RAG pipeline answer into a ChatMessage so the chat UI
 * doesn't need to know about chunks / pipelines.
 */
export async function chatWithAgent(
  message: string,
  sessionId: string
): Promise<ChatMessage> {
  return withMockFallback(
    async () => {
      const res = await fetchJSON<BackendRAGQueryResponse>('/rag/query', {
        method: 'POST',
        // Backend currently ignores X-Session-Id — wired now so the
        // server can group turns once session-scoped memory ships.
        headers: { 'X-Session-Id': sessionId },
        body: JSON.stringify({ query: message, top_k: 5, show_pipeline: false }),
      });
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toISOString(),
      };
    },
    () => {
      // Mock fallback keeps the chat usable when the backend is down.
      // Add a tiny artificial latency so the typing indicator gets
      // visible play — UX matters even in dev.
      return sleep(800).then(() => getMockChatResponse());
    },
    'chatWithAgent'
  );
}

// ═══════════════════════════════════════════════════════════════
// ── Agent (streaming SSE) ──
// ═══════════════════════════════════════════════════════════════

/** Map one backend AgentStepEvent → frontend AgentStep (defensive). */
function toAgentStep(raw: Record<string, unknown>): AgentStep {
  const type = String(raw.type ?? 'generate') as AgentStepType;
  const ts = String(raw.timestamp ?? new Date().toISOString());
  return {
    id: `${type}-${ts}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: String(raw.status ?? 'complete') as StepStatus,
    data: (raw.data as Record<string, unknown>) ?? {},
    latency_ms: typeof raw.latency_ms === 'number' ? raw.latency_ms : undefined,
    timestamp: ts,
  };
}

/** Map a parsed SSE (event, json) pair → an AgentEvent, or null to skip. */
function toAgentEvent(event: string, payload: unknown): AgentEvent | null {
  const data = (payload ?? {}) as Record<string, unknown>;
  switch (event) {
    case 'step':
      return { type: 'step', data: toAgentStep(data) };
    case 'token':
      return { type: 'token', data: { text: String(data.text ?? '') } };
    case 'done':
      return {
        type: 'done',
        data: {
          total_latency_ms: Number(data.total_latency_ms ?? 0),
          tokens_used: Number(data.tokens_used ?? 0),
          model: String(data.model ?? ''),
        },
      };
    case 'error':
      return {
        type: 'error',
        data: {
          message: String(data.message ?? 'Unknown agent error'),
          code: data.code != null ? String(data.code) : undefined,
        },
      };
    default:
      return null;
  }
}

/**
 * Offline fallback: replay a few canned reasoning steps, then stream a
 * canned on-topic answer as fragments, then a synthetic `done`. Keeps the
 * full streaming UX (trace + typing) when the backend is unreachable.
 */
async function* streamAgentMock(message: string): AsyncGenerator<AgentEvent> {
  for (const step of getMockAgentSteps()) {
    await sleep(180);
    yield {
      type: 'step',
      data: { ...step, id: `${step.id}-${Math.random().toString(36).slice(2, 7)}` },
    };
  }
  const answer = getMockAgentAnswer(message);
  for (let i = 0; i < answer.length; i += 18) {
    await sleep(22);
    yield { type: 'token', data: { text: answer.slice(i, i + 18) } };
  }
  yield {
    type: 'done',
    data: { total_latency_ms: 1400, tokens_used: 0, model: 'demo-mock' },
  };
}

/**
 * Stream a SwarajOS agent run as a sequence of AgentEvents.
 *
 * POSTs to the same-origin `/api/agent` proxy (Node-runtime SSE
 * pass-through to the backend's `/v1/agent/orchestrate`). The backend
 * streams the reasoning trace (`step`), the answer in fragments (`token`),
 * a final `done`, and an optional terminal `error`.
 *
 * On any transport failure it emits the `swarajos:demo-mode` event and
 * yields the canned mock stream instead — it never throws to the caller.
 */
export async function* streamAgent(
  message: string,
  sessionId: string
): AsyncGenerator<AgentEvent, void, unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    if (!res.ok || !res.body) throw new Error(`agent ${res.status}`);
  } catch (err) {
    console.warn('[api-client] streamAgent failed, using mock:', err);
    notifyDemoMode('Agent backend unavailable');
    yield* streamAgentMock(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the trailing partial line in the buffer for the next chunk.
      buffer = lines.pop() ?? '';
      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue; // skip a malformed frame rather than aborting the stream
          }
          const mapped = toAgentEvent(currentEvent, parsed);
          if (mapped) yield mapped;
        }
      }
    }
  } catch (err) {
    // Mid-stream transport drop — degrade to the mock tail rather than
    // leaving the UI stuck on a half-finished answer.
    console.warn('[api-client] streamAgent interrupted, using mock:', err);
    notifyDemoMode('Agent stream interrupted');
    yield* streamAgentMock(message);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Embed a single piece of text — 384-dim vector.  Used by the
 * embedding explorer to plot the user's query alongside the corpus.
 */
export async function embedText(text: string): Promise<readonly number[]> {
  return withMockFallback(
    async () => {
      const res = await fetchJSON<{ embedding: number[] }>('/rag/embed', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      return res.embedding;
    },
    () => {
      // Mock: deterministic-ish 384-zeros so the UI can still render.
      return Array.from({ length: 384 }, () => 0);
    },
    'embedText'
  );
}

/**
 * 3D UMAP projection of every ingested chunk.  Used by the 3D
 * embedding explorer scatter plot.
 */
export async function getEmbeddings3D(): Promise<readonly EmbeddingPoint[]> {
  return withMockFallback(
    async () => {
      const res = await fetchJSON<BackendEmbed3DResponse>(
        '/rag/embeddings-3d'
      );
      return res.points.map(toEmbeddingPoint);
    },
    () => getMockEmbeddingPoints(),
    'getEmbeddings3D'
  );
}

/** Corpus summary — per-source chunk counts + latest ingestion. */
export interface DocumentsSummary {
  readonly documents: ReadonlyArray<{
    source: string;
    chunk_count: number;
    latest_update: string | null;
  }>;
  readonly total_chunks: number;
}

export async function getDocumentsBreakdown(): Promise<DocumentsSummary> {
  return withMockFallback(
    async () => {
      const res = await fetchJSON<BackendDocumentsResponse>('/rag/documents');
      return {
        documents: res.documents,
        total_chunks: res.total_chunks,
      };
    },
    () => ({
      documents: [
        { source: 'about', chunk_count: 5, latest_update: null },
        { source: 'case_study', chunk_count: 34, latest_update: null },
        { source: 'resume', chunk_count: 20, latest_update: null },
      ],
      total_chunks: 59,
    }),
    'getDocumentsBreakdown'
  );
}
