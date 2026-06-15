'use client';

import { Children, useState, type HTMLAttributes, type ReactNode } from 'react';

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  /** Seconds per full loop. @default 28 */
  duration?: number;
  /** Gap between items in px. @default 48 */
  gap?: number;
  /** Fade the strip's left/right edges. @default true */
  fade?: boolean;
  /** Pause the scroll while hovered. @default true */
  pauseOnHover?: boolean;
  children: ReactNode;
}

/**
 * Marquee — infinite horizontal scroll strip with faded edges.
 * Static under prefers-reduced-motion.
 */
export function Marquee({
  duration = 28,
  gap = 48,
  fade = true,
  pauseOnHover = true,
  children,
  style,
  ...props
}: MarqueeProps) {
  const [paused, setPaused] = useState(false);
  const items = Children.toArray(children);

  const row = (hidden: boolean) => (
    <div
      aria-hidden={hidden || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        paddingRight: gap,
        flexShrink: 0,
        minWidth: 'max-content',
        animation: `sb-marquee ${duration}s linear infinite`,
        animationPlayState: paused ? 'paused' : 'running',
      }}
    >
      {items}
    </div>
  );

  return (
    <div
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        display: 'flex',
        overflow: 'hidden',
        ...(fade
          ? {
              WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
              maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
            }
          : {}),
        ...style,
      }}
      {...props}
    >
      {row(false)}
      {row(true)}
      <style>{`
        @keyframes sb-marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @media (prefers-reduced-motion: reduce) { [style*="sb-marquee"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
