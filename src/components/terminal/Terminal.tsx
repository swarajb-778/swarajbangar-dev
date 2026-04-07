'use client';

// ═══════════════════════════════════════════════════════════════
// Terminal — xterm.js wrapper with history, tab completion, cursor
// ═══════════════════════════════════════════════════════════════

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import '@xterm/xterm/css/xterm.css';
import { TERMINAL_CONFIG } from '@/lib/constants';
import { createCommandHistory, type CommandHistory } from '@/lib/hooks/useCommandHistory';
import { createTabCompletion, type TabCompletion } from '@/lib/hooks/useTabCompletion';
import { COMMAND_NAMES } from './CommandParser';

export interface TerminalHandle {
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  prompt(): void;
  focus(): void;
  fit(): void;
  onInput(callback: (input: string) => void): void;
}

export interface TerminalProps {
  readonly onReady?: () => void;
  readonly className?: string;
  /** Enable WebGL renderer. Disable for short-lived instances to avoid context exhaustion. Default: true */
  readonly useWebGL?: boolean;
}

const TERMINAL_THEME = {
  background: '#1A1A2E',
  foreground: '#B0B0C0',
  cursor: '#00CEC9',
  cursorAccent: '#1A1A2E',
  selectionBackground: 'rgba(108, 92, 231, 0.3)',
  selectionForeground: undefined,
  black: '#0A0A0F',
  red: '#FD79A8',
  green: '#00B894',
  yellow: '#FDCB6E',
  blue: '#6C5CE7',
  magenta: '#FD79A8',
  cyan: '#00CEC9',
  white: '#F0F0F0',
  brightBlack: '#6B6B80',
  brightRed: '#FD79A8',
  brightGreen: '#00CEC9',
  brightYellow: '#FDCB6E',
  brightBlue: '#7C6CF7',
  brightMagenta: '#FD79A8',
  brightCyan: '#00CEC9',
  brightWhite: '#FFFFFF',
} as const;

