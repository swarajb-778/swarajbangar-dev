'use client';

import { type ReactNode, useRef } from 'react';
import {
  motion,
  useInView,
  type Variants,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

export interface SectionWrapperProps {
  readonly id?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title?: string;
  readonly subtitle?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.01 },
  },
};

export function SectionWrapper({
  id,
  children,
  className,
  title,
  subtitle,
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();

  const activeContainer = prefersReduced ? { hidden: {}, visible: {} } : containerVariants;
  const activeChild = prefersReduced ? reducedVariants : childVariants;

  return (
    <section
      ref={ref}
      id={id}
      className={cn('scroll-mt-20 py-24 px-6 max-w-7xl mx-auto', className)}
    >
      <motion.div
        variants={activeContainer}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {title && (
          <motion.div variants={activeChild} className="mb-12">
            {subtitle && (
              <p className="text-xs font-semibold uppercase tracking-[2px] text-accent-primary mb-3">
                {subtitle}
              </p>
            )}
            <h2 className="text-[28px] font-semibold text-text-primary leading-tight">
              {title}
            </h2>
          </motion.div>
        )}
        <motion.div variants={activeChild}>{children}</motion.div>
      </motion.div>
    </section>
  );
}
