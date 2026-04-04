'use client';

// ═══════════════════════════════════════════════════════════════
// ObservabilityWall — Grafana-inspired metric dashboard
// ═══════════════════════════════════════════════════════════════

import {
  LineChart,
  Line,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { MetricCard } from '@/lib/types';

export interface ObservabilityWallProps {
  readonly metrics: readonly MetricCard[];
}

const VALUE_COLORS: Record<string, string> = {
  'Total Requests': 'var(--accent-teal)',
  'P95 Latency': 'var(--accent-gold)',
  'Error Rate': 'var(--accent-coral)',
  'Uptime': 'var(--accent-emerald)',
  'Agent Interactions': 'var(--accent-primary)',
  'Deploys This Week': 'var(--accent-teal)',
} as const;

const CHART_COLORS: Record<string, string> = {
  'Total Requests': '#00CEC9',
  'P95 Latency': '#FDCB6E',
  'Error Rate': '#E17055',
  'Uptime': '#00B894',
  'Agent Interactions': '#6C5CE7',
  'Deploys This Week': '#00CEC9',
} as const;

const BAR_LABELS = new Set(['Uptime', 'Deploys This Week']);

function MiniChart({
  data,
  color,
  useBar,
}: {
  readonly data: readonly number[];
  readonly color: string;
  readonly useBar: boolean;
}) {
  const chartData = data.map((value, i) => ({ i, value }));

  if (useBar) {
    return (
      <ResponsiveContainer width="100%" height={40}>
        <BarChart data={chartData}>
          <Bar dataKey="value" fill={color} opacity={0.6} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MetricPanel({ metric }: { readonly metric: MetricCard }) {
  const valueColor = VALUE_COLORS[metric.label] ?? 'var(--accent-teal)';
  const chartColor = CHART_COLORS[metric.label] ?? '#00CEC9';
  const useBar = BAR_LABELS.has(metric.label);

  return (
    <div className="bg-bg-surface rounded-md p-4">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
        {metric.label}
      </p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p
            className="text-2xl font-bold"
            style={{ color: valueColor }}
          >
            {metric.value}
            {metric.unit && (
              <span className="text-sm font-normal text-text-muted ml-1">
                {metric.unit}
              </span>
            )}
          </p>
          {metric.trend && (
            <p className={cn(
              'text-xs mt-0.5',
              metric.trend === 'up' ? 'text-accent-emerald' :
              metric.trend === 'down' ? 'text-accent-coral' : 'text-text-muted'
            )}>
              {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}{' '}
              {metric.trend}
            </p>
          )}
        </div>
        {metric.sparklineData && metric.sparklineData.length > 0 && (
          <div className="w-24 flex-shrink-0">
            <MiniChart
              data={metric.sparklineData}
              color={chartColor}
              useBar={useBar}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ObservabilityWall({ metrics }: ObservabilityWallProps) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <MetricPanel key={metric.label} metric={metric} />
        ))}
      </div>
      <p className="text-xs text-text-disabled text-center mt-4">
        Auto-refreshes every 30s &middot; All data mocked for Phase 1
      </p>
    </div>
  );
}
