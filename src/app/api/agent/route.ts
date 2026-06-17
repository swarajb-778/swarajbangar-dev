// ═══════════════════════════════════════════════════════════════
// Streaming agent proxy — POST /api/agent → backend /v1/agent/orchestrate.
//
// Pipes the backend's Server-Sent Events straight through to the browser.
// Node runtime (not Edge): plain-HTTP fetch to the droplet is unambiguous
// here, and returning the upstream ReadableStream body streams fine.
//
// On any failure we return a 5xx with an SSE-shaped error frame; the client
// treats a non-2xx response as "fall back to the mock stream", so the
// portfolio never shows a broken chat to a hiring manager.
// ═══════════════════════════════════════════════════════════════

import { getBackendOrigin } from '@/lib/server/backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

function errorFrame(message: string, code: string, status: number): Response {
  const data = JSON.stringify({ message, code });
  return new Response(`event: error\ndata: ${data}\n\n`, {
    status,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  });
}

export async function POST(req: Request): Promise<Response> {
  const origin = getBackendOrigin();
  if (!origin) {
    return errorFrame('Backend not configured', 'UNCONFIGURED', 503);
  }

  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/v1/agent/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-Request-Source': 'portfolio-frontend',
      },
      body,
      cache: 'no-store',
    });
  } catch (err) {
    return errorFrame(`Backend unreachable: ${String(err)}`, 'UNREACHABLE', 502);
  }

  if (!upstream.ok || !upstream.body) {
    return errorFrame(`Backend ${upstream.status}`, 'UPSTREAM', upstream.status || 502);
  }

  return new Response(upstream.body, { status: 200, headers: SSE_HEADERS });
}
