'use client';

// ═══════════════════════════════════════════════════════════════
// MetricsExtra — second row of charts for the #metrics section.
// Renders live data from useLiveStats (passed down by Landing) when
// available; otherwise self-animates a synthetic series so the section
// never looks dead when the backend is offline / has no history yet.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { CornerGlowCard } from '@/components/ui/CornerGlowCard';
import type { IntentCount, StatsTimeseriesPoint } from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const jitter = (v: number, amt: number) => v + (Math.random() - 0.5) * amt;

type LatPoint = { t: string; p50: number; p95: number };

const SEED_INTENTS: IntentCount[] = [
  { name: 'experience_query', value: 412 },
  { name: 'project_query', value: 268 },
  { name: 'skills_query', value: 121 },
  { name: 'general_chat', value: 97 },
];

interface MetricsExtraProps {
  timeseries?: readonly StatsTimeseriesPoint[];
  intents?: readonly IntentCount[];
}

export function MetricsExtra({ timeseries = [], intents = [] }: MetricsExtraProps) {
  const hasLiveLatency = timeseries.length > 1;
  const hasLiveIntents = intents.length > 0;

  // Synthetic fallbacks — only animate when there's no live data.
  const [synthLat, setSynthLat] = useState<LatPoint[]>(() =>
    Array.from({ length: 24 }, (_, i) => ({ t: `s${i}`, p50: 42, p95: 142 }))
  );
  const [synthIntents, setSynthIntents] = useState<IntentCount[]>(SEED_INTENTS);

  useEffect(() => {
    if (hasLiveLatency) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = setInterval(() => {
      setSynthLat((d) => {
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
    return () => clearInterval(a);
  }, [hasLiveLatency]);

  useEffect(() => {
    if (hasLiveIntents) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const b = setInterval(() => {
      setSynthIntents((arr) => {
        const i = Math.floor(Math.random() * arr.length);
        return arr.map((d, j) => (j === i ? { ...d, value: d.value + 1 } : d));
      });
    }, 2600);
    return () => clearInterval(b);
  }, [hasLiveIntents]);

  const latData: LatPoint[] = hasLiveLatency
    ? timeseries.map((p, i) => ({ t: `s${i}`, p50: p.p50, p95: p.p95 }))
    : synthLat;
  // Map to plain object literals so the array carries the implicit index
  // signature DonutChart's data prop expects (IntentCount interface doesn't).
  const donutData = (hasLiveIntents ? intents : synthIntents).map((d) => ({
    name: d.name,
    value: d.value,
  }));

  return (
    <div className="metrics-extra gs-reveal">
      <CornerGlowCard tint="teal" padding={22}>
        <div className="island-ttl"><span>API latency · p50 / p95</span><span className="live-tag">live</span></div>
        <TrendChart
          type="line"
          height={196}
          data={latData}
          xKey="t"
          unit="ms"
          series={[{ key: 'p50', name: 'p50', color: 'teal' }, { key: 'p95', name: 'p95', color: 'gold' }]}
        />
      </CornerGlowCard>
      <CornerGlowCard padding={22}>
        <div className="island-ttl"><span>Agent interactions · by intent</span><span className="live-tag">live</span></div>
        <DonutChart height={196} centerSub="intents" data={donutData} />
      </CornerGlowCard>
    </div>
  );
}
