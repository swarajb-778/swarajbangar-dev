'use client';

// ═══════════════════════════════════════════════════════════════
// ExperienceCard — Expandable card with metrics + tech badges
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ExperienceEntry } from '@/lib/types';

export interface ExperienceCardProps {
  readonly entry: ExperienceEntry;
  readonly isLeft: boolean;
}

const COMPANY_COLORS: Record<string, string> = {
  'McKinsey & Company': 'var(--accent-primary)',
  ThoughtWorks: 'var(--accent-teal)',
} as const;

const COMPANY_LINKS: Record<string, string> = {
  'McKinsey & Company': '/lab/ai',
  ThoughtWorks: '/lab/backend',
} as const;

const METRIC_COLORS = [
  'var(--accent-teal)',
  'var(--accent-emerald)',
  'var(--accent-gold)',
] as const;

export function ExperienceCard({ entry, isLeft }: ExperienceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = COMPANY_COLORS[entry.company] ?? 'var(--accent-primary)';
  const initial = entry.company[0] ?? '?';
  const labLink = COMPANY_LINKS[entry.company];

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'bg-bg-surface border border-border-default rounded-lg p-5 cursor-pointer',
        'hover:border-border-hover transition-colors duration-150',
        'w-full'
      )}
      onClick={() => setExpanded((prev) => !prev)}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Company initial circle */}
        <div
          className="flex-shrink-0 flex items-center justify-center size-10 rounded-full text-sm font-bold"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
          }}
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-text-primary">
              {entry.company}
            </h3>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} className="text-text-muted flex-shrink-0" />
            </motion.div>
          </div>
          <p className="text-sm text-text-secondary">{entry.title}</p>
          <p className="text-xs text-text-muted mt-0.5">{entry.dates}</p>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {entry.description}
          </p>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-border-default space-y-4">
              {/* Metrics */}
              <div className="flex flex-wrap gap-2">
                {entry.metrics.map((metric, i) => (
                  <span
                    key={metric.label}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${METRIC_COLORS[i % METRIC_COLORS.length]} 12%, transparent)`,
                      color: METRIC_COLORS[i % METRIC_COLORS.length],
                    }}
                  >
                    {metric.value} {metric.label.toLowerCase()}
                  </span>
                ))}
              </div>

              {/* Technologies */}
              <div className="flex flex-wrap gap-1.5">
                {entry.technologies.map((tech) => (
                  <Badge key={tech} variant="gray">
                    {tech}
                  </Badge>
                ))}
              </div>

              {/* Lab link */}
              {labLink && (
                <a
                  href={labLink}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block text-sm text-accent-primary hover:text-[#7C6CF7] transition-colors"
                >
                  View related demo &rarr;
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
