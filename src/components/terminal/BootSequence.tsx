'use client';

// ═══════════════════════════════════════════════════════════════
// BootSequence — Types boot lines on first visit, then shows prompt
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback, useState } from 'react';
import { TERMINAL_CONFIG } from '@/lib/constants';
import { sleep } from '@/lib/utils';
import { Terminal } from './Terminal';
import { parseCommand } from './CommandParser';
import type { TerminalHandle } from './Terminal';

const BOOT_SESSION_KEY = 'swaraj-boot-played';

const COLOR_MAP: Record<string, string> = {
  teal: '\x1b[36m',
  emerald: '\x1b[32m',
  gold: '\x1b[33m',
  primary: '\x1b[37m',
} as const;

export interface BootSequenceProps {
  readonly onBootComplete?: () => void;
  readonly className?: string;
}

export function BootSequence({ onBootComplete, className }: BootSequenceProps) {
  const terminalRef = useRef<TerminalHandle>(null);
  const bootCompleteRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

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
      const el = document.getElementById(result.target);
      el?.scrollIntoView({ behavior: 'smooth' });
    }

    if (result.action === 'open_url' && result.target) {
      window.open(result.target, '_blank', 'noopener,noreferrer');
    }

    term.prompt();
  }, []);

  const runBootSequence = useCallback(async () => {
    const term = terminalRef.current;
    if (!term) return;

    term.writeln('');

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

    term.writeln('');
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
