// ═══════════════════════════════════════════════════════════════
// JSON proxy helper for the `/api/*` route handlers.
//
// Forwards the incoming request to the backend over server-side HTTP and
// returns the upstream response verbatim (status preserved so the client's
// withMockFallback can detect failures and degrade to mock data).
// ═══════════════════════════════════════════════════════════════

import { getBackendOrigin } from './backend';

const TIMEOUT_MS = 30_000;

/**
 * Proxy a JSON request to `${BACKEND_ORIGIN}${upstreamPath}`.
 *
 * - 503 `backend-unconfigured` when no origin is set (→ client uses mock).
 * - 502 `backend-unreachable` on transport failure / timeout.
 * - otherwise the upstream status + JSON body, passed straight through.
 */
export async function proxyJson(req: Request, upstreamPath: string): Promise<Response> {
  const origin = getBackendOrigin();
  if (!origin) {
    return Response.json({ error: 'backend-unconfigured' }, { status: 503 });
  }

  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(`${origin}${upstreamPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Source': 'portfolio-frontend',
      },
      body,
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (err) {
    return Response.json(
      { error: 'backend-unreachable', detail: String(err) },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
