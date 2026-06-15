'use client';

import { useState, type HTMLAttributes, type ReactNode, type CSSProperties } from 'react';

export type CornerGlowTint = 'purple' | 'teal' | 'coral' | 'emerald';

export interface CornerGlowCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Corner glow color. @default 'purple' */
  tint?: CornerGlowTint;
  /** Inner padding in px. @default 28 */
  padding?: number | string;
  /** Outer corner radius in px. @default 22 */
  radius?: number;
  /** Render the crossing hairline accents. @default true */
  hairlines?: boolean;
  /** Render the rotated glow smear in the corner. @default true */
  smear?: boolean;
  /** Style overrides for the inner surface. */
  innerStyle?: CSSProperties;
  children: ReactNode;
}

const TINTS: Record<CornerGlowTint, { edge: string; smear: string; glow: string; hover: string }> = {
  purple:  { edge: 'rgba(108, 92, 231, 0.45)', smear: 'rgba(108, 92, 231, 0.30)', glow: 'rgba(108, 92, 231, 0.50)', hover: 'rgba(85, 80, 120, 0.35)' },
  teal:    { edge: 'rgba(0, 206, 201, 0.40)',  smear: 'rgba(0, 206, 201, 0.28)',  glow: 'rgba(0, 206, 201, 0.45)',  hover: 'rgba(60, 110, 110, 0.32)' },
  coral:   { edge: 'rgba(225, 112, 85, 0.40)', smear: 'rgba(225, 112, 85, 0.28)', glow: 'rgba(225, 112, 85, 0.45)', hover: 'rgba(120, 85, 80, 0.32)' },
  emerald: { edge: 'rgba(0, 184, 148, 0.40)',  smear: 'rgba(0, 184, 148, 0.28)',  glow: 'rgba(0, 184, 148, 0.45)',  hover: 'rgba(60, 110, 95, 0.32)' },
};

/**
 * CornerGlowCard — premium card with a tinted top-left corner glow,
 * rotated blur smear, and crossing hairlines. Background warms on hover.
 */
export function CornerGlowCard({
  tint = 'purple',
  padding = 28,
  radius = 22,
  hairlines = true,
  smear = true,
  children,
  style,
  innerStyle,
  ...props
}: CornerGlowCardProps) {
  const [hovered, setHovered] = useState(false);
  const t = TINTS[tint];

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: radius,
        padding: 1,
        background: `radial-gradient(230px at 0% 0%, ${t.edge}, rgba(12, 13, 16, 1))`,
        ...style,
      }}
      {...props}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: radius - 1,
          overflow: 'hidden',
          background: `radial-gradient(300px at 0% 0%, ${hovered ? t.hover : 'rgba(68, 68, 68, 0.30)'}, #0c0d10)`,
          border: '1px solid #1e2026',
          padding,
          color: 'var(--text-secondary)',
          transition: 'background 300ms ease-out',
          ...innerStyle,
        }}
      >
        {smear && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, left: 0, width: 220, height: 45,
              borderRadius: 999, opacity: 0.4, filter: 'blur(10px)',
              background: t.smear, boxShadow: `0 0 50px ${t.glow}`,
              transform: 'rotate(40deg)', transformOrigin: '10% 50%',
              pointerEvents: 'none',
            }}
          />
        )}
        {hairlines && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', top: '9%', left: 0, width: '100%', height: 1,
                background: 'linear-gradient(90deg, rgba(136,136,136,0.3) 10%, #1d1f24 70%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)',
                maskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)',
                pointerEvents: 'none',
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', left: '7%', top: 0, width: 1, height: '100%',
                background: 'linear-gradient(180deg, rgba(116,116,116,0.3) 30%, #222428 70%)',
                WebkitMaskImage: 'linear-gradient(0deg, transparent, #000 15%, #000 85%, transparent)',
                maskImage: 'linear-gradient(0deg, transparent, #000 15%, #000 85%, transparent)',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
        <div style={{ position: 'relative' }}>{children}</div>
      </div>
    </div>
  );
}
