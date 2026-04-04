'use client';

// ═══════════════════════════════════════════════════════════════
// TerminalOverlay — Slide-up terminal covering bottom 50%
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFloating } from '@/lib/floating-context';
import { Terminal } from './Terminal';
import { parseCommand } from './CommandParser';
import { TERMINAL_CONFIG } from '@/lib/constants';
import type { TerminalHandle } from './Terminal';

export function TerminalOverlay() {
  const { isTerminalOpen, toggleTerminal } = useFloating();
  const terminalRef = useRef<TerminalHandle>(null);
  const [height, setHeight] = useState(50); // percentage of viewport
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  const handleCommand = useCallback((input: string) => {
    const term = terminalRef.current;
    if (!term) return;

    const result = parseCommand(input);

    if (result.action === 'clear') {
      term.clear();
      term.prompt();
      return;
    }

    for (const line of result.output) {
      term.writeln(line);
    }

    if (result.action === 'scroll_to' && result.target) {
      toggleTerminal();
      setTimeout(() => {
        const el = document.getElementById(result.target!);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }

    if (result.action === 'open_url' && result.target) {
      window.open(result.target, '_blank', 'noopener,noreferrer');
    }

    term.prompt();
  }, [toggleTerminal]);

  const handleReady = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.onInput(handleCommand);
    term.writeln('');
    term.writeln("\x1b[36m  Terminal overlay. Type 'help' for commands.\x1b[0m");
    term.writeln('');
    term.prompt();
    term.focus();
  }, [handleCommand]);

  // Escape key to close
  useEffect(() => {
    if (!isTerminalOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        toggleTerminal();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTerminalOpen, toggleTerminal]);

  // Drag resize handler
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = { y: e.clientY, height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const delta = dragStartRef.current.y - e.clientY;
    const newHeight = dragStartRef.current.height + (delta / window.innerHeight) * 100;
    setHeight(Math.max(25, Math.min(85, newHeight)));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  return (
    <AnimatePresence>
      {isTerminalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-bg-base/60 backdrop-blur-sm"
            onClick={toggleTerminal}
            aria-hidden="true"
          />

          {/* Terminal panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-elevated border-t border-border-default"
            style={{ height: `${height}vh` }}
            role="dialog"
            aria-label="Terminal overlay"
          >
            {/* Resize handle */}
            <div
              className="flex justify-center py-1.5 cursor-row-resize select-none touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div className="w-12 h-1 rounded-full bg-bg-interactive" />
            </div>

            {/* Terminal */}
            <div className="h-[calc(100%-20px)] px-2 pb-2">
              <Terminal
                ref={terminalRef}
                onReady={handleReady}
                className="h-full"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