const PROMPT_STR = TERMINAL_CONFIG.prompt;
// Prompt length without ANSI codes (for cursor positioning)
const PROMPT_VISIBLE_LEN = PROMPT_STR.replace(/\x1b\[[^m]*m/g, '').length;

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal({ onReady, className, useWebGL: enableWebGL = true }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
    const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
    const inputCallbackRef = useRef<((input: string) => void) | null>(null);
    const handleDataRef = useRef<((data: string) => void) | null>(null);
    const onReadyRef = useRef(onReady);

    // Keep onReady ref in sync with prop (avoids stale closure in init effect)
    onReadyRef.current = onReady;

    // Input state
    const inputBufferRef = useRef('');
    const cursorPosRef = useRef(0);

    // History & completion (imperative, not reactive)
    const historyRef = useRef<CommandHistory | null>(null);
    const completionRef = useRef<TabCompletion | null>(null);

    const [loaded, setLoaded] = useState(false);

    // Initialize history & completion once
    if (!historyRef.current) {
      historyRef.current = createCommandHistory();
    }
    if (!completionRef.current) {
      completionRef.current = createTabCompletion(COMMAND_NAMES);
    }

    /** Rewrite the current input line (clear from prompt start, redraw) */
    const redrawInput = useCallback(() => {
      const term = termRef.current;
      if (!term) return;
      const buf = inputBufferRef.current;
      const pos = cursorPosRef.current;
      // Move to start of line, write prompt + buffer, clear rest
      term.write(`\r\x1b[36m${PROMPT_STR}\x1b[0m${buf}\x1b[K`);
      // Move cursor to correct position
      const moveBack = buf.length - pos;
      if (moveBack > 0) {
        term.write(`\x1b[${moveBack}D`);
      }
    }, []);

    /** Replace the entire input buffer and redraw */
    const setInput = useCallback(
      (newInput: string) => {
        inputBufferRef.current = newInput;
        cursorPosRef.current = newInput.length;
        redrawInput();
      },
      [redrawInput]
    );

    useImperativeHandle(ref, () => ({
      write(data: string) {
        termRef.current?.write(data);
      },
      writeln(data: string) {
        termRef.current?.writeln(data);
      },
      clear() {
        termRef.current?.clear();
        termRef.current?.write('\x1b[H\x1b[2J');
      },
      prompt() {
        termRef.current?.write(`\r\n\x1b[36m${PROMPT_STR}\x1b[0m`);
        inputBufferRef.current = '';
        cursorPosRef.current = 0;
      },
      focus() {
        termRef.current?.focus();
      },
      fit() {
        fitAddonRef.current?.fit();
      },
      onInput(callback: (input: string) => void) {
        inputCallbackRef.current = callback;
      },
    }));

    const handleData = useCallback(
      (data: string) => {
        const term = termRef.current;
        if (!term) return;
        const history = historyRef.current;
        const completion = completionRef.current;

        // === Escape sequences (arrows, etc.) ===
        if (data.startsWith('\x1b[') || data.startsWith('\x1b0')) {
          const seq = data.slice(2);

          // Up arrow — history previous
          if (seq === 'A') {
            if (!history) return;
            const prev = history.up(inputBufferRef.current);
            if (prev !== null) {
              setInput(prev);
            }
            return;
          }

          // Down arrow — history next
          if (seq === 'B') {
            if (!history) return;
            const next = history.down();
            if (next !== null) {
              setInput(next);
            }
            return;
          }

          // Right arrow — move cursor right
          if (seq === 'C') {
            if (cursorPosRef.current < inputBufferRef.current.length) {
              cursorPosRef.current++;
              term.write('\x1b[C');
            }
            return;
          }

          // Left arrow — move cursor left
          if (seq === 'D') {
            if (cursorPosRef.current > 0) {
              cursorPosRef.current--;
              term.write('\x1b[D');
            }
            return;
          }

          return; // Ignore other escape sequences
        }

        const code = data.charCodeAt(0);

        // Enter
        if (data === '\r') {
          const input = inputBufferRef.current;
          inputBufferRef.current = '';
          cursorPosRef.current = 0;
          // Reset history navigation
          history?.reset();
          // Add to history
          if (input.trim()) {
            history?.push(input);
          }
          if (inputCallbackRef.current) {
            inputCallbackRef.current(input);
          }
          return;
        }

        // Tab — completion
        if (data === '\t') {
          if (!completion) return;
          const buf = inputBufferRef.current;
          const result = completion.complete(buf);
          if (result) {
            // Single match — fill it in with a trailing space
            setInput(result + ' ');
          } else {
            // Multiple matches — show suggestions
            const suggestions = completion.getSuggestions(buf);
            if (suggestions.length > 1) {
              term.writeln('');
              // Format as grid: max 4 per row, padded
              const maxLen = Math.max(...suggestions.map((s) => s.length));
              const padded = suggestions.map((s) => s.padEnd(maxLen + 2));
              const perRow = 4;
              for (let i = 0; i < padded.length; i += perRow) {
                const row = padded.slice(i, i + perRow);
                const formatted = row
                  .map((s) => {
                    // Highlight matching prefix in teal
                    const matchLen = buf.includes(' ')
                      ? buf.split(' ').pop()?.length ?? 0
                      : buf.length;
                    const prefix = s.slice(0, matchLen);
                    const rest = s.slice(matchLen);
                    return `  \x1b[36m${prefix}\x1b[0m\x1b[90m${rest}\x1b[0m`;
                  })
                  .join('');
                term.writeln(formatted);
              }
              // Re-show prompt with current input
              term.write(`\x1b[36m${PROMPT_STR}\x1b[0m${buf}`);
            }
          }
          return;
        }

        // Backspace
        if (code === 127 || code === 8) {
          if (cursorPosRef.current > 0) {
            const buf = inputBufferRef.current;
            const pos = cursorPosRef.current;
            inputBufferRef.current = buf.slice(0, pos - 1) + buf.slice(pos);
            cursorPosRef.current = pos - 1;
            redrawInput();
          }
          return;
        }

        // Ctrl+C — cancel input
        if (code === 3) {
          inputBufferRef.current = '';
          cursorPosRef.current = 0;
          history?.reset();
          term.write('^C');
          term.write(`\r\n\x1b[36m${PROMPT_STR}\x1b[0m`);
          return;
        }

        // Ctrl+L — clear screen
        if (code === 12) {
          term.clear();
          term.write('\x1b[H\x1b[2J');
          term.write(`\x1b[36m${PROMPT_STR}\x1b[0m`);
          inputBufferRef.current = '';
          cursorPosRef.current = 0;
          return;
        }

        // Ctrl+A — cursor to start
        if (code === 1) {
          cursorPosRef.current = 0;
          redrawInput();
          return;
        }

        // Ctrl+E — cursor to end
        if (code === 5) {
          cursorPosRef.current = inputBufferRef.current.length;
          redrawInput();
          return;
        }

        // Paste (multi-char) or printable character
        if (data.length > 1 && data.split('').every((c) => c.charCodeAt(0) >= 32)) {
          // Paste: insert at cursor position
          const buf = inputBufferRef.current;
          const pos = cursorPosRef.current;
          inputBufferRef.current = buf.slice(0, pos) + data + buf.slice(pos);
          cursorPosRef.current = pos + data.length;
          // Reset history when user types
          history?.reset();
          redrawInput();
          return;
        }

        // Single printable character
        if (code >= 32) {
          const buf = inputBufferRef.current;
          const pos = cursorPosRef.current;
          inputBufferRef.current = buf.slice(0, pos) + data + buf.slice(pos);
          cursorPosRef.current = pos + 1;
          // Reset history when user types
          history?.reset();
          redrawInput();
          return;
        }
      },
      [setInput, redrawInput]
    );

    // Keep handleData ref in sync so the xterm onData listener always calls latest version
    handleDataRef.current = handleData;

    // Initialize xterm instance — runs ONCE on mount (+ if enableWebGL changes).
    // Uses refs for callbacks to avoid re-creating the instance when parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      let disposed = false;

      async function init() {
        if (!containerRef.current) return;

        const imports: [
          typeof import('@xterm/xterm'),
          typeof import('@xterm/addon-fit'),
          (typeof import('@xterm/addon-webgl')) | null,
        ] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          enableWebGL
            ? import('@xterm/addon-webgl').catch(() => null)
            : Promise.resolve(null),
        ]);

        if (disposed) return;

        const [{ Terminal: XTerm }, { FitAddon }, webglModule] = imports;

        const fitAddon = new FitAddon();
        const term = new XTerm({
          theme: TERMINAL_THEME,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
          fontSize: 14,
          lineHeight: 1.5,
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 1000,
          allowProposedApi: true,
        });

        term.loadAddon(fitAddon);
        term.open(containerRef.current);

        // Only load WebGL for long-lived instances (hero terminal)
        if (webglModule) {
          try {
            const webglAddon = new webglModule.WebglAddon();
            // Handle WebGL context loss — dispose addon and let canvas take over
            webglAddon.onContextLoss(() => {
              try {
                webglAddon.dispose();
              } catch {
                // Already disposed
              }
            });
            term.loadAddon(webglAddon);
          } catch {
            // WebGL not available — canvas renderer fallback is automatic
          }
        }

        fitAddon.fit();

        // Use a stable wrapper that delegates to the ref (always calls latest handleData)
        term.onData((data: string) => {
          handleDataRef.current?.(data);
        });

        termRef.current = term;
        fitAddonRef.current = fitAddon;
        setLoaded(true);
        onReadyRef.current?.();
      }

      init();

      return () => {
        disposed = true;
        termRef.current?.dispose();
        termRef.current = null;
      };
    }, [enableWebGL]);

    // Handle resize
    useEffect(() => {
      if (!loaded) return;

      const handleResize = () => {
        fitAddonRef.current?.fit();
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [loaded]);

    return (
      <div className={`${className} flex flex-col overflow-hidden`}>
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-base rounded-t-lg border border-b-0 border-border-default shrink-0">
          <span className="size-2 rounded-full bg-accent-teal animate-pulse" />
          <span className="text-xs font-mono text-text-muted">
            terminal — swarajbangar.dev
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="rounded-b-lg border border-border-default bg-[#1A1A2E] p-3 flex-1 min-h-0"
          style={{
            boxShadow: '0 0 30px rgba(0, 206, 201, 0.06)',
          }}
        />
      </div>
    );
  }
);
