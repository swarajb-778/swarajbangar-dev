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
  const bootCompleteRef = useRef(false);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [isReady, setIsReady] = useState(false);
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

    // T+500ms: boot sequence starts after terminal container animation
    await sleep(500);

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
      }

      term.writeln('');
      await sleep(TERMINAL_CONFIG.linePause);
    }

    term.writeln('');
    term.prompt();
    term.focus();
    bootCompleteRef.current = true;

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
    onBootComplete?.();
  }, [onBootComplete]);

  const handleReady = useCallback(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const term = terminalRef.current;
    if (!term || bootCompleteRef.current) return;

    term.onInput(handleCommand);
    term.onAbort(() => {
      abortRef.current?.abort();
    });

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
    <Terminal ref={terminalRef} onReady={handleReady} className={className} />
  );
}
