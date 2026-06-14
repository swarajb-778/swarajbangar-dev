'use client';

// ═══════════════════════════════════════════════════════════════
// HeroSection — Terminal + StatusSidebar, 100vh, orchestrated load
// ═══════════════════════════════════════════════════════════════

import { useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusSidebar } from '@/components/terminal/StatusSidebar';
import { Spotlight } from '@/components/ui/Spotlight';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { TerminalSkeleton } from '@/components/ui/Skeleton';

const BootSequence = dynamic(
  () => import('@/components/terminal/BootSequence').then((m) => m.BootSequence),
  { ssr: false, loading: () => <TerminalSkeleton /> }
);

export function HeroSection() {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [bootDone, setBootDone] = useState(false);
  const prefersReduced = useReducedMotion();

  const [scrolledPast, setScrolledPast] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
  }, []);

  // Fade out scroll indicator after scrolling past 200px
  useEffect(() => {
    function handleScroll() {
      setScrolledPast(window.scrollY > 200);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="hero" className="relative h-screen flex flex-col justify-center scroll-mt-16">
      <Spotlight size={680} className="w-full px-6 pt-16 pb-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Terminal — 65% on desktop, full width on mobile */}
        <motion.div
          ref={terminalContainerRef}
          className="lg:w-[65%] w-full"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReduced
              ? { duration: 0.01 }
              : { delay: 0.3, duration: 0.5, ease: [0.4, 0, 0.2, 1] }
          }
        >
          <BootSequence
            onBootComplete={handleBootComplete}
            className="h-full"
          />
        </motion.div>

        {/* StatusSidebar — 35% on desktop, hidden on mobile */}
        <motion.div
          className="lg:w-[35%]"
          initial={prefersReduced ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            prefersReduced
              ? { duration: 0.01 }
              : { delay: 0.5, duration: 0.5, ease: [0.4, 0, 0.2, 1] }
          }
        >
          <StatusSidebar />
        </motion.div>
        </div>
      </Spotlight>

      {/* Scroll indicator — shows after boot, fades on scroll */}
      <AnimatePresence>
        {bootDone && !scrolledPast && (
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              prefersReduced
                ? { duration: 0.01 }
                : { delay: 0.5, duration: 0.6 }
            }
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-xs text-text-disabled font-mono">
              scroll to explore
            </span>
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-text-disabled"
              animate={prefersReduced ? {} : { y: [0, 6, 0] }}
              transition={
                prefersReduced
                  ? undefined
                  : {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
            >
              <path
                d="M5 8L10 13L15 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
