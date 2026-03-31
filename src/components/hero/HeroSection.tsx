'use client';

// ═══════════════════════════════════════════════════════════════
// HeroSection — Terminal + StatusSidebar, 100vh, "/" shortcut
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BootSequence } from '@/components/terminal/BootSequence';
import { StatusSidebar } from '@/components/terminal/StatusSidebar';
import type { TerminalHandle } from '@/components/terminal/Terminal';

export function HeroSection() {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [bootDone, setBootDone] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
  }, []);

  // "/" keyboard shortcut to focus terminal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        // Focus the xterm canvas inside the terminal container
        const canvas = terminalContainerRef.current?.querySelector(
          '.xterm-helper-textarea'
        ) as HTMLTextAreaElement | null;
        canvas?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="relative h-screen flex flex-col justify-center px-6 pt-16">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Terminal — 65% on desktop, full width on mobile */}
        <div ref={terminalContainerRef} className="lg:w-[65%] w-full">
          <BootSequence
            onBootComplete={handleBootComplete}
            className="h-full"
          />
        </div>

        {/* StatusSidebar — 35% on desktop, hidden on mobile */}
        <div className="lg:w-[35%]">
          <StatusSidebar />
        </div>
      </div>

      {/* Scroll indicator */}
      <AnimatePresence>
        {bootDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
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
              animate={{ y: [0, 6, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
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
