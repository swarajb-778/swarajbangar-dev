'use client';

// ═══════════════════════════════════════════════════════════════
// FloatingTerminalButton — Bottom-left FAB when hero is out of viewport
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { useFloating } from '@/lib/floating-context';

export function FloatingTerminalButton() {
  const { isTerminalOpen, toggleTerminal } = useFloating();
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    // Observe the hero section for viewport intersection
    const heroEl = document.getElementById('hero') ?? document.querySelector('section');
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  const shouldShow = !heroVisible && !isTerminalOpen;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={toggleTerminal}
          className="fixed bottom-6 left-6 z-30 flex items-center justify-center size-12 rounded-full bg-bg-surface border border-border-default text-text-muted hover:text-accent-teal hover:border-border-hover hover:shadow-lg transition-all duration-150"
          aria-label="Open terminal"
          title="Open terminal (press /)"
          style={{
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <Terminal size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
