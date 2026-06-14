'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Fault = 'kill' | 'slow' | null;

const SVC = [
  { id: 'gateway', name: 'API Gateway', rps: '12.4M' },
  { id: 'auth', name: 'Auth Service', rps: '8.3M' },
  { id: 'order', name: 'Order Service', rps: '5.1M' },
  { id: 'payment', name: 'Payment Svc', rps: '3.2M' },
] as const;

/**
 * ChaosMiniSim — the interactive failure-injection mesh inside the
 * Backend Chaos Lab card. Kill or slow a service and watch the error
 * rate, p95 and open-breaker readout react. Ported from landing.js.
 */
export function ChaosMiniSim() {
  const [faults, setFaults] = useState<Record<string, Fault>>({});

  const toggle = (id: string, f: Exclude<Fault, null>) =>
    setFaults((s) => ({ ...s, [id]: s[id] === f ? null : f }));

  let bad = 0;
  let maxP95 = 142;
  SVC.forEach((s) => {
    const f = faults[s.id];
    if (f === 'kill' || f === 'slow') { bad++; maxP95 = Math.max(maxP95, 2120); }
  });
  const any = bad > 0;

  return (
    <>
      <div className="mesh">
        {SVC.map((s) => {
          const f = faults[s.id];
          const meta =
            f === 'kill' ? '0 req/s · breaker OPEN'
              : f === 'slow' ? `${s.rps} req · 2120ms p95`
                : `${s.rps} req · 45ms p95`;
          return (
            <div key={s.id} className={cn('svc', f === 'kill' && 'down', f === 'slow' && 'slow')}>
              <div className="row1">
                <span className="nm">{s.name}</span>
                <span className="st" />
              </div>
              <div className="meta">{meta}</div>
              <div className="faults">
                <button
                  type="button"
                  className={cn(f === 'kill' && 'on')}
                  onClick={() => toggle(s.id, 'kill')}
                >
                  Kill
                </button>
                <button
                  type="button"
                  className={cn(f === 'slow' && 'on')}
                  onClick={() => toggle(s.id, 'slow')}
                >
                  +2s
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chaos-readout">
        <div className={cn('r', any && 'bad')}>
          <div className="v">{any ? `${(bad * 2.4).toFixed(1)}%` : '0.12%'}</div>
          <div className="k">error rate</div>
        </div>
        <div className={cn('r', maxP95 > 500 && 'bad')}>
          <div className="v">{maxP95}ms</div>
          <div className="k">p95 latency</div>
        </div>
        <div className={cn('r', any && 'bad')}>
          <div className="v">{bad} / 4</div>
          <div className="k">open breakers</div>
        </div>
      </div>
    </>
  );
}
