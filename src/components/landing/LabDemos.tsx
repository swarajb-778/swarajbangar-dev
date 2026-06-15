'use client';

// ═══════════════════════════════════════════════════════════════
// LabDemos — the four interactive Lab demos + a modal host.
//
// Two ways to use these (both supported):
//   A) MODALS on the landing page (matches the template demo):
//        import { LabModalHost, useLabModal } from './LabDemos';
//        — render <LabModalHost /> once, and call open('chaos') from a card.
//   B) ROUTE PAGES (matches your current /lab/* architecture):
//        // src/app/lab/backend/page.tsx
//        import { ChaosLabDemo } from '@/components/landing/LabDemos';
//        export default function Page() { return <ChaosLabDemo />; }
//
// Reuses the existing chart primitives, CornerGlowCard, Badge, Avatar,
// ShimmerButton. No new dependencies.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { TrendChart } from '@/components/charts/TrendChart';
import { BarsChart } from '@/components/charts/BarsChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ShimmerButton } from '@/components/ui/ShimmerButton';

const jitter = (v: number, amt: number) => v + (Math.random() - 0.5) * amt;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ── live-series hook ── */
function useLiveSeries<T extends { t: number }>(
  next: (t: number, prev: T | null) => T,
  { length = 20, ms = 1000 }: { length?: number; ms?: number } = {},
) {
  const [data, setData] = useState<T[]>(() => {
    let prev: T | null = null;
    return Array.from({ length }, (_, i) => (prev = next(i, prev)));
  });
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; });
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setData((d) => {
        const last = d[d.length - 1];
        return [...d.slice(1), nextRef.current(last.t + 1, last)];
      });
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
  return data;
}

/* ═══ Backend Chaos Lab ═══ */
const SERVICES = [
  { id: 'gateway', name: 'API Gateway', rps: '12.4M' },
  { id: 'auth', name: 'Auth Service', rps: '8.3M' },
  { id: 'order', name: 'Order Service', rps: '5.1M' },
  { id: 'payment', name: 'Payment Svc', rps: '3.2M' },
];
type Fault = 'kill' | 'slow' | null;

