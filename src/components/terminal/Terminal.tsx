'use client';

// ═══════════════════════════════════════════════════════════════
// Terminal — xterm.js wrapper with WebGL + fit addon
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

export interface TerminalHandle {
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  prompt(): void;
  focus(): void;
  onInput(callback: (input: string) => void): void;
}

export interface TerminalProps {
  readonly onReady?: () => void;
  readonly className?: string;
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

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal({ onReady, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
    const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
    const inputCallbackRef = useRef<((input: string) => void) | null>(null);
    const inputBufferRef = useRef('');
    const [loaded, setLoaded] = useState(false);

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
        termRef.current?.write(`\r\n\x1b[36m${TERMINAL_CONFIG.prompt}\x1b[0m`);
        inputBufferRef.current = '';
      },
      focus() {
        termRef.current?.focus();
      },
      onInput(callback: (input: string) => void) {
        inputCallbackRef.current = callback;
      },
    }));

    const handleData = useCallback((data: string) => {
      const term = termRef.current;
      if (!term) return;

      const code = data.charCodeAt(0);

      if (data === '\r') {
        // Enter
        const input = inputBufferRef.current;
        inputBufferRef.current = '';
        if (inputCallbackRef.current) {
          inputCallbackRef.current(input);
        }
      } else if (code === 127 || code === 8) {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code === 3) {
        // Ctrl+C
        inputBufferRef.current = '';
        term.write('^C');
        term.write(`\r\n\x1b[36m${TERMINAL_CONFIG.prompt}\x1b[0m`);
      } else if (code === 12) {
        // Ctrl+L (clear)
        term.clear();
        term.write('\x1b[H\x1b[2J');
        term.write(`\x1b[36m${TERMINAL_CONFIG.prompt}\x1b[0m`);
        inputBufferRef.current = '';
      } else if (code >= 32) {
        // Printable character
        inputBufferRef.current += data;
        term.write(data);
      }
    }, []);

    useEffect(() => {
      let disposed = false;

      async function init() {
        if (!containerRef.current) return;

        const [{ Terminal: XTerm }, { FitAddon }, { WebglAddon }] =
          await Promise.all([
            import('@xterm/xterm'),
            import('@xterm/addon-fit'),
            import('@xterm/addon-webgl'),
          ]);

        if (disposed) return;

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

        try {
          const webglAddon = new WebglAddon();
          term.loadAddon(webglAddon);
        } catch {
          // WebGL not available — canvas renderer fallback is automatic
        }

        fitAddon.fit();
        term.onData(handleData);

        termRef.current = term;
        fitAddonRef.current = fitAddon;
        setLoaded(true);
        onReady?.();
      }

      init();

      return () => {
        disposed = true;
        termRef.current?.dispose();
        termRef.current = null;
      };
    }, [handleData, onReady]);

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
      <div className={className}>
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-base rounded-t-lg border border-b-0 border-border-default">
          <span className="size-2 rounded-full bg-accent-teal animate-pulse" />
          <span className="text-xs font-mono text-text-muted">
            terminal — swarajbangar.dev
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="rounded-b-lg border border-border-default bg-[#1A1A2E] p-3 min-h-[300px] md:min-h-[400px] [&_.xterm-viewport]:!overflow-hidden"
          style={{
            boxShadow: '0 0 30px rgba(0, 206, 201, 0.06)',
          }}
        />
      </div>
    );
  }
);
