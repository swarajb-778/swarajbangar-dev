'use client';

// ═══════════════════════════════════════════════════════════════
// ExperienceTimeline — Vertical timeline with alternating cards
// ═══════════════════════════════════════════════════════════════

import { ExperienceCard } from './ExperienceCard';
import type { ExperienceEntry } from '@/lib/types';

export interface ExperienceTimelineProps {
  readonly entries: readonly ExperienceEntry[];
}

export function ExperienceTimeline({ entries }: ExperienceTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line — center on desktop, left edge on mobile */}
      <div className="absolute top-0 bottom-0 left-4 lg:left-1/2 w-px bg-border-default lg:-translate-x-px" />

      <div className="space-y-8 lg:space-y-12">
        {entries.map((entry, i) => {
          const isLeft = i % 2 === 0;

          return (
            <div
              key={`${entry.company}-${entry.dates}`}
              className="relative flex items-start"
            >
              {/* Timeline dot */}
              <div
                className="absolute left-4 lg:left-1/2 -translate-x-1/2 top-6 z-10"
              >
                <div className="size-2 rounded-full bg-accent-primary ring-4 ring-bg-base" />
              </div>

              {/* Card positioning */}
              {/* Mobile: always right of the line with left padding */}
              {/* Desktop: alternate left/right */}
              <div
                className={`
                  w-full pl-10
                  lg:w-[calc(50%-24px)] lg:pl-0
                  ${isLeft ? 'lg:mr-auto lg:pr-8' : 'lg:ml-auto lg:pl-8'}
                `}
              >
                <ExperienceCard entry={entry} isLeft={isLeft} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
