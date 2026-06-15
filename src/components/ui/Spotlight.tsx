'use client';

import { useRef, useState, type HTMLAttributes, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export interface SpotlightProps extends HTMLAttributes<HTMLDivElement> {
  /** Also render the fading dot grid behind the content. */
  dots?: boolean;
  /** Spotlight diameter in px. @default 620 */
  size?: number;
  /** Glow color. @default soft brand purple */
  color?: string;
  children: ReactNode;
}

/**
 * Spotlight — wraps a section in a soft mouse-follow purple glow,
 * optionally over the fading dot grid. Use once per page (hero).
 */
export function Spotlight({
  dots = false,
  size = 620,
  color = 'var(--spotlight, rgba(108,92,231,0.09))',
  children,
  className,
  style,
  ...props
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setPos({ x: -9999, y: -9999 })}
      className={cn(dots && 'bg-dots-fade', className)}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      {...props}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, ${color}, transparent 65%)`,
          transition: 'background 80ms linear',
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
