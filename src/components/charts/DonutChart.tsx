'use client';

import { useState, type HTMLAttributes } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

const DEFAULT_COLORS = ['#6C5CE7', '#00CEC9', '#FDCB6E', '#FD79A8', '#00B894', '#E17055'];

export interface DonutChartProps extends HTMLAttributes<HTMLDivElement> {
  /** Slices, e.g. [{ name: 'experience_query', value: 412 }]. */
  data: Record<string, string | number>[];
  /** @default 'name' */
  nameKey?: string;
  /** @default 'value' */
  dataKey?: string;
  /** Slice colors (defaults to the brand accent cycle). */
  colors?: string[];
  /** Donut is height×height; legend sits beside. @default 200 */
  height?: number;
  /** Center stat override (defaults to the total). */
  centerLabel?: string;
  /** Center caption (hovering shows the slice). @default 'total' */
  centerSub?: string;
  unit?: string;
  /** @default true */
  legend?: boolean;
}

/**
 * DonutChart — themed donut: hover focuses a slice (center swaps to its
 * value), center total, linked legend with percentages. ≤ 6 slices.
 */
export function DonutChart({
  data,
  nameKey = 'name',
  dataKey = 'value',
  colors = DEFAULT_COLORS,
  height = 200,
  centerLabel,
  centerSub,
  unit = '',
  legend = true,
  style,
  ...props
}: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + (Number(d[dataKey]) || 0), 0);
  const activeRow = active !== null ? data[active] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, height, ...style }} {...props}>
      <div style={{ position: 'relative', width: height, height, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Pie
              data={data}
              nameKey={nameKey}
              dataKey={dataKey}
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={2.5}
              cornerRadius={4}
              stroke="none"
              animationDuration={800}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={colors[i % colors.length]}
                  fillOpacity={active === null ? 0.9 : active === i ? 1 : 0.3}
                  style={{ transition: 'fill-opacity 150ms ease-out', cursor: 'pointer', outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: height * 0.13, color: 'var(--text-primary)' }}>
            {activeRow ? Number(activeRow[dataKey]).toLocaleString() : centerLabel ?? total.toLocaleString()}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {activeRow ? String(activeRow[nameKey]) : centerSub || 'total'}
          </span>
        </div>
      </div>
      {legend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {data.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'default',
                opacity: active === null || active === i ? 1 : 0.45,
                transition: 'opacity 150ms ease-out',
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {String(d[nameKey])}
              </span>
              <span style={{ marginLeft: 'auto', paddingLeft: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                {total ? Math.round((Number(d[dataKey]) / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
