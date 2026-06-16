'use client';

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

export interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Stagger offset in ms (80ms per sibling is the house rhythm). @default 0 */
  delay?: number;
  /** Animation duration in ms. @default 500 */
  duration?: number;
  /** Starting translateY offset in px. @default 20 */
  y?: number;
  /** Animate only on first entry. @default true */
  once?: boolean;
  children: ReactNode;
}

/**
 * Reveal — scroll-triggered fade-up (opacity 0→1, translateY 20→0,
 * 15% visibility threshold). Respects prefers-reduced-motion.
 */
export function Reveal({
  delay = 0,
  duration = 500,
  y = 20,
  once = true,
  children,
  style,
  ...props
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Reduced motion: shown instantly by the render logic below — no
    // observer, and crucially no synchronous setState in the effect body.
    if (!el || reduced) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once, reduced]);

  const shown = visible || reduced;

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
        transition: reduced
          ? 'none'
          : `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
