'use client';

import { useState, type HTMLAttributes } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

const PALETTE: Record<string, string> = {
  primary: '#6C5CE7',
  teal: '#00CEC9',
  emerald: '#00B894',
  gold: '#FDCB6E',
  pink: '#FD79A8',
  coral: '#E17055',
};
const AXIS_TICK = { fill: '#6B6B80', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" };

export interface BarsChartProps extends HTMLAttributes<HTMLDivElement> {
  data: Record<string, string | number>[];
  /** @default 'label' */
  xKey?: string;
  /** @default 'value' */
  dataKey?: string;
  /** @default 'Value' */
  name?: string;
  /** Palette name or hex. @default 'primary' */
  color?: string;
  /** @default 200 */
  height?: number;
  unit?: string;
}

/**
 * BarsChart — themed bar chart: rounded bars, hovered bar focuses while
 * siblings dim, glass tooltip, animated rise.
 */
export function BarsChart({
  data,
  xKey = 'label',
  dataKey = 'value',
  name = 'Value',
  color = 'primary',
  height = 200,
  unit = '',
  style,
  ...props
}: BarsChartProps) {
  const c = PALETTE[color] || color;
  const [active, setActive] = useState<number | null>(null);

  return (
    <div style={{ width: '100%', height, ...style }} {...props}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          onMouseMove={(s) => {
            const idx = s && s.activeTooltipIndex;
            setActive(typeof idx === 'number' ? idx : null);
          }}
          onMouseLeave={() => setActive(null)}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={46} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey={dataKey} name={name} radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={800}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={c}
                fillOpacity={active === null ? 0.85 : active === i ? 1 : 0.35}
                style={{ transition: 'fill-opacity 150ms ease-out' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
