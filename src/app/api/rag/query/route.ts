import { proxyJson } from '@/lib/server/proxy';

export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return proxyJson(req, '/v1/rag/query');
}
