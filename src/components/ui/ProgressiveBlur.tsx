'use client';

import type { HTMLAttributes } from 'react';

export interface ProgressiveBlurProps extends HTMLAttributes<HTMLDivElement> {
  /** Which viewport edge to blur. @default 'top' */
  position?: 'top' | 'bottom';
  /** Overlay depth (CSS height). @default '11%' */
  height?: string | number;
  /** Number of blur layers (more = smoother ramp). @default 6 */
  layers?: number;
  /** position: fixed (true) or absolute within a container (false). @default true */
  fixed?: boolean;
}

/**
 * ProgressiveBlur — pointer-transparent edge overlay whose backdrop blur
 * ramps 0 → strong toward the viewport edge. Mount once in layout.tsx.
 */
export function ProgressiveBlur({
  position = 'top',
  height = '11%',
  layers = 6,
  fixed = true,
  style,
  ...props
}: ProgressiveBlurProps) {
  const top = position === 'top';
  const dir = top ? 'to top' : 'to bottom';
  const seg = 100 / (layers + 2);
  const last = seg * (layers + 1);

  return (
    <div
      aria-hidden="true"
      style={{
        position: fixed ? 'fixed' : 'absolute',
        left: 0,
        right: 0,
        [top ? 'top' : 'bottom']: 0,
        height,
        zIndex: 40,
        pointerEvents: 'none',
        ...style,
      }}
      {...props}
    >
      {Array.from({ length: layers }, (_, i) => {
        const blur = 0.5 * Math.pow(2, i + 1);
        const a = seg * i;
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: i + 2,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: `linear-gradient(${dir}, transparent ${a}%, #000 ${a + seg}%, #000 ${a + seg * 2}%, transparent ${a + seg * 3}%)`,
              WebkitMaskImage: `linear-gradient(${dir}, transparent ${a}%, #000 ${a + seg}%, #000 ${a + seg * 2}%, transparent ${a + seg * 3}%)`,
            }}
          />
        );
      })}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: layers + 2,
          backdropFilter: `blur(${0.5 * Math.pow(2, layers + 1)}px)`,
          WebkitBackdropFilter: `blur(${0.5 * Math.pow(2, layers + 1)}px)`,
          maskImage: `linear-gradient(${dir}, transparent ${last}%, #000 100%)`,
          WebkitMaskImage: `linear-gradient(${dir}, transparent ${last}%, #000 100%)`,
        }}
      />
    </div>
  );
}