export function ChaosLabDemo() {
  const [faults, setFaults] = useState<Record<string, Fault>>({});
  const faultsRef = useRef(faults);
  useEffect(() => { faultsRef.current = faults; });
  const toggle = (id: string, f: Fault) =>
    setFaults((s) => ({ ...s, [id]: s[id] === f ? null : f }));

  const bad = Object.values(faults).filter(Boolean).length;
  const targetP95 = bad ? 2120 : 142;
  const targetErr = bad ? bad * 2.4 : 0.12;

  const series = useLiveSeries<{ t: number; p95: number; err: number }>(
    (t, prev) => {
      const fb = Object.values(faultsRef.current).filter(Boolean).length;
      const tp = fb ? 2120 : 142;
      const te = fb ? fb * 2.4 : 0.12;
      const p = prev ? prev.p95 + (tp - prev.p95) * 0.45 : tp;
      const e = prev ? prev.err + (te - prev.err) * 0.45 : te;
      return { t, p95: Math.round(Math.max(80, jitter(p, 24))), err: Math.max(0.05, +jitter(e, 0.2).toFixed(2)) };
    },
    { length: 22, ms: 1000 },
  );

  return (
    <div>
      <div className="modal-grid">
        <div className="modal-mesh">
          {SERVICES.map((s) => {
            const f = faults[s.id];
            return (
              <div key={s.id} className={`svc${f === 'kill' ? ' down' : f === 'slow' ? ' slow' : ''}`}>
                <div className="row1"><span className="nm">{s.name}</span><span className="st" /></div>
                <div className="meta">
                  {f === 'kill' ? '0 req/s · breaker OPEN' : f === 'slow' ? `${s.rps} req · 2120ms p95` : `${s.rps} req · 45ms p95`}
                </div>
                <div className="faults">
                  <button className={f === 'kill' ? 'on' : ''} onClick={() => toggle(s.id, 'kill')}>Kill</button>
                  <button className={f === 'slow' ? 'on' : ''} onClick={() => toggle(s.id, 'slow')}>+2s</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="modal-side">
          <div className="island-ttl"><span>Mesh status</span><Badge variant={bad ? 'coral' : 'emerald'} dot>{bad ? 'Degraded' : 'Nominal'}</Badge></div>
          <div className="readout">
            <div className={`r${bad ? ' bad' : ''}`}><div className="v">{targetErr.toFixed(2)}%</div><div className="k">error rate</div></div>
            <div className={`r${targetP95 > 500 ? ' bad' : ''}`}><div className="v">{targetP95}ms</div><div className="k">p95 target</div></div>
            <div className={`r${bad ? ' bad' : ''}`}><div className="v">{bad} / 4</div><div className="k">open breakers</div></div>
          </div>
        </div>
      </div>
      <div className="modal-charts">
        <div>
          <div className="island-ttl"><span>p95 latency</span><span className="live-tag">live · 1s</span></div>
          <TrendChart height={170} data={series} xKey="t" unit="ms" series={[{ key: 'p95', name: 'p95', color: bad ? 'coral' : 'teal' }]} />
        </div>
        <div>
          <div className="island-ttl"><span>error rate</span><span className="live-tag">live · 1s</span></div>
          <TrendChart height={170} data={series} xKey="t" unit="%" series={[{ key: 'err', name: 'errors', color: bad ? 'coral' : 'emerald' }]} />
        </div>
      </div>
      <p className="modal-note">Toggle a fault and watch the charts re-shape in real time — breakers trip, dependents degrade, the mesh self-heals when you reset.</p>
    </div>
  );
}

/* ═══ SwarajOS agent ═══ */
const REPLIES: Record<string, [string, string]> = {
  amazon: ['experience_query', 'At Amazon he built payment infrastructure handling 50M+ daily transactions — event-driven microservices with circuit breakers, $320K/yr saved at 45ms p95.'],
  meshi: ['experience_query', 'At Meshi.io he ships multi-agent orchestration and production RAG for 1.8K+ enterprises — LangGraph workflows tuned to 94% retrieval accuracy.'],
  default: ['project_query', 'Routing through experience_navigator → vector_search → claude-sonnet-4. Ask about Amazon, Meshi.io, or the Chaos Lab.'],
};

export function AgentDemo() {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'assistant'; text: string; intent?: string }[]>([
    { role: 'assistant', text: "Hey — I'm SwarajOS. Ask what Swaraj built at Amazon or Meshi.io, and watch the intent donut update." },
  ]);
  const [input, setInput] = useState('');
  const [intents, setIntents] = useState([
    { name: 'experience_query', value: 412 },
    { name: 'project_query', value: 268 },
    { name: 'hiring', value: 97 },
    { name: 'chitchat', value: 70 },
  ]);
  const send = () => {
    const q = input.trim();
    if (!q) return;
    const key = /amazon/i.test(q) ? 'amazon' : /meshi/i.test(q) ? 'meshi' : 'default';
    const [intent, reply] = REPLIES[key];
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: reply, intent }]);
    setIntents((arr) => arr.map((d) => (d.name === intent ? { ...d, value: d.value + 1 } : d)));
    setInput('');
  };
  return (
    <div className="modal-grid agent">
      <div className="agent-chat">
        <div className="thread">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.text}
              {m.intent && <span className="intent-tag">{m.intent} · 0.94</span>}
            </div>
          ))}
        </div>
        <div className="composer">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask SwarajOS…" />
          <button onClick={send} aria-label="Send">↑</button>
        </div>
      </div>
      <div className="modal-side">
        <div className="island-ttl"><span>Intents · live</span></div>
        <DonutChart height={180} centerSub="intents" data={intents} legend />
        <div className="trace" style={{ marginTop: 16 }}>
          <div className="t"><b>classify</b>intent router · 0.94</div>
          <div className="t"><b>route</b>experience_navigator</div>
          <div className="t"><b>tool_call</b>vector_search · 45ms</div>
          <div className="t"><b>generate</b>claude-sonnet-4</div>
        </div>
      </div>
    </div>
  );
}

/* ═══ RAG X-ray ═══ */
const RAG_BASE = [
  { stage: 'embed', ms: 24 }, { stage: 'retrieve', ms: 18 },
  { stage: 'rerank', ms: 42 }, { stage: 'generate', ms: 210 },
];
const RAG_LABELS = ['Query Embedding', 'Retrieval · top-k 8', 'Reranking · kept 4', 'Generation'];

