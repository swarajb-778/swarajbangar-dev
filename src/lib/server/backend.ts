// ═══════════════════════════════════════════════════════════════
// Server-only backend origin resolver.
//
// The FastAPI backend runs on a plain-HTTP droplet. A Vercel HTTPS page
// CANNOT call it directly (mixed content), so the browser only ever talks
// to same-origin `/api/*` route handlers, which call the backend here —
// server-side, where plain HTTP is fine and the origin stays secret.
//
// `BACKEND_ORIGIN` is a SERVER-ONLY env var (never `NEXT_PUBLIC_*`).
// When unset, proxies return 503 and the client falls back to mock data.
// ═══════════════════════════════════════════════════════════════

/** The configured backend origin (e.g. http://1.2.3.4:8000), or null. */
export function getBackendOrigin(): string | null {
  const raw = (process.env.BACKEND_ORIGIN ?? '').trim().replace(/\/$/, '');
  return raw || null;
}
