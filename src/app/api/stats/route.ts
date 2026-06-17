import { proxyJson } from '@/lib/server/proxy';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return proxyJson(req, '/v1/stats');
}
