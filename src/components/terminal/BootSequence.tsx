'use client';

// ═══════════════════════════════════════════════════════════════
// BootSequence — Types boot lines on first visit, then shows prompt
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback, useState } from 'react';
import { TERMINAL_CONFIG } from '@/lib/constants';
import { sleep } from '@/lib/utils';
import { useTerminalActions } from '@/lib/hooks/useTerminalActions';
import { Terminal } from './Terminal';
import { parseCommand } from './CommandParser';
import { getAsyncCommand } from './async-commands';
import type { TerminalHandle } from './Terminal';

const BOOT_SESSION_KEY = 'swaraj-boot-played';

const COLOR_MAP: Record<string, string> = {
  teal: '\x1b[36m',
  emerald: '\x1b[32m',
  gold: '\x1b[33m',
  primary: '\x1b[37m',
} as const;

// ── SWARAJ ASCII Art Logo ──
// Gradient: purple → teal, displayed on boot & reload
const SWARAJ_LOGO: readonly string[] = [
  '',
  '\x1b[38;2;108;92;231m  ███████╗\x1b[38;2;98;102;221m██╗    ██╗\x1b[38;2;78;132;221m █████╗ \x1b[38;2;58;162;211m██████╗  \x1b[38;2;28;192;201m █████╗  \x1b[38;2;0;206;201m     ██╗\x1b[0m',
  '\x1b[38;2;108;92;231m  ██╔════╝\x1b[38;2;98;102;221m██║    ██║\x1b[38;2;78;132;221m██╔══██╗\x1b[38;2;58;162;211m██╔══██╗ \x1b[38;2;28;192;201m██╔══██╗ \x1b[38;2;0;206;201m     ██║\x1b[0m',
  '\x1b[38;2;108;92;231m  ███████╗\x1b[38;2;98;102;221m██║ █╗ ██║\x1b[38;2;78;132;221m███████║\x1b[38;2;58;162;211m██████╔╝ \x1b[38;2;28;192;201m███████║ \x1b[38;2;0;206;201m     ██║\x1b[0m',
  '\x1b[38;2;108;92;231m  ╚════██║\x1b[38;2;98;102;221m██║███╗██║\x1b[38;2;78;132;221m██╔══██║\x1b[38;2;58;162;211m██╔══██╗ \x1b[38;2;28;192;201m██╔══██║ \x1b[38;2;0;206;201m██   ██║\x1b[0m',
  '\x1b[38;2;108;92;231m  ███████║\x1b[38;2;98;102;221m╚███╔███╔╝\x1b[38;2;78;132;221m██║  ██║\x1b[38;2;58;162;211m██║  ██║ \x1b[38;2;28;192;201m██║  ██║ \x1b[38;2;0;206;201m╚█████╔╝\x1b[0m',
  '\x1b[38;2;108;92;231m  ╚══════╝\x1b[38;2;98;102;221m ╚══╝╚══╝ \x1b[38;2;78;132;221m╚═╝  ╚═╝\x1b[38;2;58;162;211m╚═╝  ╚═╝ \x1b[38;2;28;192;201m╚═╝  ╚═╝ \x1b[38;2;0;206;201m ╚════╝ \x1b[0m',
  '',
  '\x1b[90m  ──────────────────────────────────────────────────────────\x1b[0m',
  '\x1b[38;2;108;92;231m  AI Engineer\x1b[0m \x1b[90m·\x1b[0m \x1b[38;2;0;206;201mFull Stack\x1b[0m \x1b[90m·\x1b[0m \x1b[38;2;253;203;110mDistributed Systems\x1b[0m',
  '\x1b[90m  ──────────────────────────────────────────────────────────\x1b[0m',
  '',
] as const;

export interface BootSequenceProps {
  readonly onBootComplete?: () => void;
  readonly className?: string;
}

