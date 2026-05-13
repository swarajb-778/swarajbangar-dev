'use client';

// ═══════════════════════════════════════════════════════════════
// useActiveSection — IntersectionObserver-based section tracking
// with smooth progress tracking within the current section
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';

const SECTION_IDS = [
  'hero',
  'about',
  'experience',
  'lab',
  'case-studies',
  'blog',
  'observability',
  'contact',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

interface ActiveSectionState {
  readonly activeSection: SectionId;
  readonly progress: number; // 0-1 within the active section
  readonly sectionIds: readonly SectionId[];
}

// Generate thresholds: [0, 0.1, 0.2, ... 1.0]
const THRESHOLDS = Array.from({ length: 11 }, (_, i) => i / 10);

export function useActiveSection(): ActiveSectionState {
  const [activeSection, setActiveSection] = useState<SectionId>('hero');
  const [progress, setProgress] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Debounced setter to prevent rapid switching between sections
  const debouncedSetSection = useCallback((id: SectionId) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveSection(id);
    }, 50);
  }, []);

  // IntersectionObserver for active section detection
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            debouncedSetSection(id);
          }
        },
        {
          threshold: THRESHOLDS,
          rootMargin: '-20% 0px -20% 0px',
        }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      observers.forEach((o) => o.disconnect());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debouncedSetSection]);

  // Scroll progress tracking within active section using rAF
  useEffect(() => {
    function handleScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const el = document.getElementById(activeSection);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight;

        // Progress: 0 when section top hits bottom of viewport,
        // 1 when section bottom passes top of viewport
        const totalTravel = rect.height + viewportH;
        const traveled = viewportH - rect.top;
        const sectionProgress = Math.max(0, Math.min(1, traveled / totalTravel));

        setProgress(sectionProgress);
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeSection]);

  return { activeSection, progress, sectionIds: SECTION_IDS };
}
