'use client';

import { useId, type HTMLAttributes } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';

const PALETTE: Record<string, string> = {
  primary: '#6C5CE7',
  teal: '#00CEC9',
  emerald: '#00B894',
  gold: '#FDCB6E',
  pink: '#FD79A8',
  coral: '#E17055',
};
const resolve = (c?: string) => (c && PALETTE[c]) || c || PALETTE.primary;
const AXIS_TICK = { fill: '#6B6B80', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" };

export interface TrendSeries {
  key: string;
  name?: string;
  /** Palette name ('primary' | 'teal' | 'emerald' | 'gold' | 'pink' | 'coral') or hex. */
  color?: string;
}

export interface TrendChartProps extends HTMLAttributes<HTMLDivElement> {
  data: Record<string, string | number>[];
  /** @default 'label' */
  xKey?: string;
  series?: TrendSeries[];
  /** @default 'area' */
  type?: 'area' | 'line';
  /** @default 220 */
  height?: number;
  unit?: string;
  /** Hide axes/grid for tiny inline charts. @default false */
  mini?: boolean;
}

/**
 * TrendChart — themed area/line chart: brand gradient fill, dashed hover
 * cursor, glass tooltip, animated draw.
 */
export function TrendChart({
  data,
  xKey = 'label',
  series = [{ key: 'value', name: 'Value', color: 'primary' }],
  type = 'area',
  height = 220,
  unit = '',
  mini = false,
  style,
  ...props
}: TrendChartProps) {
  const uid = useId().replace(/[:]/g, '');
  const Chart = type === 'line' ? LineChart : AreaChart;

  return (
    <div style={{ width: '100%', height, ...style }} {...props}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={mini ? { top: 4, right: 4, bottom: 0, left: 4 } : { top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            {series.map((s, i) => {
              const c = resolve(s.color);
              return (
                <linearGradient key={i} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          {!mini && <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />}
          {!mini && (
            <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
          )}
          {!mini && <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={46} />}
          <Tooltip
            content={<ChartTooltip unit={unit} />}
            cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeDasharray: '3 3' }}
          />
          {series.map((s, i) => {
            const c = resolve(s.color);
            return type === 'line' ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={c}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: c, stroke: '#0A0A0F', strokeWidth: 2 }}
                animationDuration={900}
              />
            ) : (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={c}
                strokeWidth={2}
                fill={`url(#${uid}-${i})`}
                activeDot={{ r: 4, fill: c, stroke: '#0A0A0F', strokeWidth: 2 }}
                animationDuration={900}
              />
            );
          })}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
