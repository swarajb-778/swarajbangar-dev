'use client';

interface TooltipPayloadItem {
  readonly name?: string | number;
  readonly value?: string | number;
  readonly color?: string;
}

export interface ChartTooltipProps {
  /** Injected by Recharts when used as `<Tooltip content={...} />`. */
  readonly active?: boolean;
  readonly payload?: readonly TooltipPayloadItem[];
  readonly label?: string | number;
  /** Unit suffix appended to each value (e.g. "ms", "%"). */
  readonly unit?: string;
}

/**
 * ChartTooltip — shared glass tooltip for the chart components.
 * Pass to Recharts' <Tooltip content={<ChartTooltip unit="ms" />} />.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: 'rgba(26, 26, 46, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        minWidth: 120,
      }}
    >
      {label !== undefined && label !== null && label !== '' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, lineHeight: 1.9 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: 2,
              background: p.color || '#6C5CE7',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
          <span
            style={{
              marginLeft: 'auto', paddingLeft: 14,
              fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}