export function RagDemo() {
  const [stages, setStages] = useState(RAG_BASE);
  const [runs, setRuns] = useState(1);
  const run = () => {
    setStages(RAG_BASE.map((s) => ({ ...s, ms: Math.max(8, Math.round(jitter(s.ms, s.ms * 0.45))) })));
    setRuns((n) => n + 1);
  };
  const total = stages.reduce((a, s) => a + s.ms, 0);
  return (
    <div>
      <div className="modal-grid">
        <div className="rag">
          {stages.map((s, i) => (
            <div key={s.stage} className="s">
              <span className="n">{i + 1}</span>
              <span className="w">{RAG_LABELS[i]}</span>
              <span className="ms">{s.ms}ms</span>
            </div>
          ))}
          <div className="rag-total">run #{runs} · total <b>{total}ms</b></div>
        </div>
        <div className="modal-side">
          <div className="island-ttl"><span>Stage latency</span></div>
          <BarsChart height={190} data={stages} xKey="stage" dataKey="ms" name="latency" unit="ms" color="teal" />
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
        <ShimmerButton size="sm" onClick={run}>Run query again</ShimmerButton>
      </div>
    </div>
  );
}

/* ═══ Realtime collaboration ═══ */
export function RealtimeDemo() {
  const peers: [string, 'online' | 'busy'][] = [['Purple Fox', 'online'], ['Teal Otter', 'online'], ['Gold Lynx', 'busy']];
  const series = useLiveSeries<{ t: number; mps: number }>(
    (t, prev) => ({ t, mps: Math.round(clamp(jitter(prev ? prev.mps : 90, 26), 40, 160)) }),
    { length: 24, ms: 900 },
  );
  const now = series[series.length - 1].mps;
  return (
    <div>
      <div className="modal-grid">
        <div className="modal-side" style={{ minWidth: 0 }}>
          <div className="island-ttl"><span>Presence · WebSocket</span></div>
          <div className="peers">
            {peers.map(([name, status]) => (
              <div key={name} className="peer">
                <Avatar name={name} size={34} status={status} />
                <span>{name}</span>
                <i>{status === 'online' ? '< 50ms cursor' : 'idle'}</i>
              </div>
            ))}
          </div>
          <div className="typing"><span className="dot-anim" />Teal Otter is typing…</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="island-ttl"><span>Messages / sec</span><span className="live-tag">live · {now} now</span></div>
          <TrendChart height={200} data={series} xKey="t" unit=" msg/s" series={[{ key: 'mps', name: 'throughput', color: 'primary' }]} />
        </div>
      </div>
      <p className="modal-note">Redis pub/sub fan-out with horizontal presence — the live chart is the same socket telemetry the production demo streams.</p>
    </div>
  );
}

/* ═══ Modal host (option A) ═══ */
export type LabKey = 'chaos' | 'agent' | 'rag' | 'realtime';
const MODALS: Record<LabKey, { title: string; tag: string; href: string; more: string; Body: () => ReactNode }> = {
  chaos: { title: 'Backend Chaos Lab', tag: 'failure injection · live', href: '/lab/backend', more: 'Open the full Chaos Lab', Body: ChaosLabDemo },
  agent: { title: 'SwarajOS', tag: 'multi-agent · LangGraph', href: '/lab/agent', more: 'Open the full agent playground', Body: AgentDemo },
  rag: { title: 'AI Intelligence Lab', tag: 'RAG X-ray', href: '/lab/ai', more: 'Open the full RAG explorer', Body: RagDemo },
  realtime: { title: 'Collaborative systems', tag: 'real-time · WebSocket', href: '/lab/fullstack', more: 'Open the full realtime demo', Body: RealtimeDemo },
};

/**
 * LabModalHost — renders the popup when `openKey` is set.
 * Drive it from Landing.tsx state (see INTEGRATION.md).
 */
export function LabModalHost({ openKey, onClose }: { openKey: LabKey | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = openKey ? 'hidden' : '';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [openKey, onClose]);

  if (!openKey) return null;
  const m = MODALS[openKey];
  const { Body } = m;
  return (
    <div className="lab-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lab-modal" role="dialog" aria-modal="true" aria-label={m.title}>
        <div className="modal-head">
          <div>
            <span className="tag">{m.tag}</span>
            <h3>{m.title}</h3>
          </div>
          <button className="close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <Body />
        <div className="modal-foot">
          <span className="foot-hint">Want the full breakdown — source, architecture &amp; deeper controls?</span>
          <Link className="btn-shimmer sm explore-more" href={m.href} onClick={onClose}>
            <span className="spin" />
            <span className="inner">{m.more}<span className="arrow"><ArrowRight size={14} /></span></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
