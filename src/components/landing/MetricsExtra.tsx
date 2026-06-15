'use client';

// ═══════════════════════════════════════════════════════════════
// MetricsExtra — second row of live charts for the #metrics section.
// Drop <MetricsExtra /> right after the .metrics-grid div in Landing.tsx.
// Uses the existing chart primitives + CornerGlowCard.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { CornerGlowCard } from '@/components/ui/CornerGlowCard';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const jitter = (v: number, amt: number) => v + (Math.random() - 0.5) * amt;

type LatPoint = { t: string; p50: number; p95: number };

export function MetricsExtra() {
  const [lat, setLat] = useState<LatPoint[]>(() =>
    Array.from({ length: 24 }, (_, i) => ({ t: `s${i}`, p50: 42, p95: 142 })),
  );
  const [intents, setIntents] = useState([
    { name: 'experience_query', value: 412 },
    { name: 'project_query', value: 268 },
    { name: 'hiring', value: 97 },
    { name: 'chitchat', value: 70 },
  ]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const a = setInterval(() => {
      setLat((d) => {
        const last = d[d.length - 1];
        const t = `s${parseInt(last.t.slice(1), 10) + 1}`;
        return [
          ...d.slice(1),
          {
            t,
            p50: Math.round(clamp(jitter(last.p50, 6), 30, 60)),
            p95: Math.round(clamp(jitter(last.p95, 14), 110, 180)),
          },
        ];
      });
    }, 2000);
    const b = setInterval(() => {
      setIntents((arr) => {
        const i = Math.floor(Math.random() * arr.length);
        return arr.map((d, j) => (j === i ? { ...d, value: d.value + 1 } : d));
      });
    }, 2600);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  return (
    <div className="metrics-extra gs-reveal">
      <CornerGlowCard tint="teal" padding={22}>
        <div className="island-ttl"><span>API latency · p50 / p95</span><span className="live-tag">live</span></div>
        <TrendChart
          type="line"
          height={196}
          data={lat}
          xKey="t"
          unit="ms"
          series={[{ key: 'p50', name: 'p50', color: 'teal' }, { key: 'p95', name: 'p95', color: 'gold' }]}
        />
      </CornerGlowCard>
      <CornerGlowCard padding={22}>
        <div className="island-ttl"><span>Agent interactions · by intent</span><span className="live-tag">live</span></div>
        <DonutChart height={196} centerSub="intents" data={intents} />
      </CornerGlowCard>
    </div>
  );
}
