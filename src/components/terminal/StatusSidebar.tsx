'use client';

// ═══════════════════════════════════════════════════════════════
// StatusSidebar — Live metric cards + badges (desktop only)
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui';

interface StatusMetric {
  readonly label: string;
  readonly value: string;
  readonly color: string;
  readonly sparkline: readonly number[];
}

const STATUS_METRICS: readonly StatusMetric[] = [
  {
    label: 'GitHub Activity',
    value: '1,247 contributions',
    color: 'var(--accent-emerald)',
    sparkline: [3, 7, 5, 9, 4, 8, 6, 10, 7, 12, 8, 11],
  },
  {
    label: 'Portfolio Uptime',
    value: '99.97%',
    color: 'var(--accent-emerald)',
    sparkline: [99, 100, 100, 99, 100, 100, 100, 99, 100, 100, 100, 100],
  },
  {
    label: 'Agent Chats Today',
    value: '42 conversations',
    color: 'var(--accent-primary)',
    sparkline: [2, 5, 8, 12, 15, 22, 28, 35, 38, 40, 41, 42],
  },
  {
    label: 'Visitors Now',
    value: '3 online',
    color: 'var(--accent-teal)',
    sparkline: [1, 2, 3, 2, 4, 3, 5, 4, 3, 2, 3, 3],
  },
] as const;

function MiniSparkline({
  data,
  color,
}: {
  readonly data: readonly number[];
  readonly color: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="opacity-60"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatusSidebar() {
  return (
    <div className="hidden lg:flex flex-col gap-3">
      {STATUS_METRICS.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: 'easeOut' }}
          className="bg-bg-surface border border-border-default rounded-lg p-4 hover:border-border-hover transition-colors duration-150"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">{metric.label}</span>
            <MiniSparkline data={metric.sparkline} color={metric.color} />
          </div>
          <p
            className="text-lg font-bold"
            style={{ color: metric.color }}
          >
            {metric.value}
          </p>
        </motion.div>
      ))}

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="flex gap-2 mt-1"
      >
        <Badge variant="emerald" dot>Open to Work</Badge>
        <Badge variant="teal">Bay Area</Badge>
      </motion.div>
    </div>
  );
}
