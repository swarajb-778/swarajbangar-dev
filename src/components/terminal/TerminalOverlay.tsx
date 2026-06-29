'use client';

// ═══════════════════════════════════════════════════════════════
// TerminalOverlay — Resizable, persistent terminal panel
// xterm instance persists across open/close cycles
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, GripHorizontal } from 'lucide-react';
import { useFloating } from '@/lib/floating-context';
import { useTerminalActions } from '@/lib/hooks/useTerminalActions';
import { Terminal } from './Terminal';
import { parseCommand } from './CommandParser';
import { getAsyncCommand } from './async-commands';
import type { TerminalHandle } from './Terminal';

// Snap detent points (percentage of viewport height)
const SNAP_DETENTS = [30, 50, 75] as const;
const SNAP_THRESHOLD = 20; // px proximity to snap

function snapToDetent(heightVh: number): number {
  const viewportPx = window.innerHeight;
  const currentPx = (heightVh / 100) * viewportPx;

  for (const detent of SNAP_DETENTS) {
    const detentPx = (detent / 100) * viewportPx;
    if (Math.abs(currentPx - detentPx) <= SNAP_THRESHOLD) {
      return detent;
    }
  }
  return heightVh;
}

export function TerminalOverlay() {
  const {
    isTerminalOpen,
    toggleTerminal,
    terminalHeight,
    setTerminalHeight,
  } = useFloating();

  const terminalRef = useRef<TerminalHandle>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const fitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasShownWelcomeRef = useRef(false);
  const prevOpenRef = useRef(false);
  const actions = useTerminalActions();

  const executeAction = useCallback(
    (result: ReturnType<typeof parseCommand>) => {
      if (!result.action) return;

      const delay = result.action === 'clear' ? 0 : result.action === 'scroll_to' ? 300 : 500;

      setTimeout(() => {
        switch (result.action) {
          case 'scroll_to':
            if (result.target) actions.scrollToSection(result.target);
            break;
          case 'navigate':
            if (result.target) actions.navigateTo(result.target);
            break;
          case 'open_url':
            if (result.target) actions.openUrl(result.target);
            break;
          case 'open_chat':
            actions.openChat();
            break;
          case 'open_resume':
            window.dispatchEvent(new CustomEvent('swarajos:open-resume'));
            break;
          case 'copy':
            if (result.copyText) actions.copyToClipboard(result.copyText);
            break;
          case 'clear':
            terminalRef.current?.clear();
            break;
        }
      }, delay);
    },
    [actions]
  );

  const handleCommand = useCallback(
    (input: string) => {
      const term = terminalRef.current;
      if (!term) return;

      if (busyRef.current) return;

      // Check for async command first
      const asyncRunner = getAsyncCommand(input);
      if (asyncRunner) {
        busyRef.current = true;
        const controller = new AbortController();
        abortRef.current = controller;
        term.writeln('');
        asyncRunner(term, controller.signal).finally(() => {
          busyRef.current = false;
          abortRef.current = null;
        });
        return;
      }

      const result = parseCommand(input);

      if (result.action === 'clear') {
        term.clear();
        term.prompt();
        return;
      }

      for (const line of result.output) {
        term.writeln(line);
      }

      term.prompt();
      executeAction(result);
    },
    [executeAction]
  );

  // Called every time a new xterm instance initializes (on each open if not persisted)
  const handleReady = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.onInput(handleCommand);
    term.onAbort(() => {
      abortRef.current?.abort();
    });
    // Only show welcome message once per session
    if (!hasShownWelcomeRef.current) {
      term.writeln('');
      term.writeln("\x1b[36m  Terminal overlay. Type 'help' for commands.\x1b[0m");
      term.writeln('');
      hasShownWelcomeRef.current = true;
    }
    term.prompt();
    term.focus();
  }, [handleCommand]);

  // Lock body scroll when terminal is open (Escape handled centrally by useKeyboardShortcuts)
  useEffect(() => {
    if (!isTerminalOpen) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isTerminalOpen]);

  // Fit + focus when overlay opens (after animation settles)
  useEffect(() => {
    if (isTerminalOpen && !prevOpenRef.current) {
      // Just opened
      const timer = setTimeout(() => {
        terminalRef.current?.fit();
        terminalRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
    prevOpenRef.current = isTerminalOpen;
  }, [isTerminalOpen]);

  // Debounced fit during drag resize
  const debouncedFit = useCallback(() => {
    if (fitDebounceRef.current) clearTimeout(fitDebounceRef.current);
    fitDebounceRef.current = setTimeout(() => {
      terminalRef.current?.fit();
    }, 50);
  }, []);

  // Drag resize handlers with rAF
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartRef.current = { y: e.clientY, height: terminalHeight };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [terminalHeight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!dragStartRef.current) return;
        const delta = dragStartRef.current.y - e.clientY;
        const deltaVh = (delta / window.innerHeight) * 100;
        const newHeight = dragStartRef.current.height + deltaVh;
        const minVh = (200 / window.innerHeight) * 100; // 200px minimum
        const clamped = Math.max(minVh, Math.min(85, newHeight));
        setTerminalHeight(clamped);
        debouncedFit();
      });
    },
    [setTerminalHeight, debouncedFit]
  );

  const handlePointerUp = useCallback(() => {
    if (dragStartRef.current) {
      const snapped = snapToDetent(terminalHeight);
      if (snapped !== terminalHeight) {
        setTerminalHeight(snapped);
      }
      // Final fit after snap
      setTimeout(() => {
        terminalRef.current?.fit();
      }, 50);
    }
    dragStartRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [terminalHeight, setTerminalHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (fitDebounceRef.current) clearTimeout(fitDebounceRef.current);
    };
  }, []);

  return (
    <>
      {/*
        Terminal instance — always mounted so xterm persists across open/close.
        When closed: container has 0 height and is invisible/inert.
        When open: container is positioned inside the animated panel via a portal-like approach.
        Since we can't portal a ref easily, we keep the Terminal always in the DOM
        but toggle visibility via the outer wrapper.
      */}

      <AnimatePresence>
        {isTerminalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-bg-base/40 backdrop-blur-sm"
              onClick={toggleTerminal}
              aria-hidden="true"
            />

            {/* Terminal panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border-default"
              style={{
                height: `${terminalHeight}vh`,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
              }}
              role="dialog"
              aria-label="Terminal overlay"
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Resize handle */}
              <div
                className="flex justify-center py-1.5 cursor-row-resize select-none touch-none group"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <div className="flex items-center justify-center w-10 h-1.5 rounded-full bg-bg-interactive group-hover:bg-accent-primary/30 transition-colors duration-150">
                  <GripHorizontal size={12} className="text-text-disabled group-hover:text-text-muted transition-colors" />
                </div>
              </div>

              {/* Header bar */}
              <div className="flex items-center justify-between px-4 h-9 bg-bg-elevated border-b border-border-default shrink-0">
                {/* Left: Terminal label */}
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent-emerald animate-pulse" />
                  <span className="text-sm text-text-muted">Terminal</span>
                </div>

                {/* Center: Directory */}
                <span className="text-xs font-mono text-text-disabled hidden sm:block">
                  ~/swarajbangar.dev
                </span>

                {/* Right: Controls */}
                <div className="flex items-center gap-1">
                  {/* Minimize */}
                  <button
                    onClick={toggleTerminal}
                    className="flex items-center justify-center size-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-interactive transition-colors duration-150"
                    aria-label="Minimize terminal"
                    title="Minimize"
                  >
                    <ChevronDown size={14} />
                  </button>

                  {/* Close */}
                  <button
                    onClick={toggleTerminal}
                    className="flex items-center justify-center size-7 rounded-md text-text-muted hover:text-accent-pink hover:bg-accent-pink/10 transition-colors duration-150"
                    aria-label="Close terminal"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Terminal body */}
              <div className="h-[calc(100%-52px)]">
                <Terminal
                  ref={terminalRef}
                  onReady={handleReady}
                  useWebGL={false}
                  className="h-full"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