export function BootSequence({ onBootComplete, className }: BootSequenceProps) {
  const terminalRef = useRef<TerminalHandle>(null);
  const bootSequenceIdRef = useRef(0);
  const isMountedRef = useRef(true);
  // Flips to true the MOMENT runBootSequence (or showWelcomeBack) is
  // invoked.  Protects against effect re-runs during the typing
  // animation that would otherwise start a second boot in parallel —
  // because handleCommand depends on useTerminalActions(), which
  // returns a new object literal on every render, this effect can
  // re-fire while the first run is still mid-typing.  bootCompleteRef
  // only flips at the END of the animation, so it can't guard the
  // in-flight window.
  const bootStartedRef = useRef(false);
  const bootCompleteRef = useRef(false);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [isReady, setIsReady] = useState(false);
  // While true, Terminal.tsx skips fit() on window resize.  We hold this
  // up during the boot animation so a mid-typing reflow can't scramble
  // the character grid.  Released as soon as the prompt is drawn.
  const [bootInProgress, setBootInProgress] = useState(true);
  const actions = useTerminalActions();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

      // If busy with async command, Ctrl+C is handled in Terminal.tsx
      if (busyRef.current) return;

      // Check for async command first
      const asyncRunner = getAsyncCommand(input);
      if (asyncRunner) {
        busyRef.current = true;
        const controller = new AbortController();
        abortRef.current = controller;
        term.writeln(''); // newline after Enter
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

  const runBootSequence = useCallback(async () => {
    const term = terminalRef.current;
    if (!term) return;

    const runId = ++bootSequenceIdRef.current;

    // T+500ms: boot sequence starts after terminal container animation
    await sleep(500);
    if (!isMountedRef.current || runId !== bootSequenceIdRef.current) return;

    // Render SWARAJ ASCII logo instantly (not typed)
    for (const line of SWARAJ_LOGO) {
      term.writeln(line);
    }

    for (const line of TERMINAL_CONFIG.bootLines) {
      const color = COLOR_MAP[line.color] ?? '\x1b[37m';
      const reset = '\x1b[0m';

      for (let i = 0; i < line.text.length; i++) {
        term.write(`${color}${line.text[i]}${reset}`);
        await sleep(TERMINAL_CONFIG.typingSpeed);
        if (!isMountedRef.current || runId !== bootSequenceIdRef.current) return;
      }

      term.writeln('');
      await sleep(TERMINAL_CONFIG.linePause);
      if (!isMountedRef.current || runId !== bootSequenceIdRef.current) return;
    }

    term.writeln('');
    term.prompt();
    term.focus();
    bootCompleteRef.current = true;
    // Defer the state update — the boot-complete handler can be invoked
    // from inside the parent effect via runBootSequence(), and the lint
    // rule (react-hooks/set-state-in-effect) treats that as setting state
    // inside an effect even though the actual call happens much later.
    queueMicrotask(() => {
      if (isMountedRef.current && runId === bootSequenceIdRef.current) {
        setBootInProgress(false);
      }
    });

    try {
      sessionStorage.setItem(BOOT_SESSION_KEY, 'true');
    } catch {
      // sessionStorage unavailable (SSR or privacy mode)
    }

    onBootComplete?.();
  }, [onBootComplete]);

  const showWelcomeBack = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;

    // Render SWARAJ ASCII logo on reload/welcome back
    for (const line of SWARAJ_LOGO) {
      term.writeln(line);
    }
    term.writeln("\x1b[36m  Welcome back. Type 'help' for commands.\x1b[0m");
    term.writeln('');
    term.prompt();
    term.focus();
    bootCompleteRef.current = true;
    // Defer the state update so we don't synchronously setState inside
    // the parent effect that triggered us (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      if (isMountedRef.current) {
        setBootInProgress(false);
      }
    });
    onBootComplete?.();
  }, [onBootComplete]);

  const handleReady = useCallback(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const term = terminalRef.current;
    if (!term || bootCompleteRef.current) return;

    // Re-attach the input/abort handlers every time the memoized
    // handleCommand identity changes — this part is fine to re-run.
    term.onInput(handleCommand);
    term.onAbort(() => {
      abortRef.current?.abort();
    });

    // The boot animation itself must run exactly ONCE.  useTerminalActions
    // returns a new object each render, which makes handleCommand a new
    // function each render, which re-fires this effect.  Without this
    // guard, every re-render during the typing animation would kick off
    // a second runBootSequence in parallel — producing the doubled
    // SWARAJ logo and interleaved character scramble we hit in prod.
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;

    let hasPlayed = false;
    try {
      hasPlayed = sessionStorage.getItem(BOOT_SESSION_KEY) === 'true';
    } catch {
      // sessionStorage unavailable
    }

    if (hasPlayed) {
      showWelcomeBack();
    } else {
      runBootSequence();
    }
  }, [isReady, handleCommand, runBootSequence, showWelcomeBack]);

  return (
    <Terminal
      ref={terminalRef}
      onReady={handleReady}
      className={className}
      suppressFitOnResize={bootInProgress}
    />
  );
}
