// ═══════════════════════════════════════════════════════════════
// TTS proxy — POST /api/tts → backend /v1/tts.
//
// Streams the backend's MP3 bytes straight through to the browser.
// Node runtime for the plain-HTTP droplet fetch, mirroring /api/agent.
// Non-2xx responses tell the client to fall back to the browser's
// built-in speechSynthesis voice.
// ═══════════════════════════════════════════════════════════════

import { getBackendOrigin } from '@/lib/server/backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  const origin = getBackendOrigin();
  if (!origin) {
    return Response.json({ error: 'backend-unconfigured' }, { status: 503 });
  }

  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/v1/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Source': 'portfolio-frontend',
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    return Response.json(
      { error: `backend-unreachable: ${String(err)}` },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `upstream ${upstream.status}` }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}
