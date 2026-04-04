'use client';

// ═══════════════════════════════════════════════════════════════
// StatCard — Animated count-up stat with accent color border
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, type ElementType } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly icon: ElementType;
  readonly color: string;
  readonly delay?: number;
}

function parseValue(value: string): {
  readonly numericPart: number;
  readonly prefix: string;
  readonly suffix: string;
} {
  const match = value.match(/^([^0-9]*)([0-9.]+)(.*)$/);
  if (!match) return { numericPart: 0, prefix: '', suffix: value };
  return {
    prefix: match[1] ?? '',
    numericPart: parseFloat(match[2] ?? '0'),
    suffix: match[3] ?? '',
  };
}

function useCountUp(target: number, duration: number, isVisible: boolean): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    let raf: number;

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, isVisible]);

  return current;
}

export function StatCard({ label, value, icon: Icon, color, delay = 0 }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { numericPart, prefix, suffix } = parseValue(value);
  const animated = useCountUp(numericPart, 1500, isVisible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayValue = isVisible
    ? `${prefix}${numericPart % 1 === 0 ? Math.round(animated) : animated.toFixed(1)}${suffix}`
    : `${prefix}0${suffix}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex-1 bg-bg-surface border border-border-default rounded-lg p-4',
        'border-l-4 hover:border-border-hover transition-colors duration-150'
      )}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-xs text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>
        {displayValue}
      </p>
    </motion.div>
  );
}
