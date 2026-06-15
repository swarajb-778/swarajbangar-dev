'use client';

import { useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

type BaseProps = {
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Seconds per border rotation. @default 4 */
  speed?: number;
  /** Show the trailing arrow chip (slides on hover). @default false */
  arrow?: boolean;
  /** Render as an anchor with this href instead of a button. */
  href?: string;
  children: ReactNode;
};

export type ShimmerButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

/**
 * ShimmerButton — pill CTA with a rotating conic purple→teal border over
 * a dark glass body. The highest-emphasis action — one per page.
 */
export function ShimmerButton({
  size = 'md',
  speed = 4,
  arrow = false,
  href,
  children,
  style,
  ...props
}: ShimmerButtonProps) {
  const [hovered, setHovered] = useState(false);
  const pad = size === 'sm' ? '8px 16px' : size === 'lg' ? '15px 28px' : '13px 24px';
  const fontSize = size === 'sm' ? 13.5 : size === 'lg' ? 16 : 15;
  const Tag = (href ? 'a' : 'button') as 'a';

  return (
    <>
      <Tag
        href={href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          isolation: 'isolate',
          display: 'inline-flex',
          borderRadius: 999,
          overflow: 'hidden',
          cursor: 'pointer',
          border: 0,
          padding: 0,
          background: 'none',
          textDecoration: 'none',
          boxShadow: hovered
            ? '0 0 40px 8px rgba(108, 92, 231, 0.30)'
            : '0 8px 40px rgba(108, 92, 231, 0.25)',
          transform: hovered ? 'translateY(-1px) scale(1.02)' : 'none',
          transition: 'transform 300ms ease-out, box-shadow 300ms ease-out',
          ...style,
        }}
        {...props}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-200%',
            background:
              'conic-gradient(from 225deg, transparent 0deg, var(--accent-primary) 60deg, var(--accent-teal) 90deg, transparent 120deg)',
            animation: `sb-spin-border ${speed}s linear infinite`,
          }}
        />
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: pad,
            borderRadius: 999,
            background: 'rgba(10, 11, 20, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {children}
          {arrow && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 999, background: 'rgba(255,255,255,0.1)',
                transform: hovered ? 'translateX(3px)' : 'none',
                transition: 'transform 250ms ease-out',
              }}
            >
              <ArrowRight size={14} />
            </span>
          )}
        </span>
      </Tag>
      <style>{`@keyframes sb-spin-border { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
