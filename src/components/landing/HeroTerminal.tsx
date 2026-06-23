'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCommand } from '@/components/terminal/CommandParser';
import { COMMAND_NAMES } from '@/components/terminal/CommandParser';
import { getAsyncCommand, type TerminalWriter } from '@/components/terminal/async-commands';
import { createTabCompletion, type TabCompletion } from '@/lib/hooks/useTabCompletion';
import { renderAnsi } from '@/lib/terminal/ansi';

const PROMPT = 'visitor@swarajbangar.dev:~$';

// Boot lines, typed out char-by-char on load (instant under reduced motion).
const BOOT: ReadonlyArray<{ readonly cls: string; readonly text: string }> = [
  { cls: 'c-teal', text: 'initializing swaraj_bangar.dev...' },
  { cls: 'c-emerald', text: 'loading modules: [ai_engineering, distributed_systems, full_stack]' },
  { cls: 'c-gold', text: 'status: open_to_senior_roles | bay_area' },
  { cls: 'c-text', text: "system ready. type 'help' to explore — or just start typing." },
];

// Command brain targets → landing section ids. The command set was written
// for /portfolio (about/experience/…); the landing sections differ. Unmapped
// targets fall through to getElementById(target) and no-op gracefully.
const SECTION_MAP: Record<string, string> = {
  about: 'stats',
  skills: 'stats',
  experience: 'work',
  projects: 'lab',
  lab: 'lab',
  contact: 'contact',
};

const HISTORY_MAX = 50;
const TYPING_MS = 20;
const BOOT_START_MS = 700;

type LineKind = 'boot' | 'cmd' | 'out';
interface TermLine {
  readonly id: number;
  readonly kind: LineKind;
  readonly text: string;
  readonly cls?: string;
}

interface HeroTerminalProps {
  /** Title shown in the terminal's window bar. */
  readonly title?: string;
  /** Focus the input once boot finishes (desktop only). Set false for a
   *  second instance lower on the page so it doesn't steal focus on load. */
  readonly autoFocusOnBoot?: boolean;
}

/**
 * HeroTerminal — interactive landing terminal in the CSS terminal style.
 * Reuses the /portfolio command brain (parseCommand + async easter eggs +
 * tab completion) rendered through an ANSI→React bridge, so there is a
 * single source of truth for commands. Commands navigate the landing
 * (scroll to sections, open the chat dock, open the resume).
 */
export function HeroTerminal({
  title = 'terminal — swarajbangar.dev',
  autoFocusOnBoot = true,
}: HeroTerminalProps = {}) {
  const [committed, setCommitted] = useState<readonly TermLine[]>([]);
  const [typing, setTyping] = useState<{ readonly cls: string; readonly text: string } | null>(null);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<{ entries: string[]; index: number; saved: string }>({
    entries: [],
    index: -1,
    saved: '',
  });
  // Tab completion is pure + stateless; build it once.
  const [completion] = useState<TabCompletion>(() => createTabCompletion(COMMAND_NAMES));

  const appendLines = useCallback((lines: ReadonlyArray<Omit<TermLine, 'id'>>) => {
    setCommitted((prev) => [
      ...prev,
      ...lines.map((l) => ({ ...l, id: idRef.current++ })),
    ]);
  }, []);

  // ── Boot animation ──
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCommitted(BOOT.map((b) => ({ id: idRef.current++, kind: 'boot', text: b.text, cls: b.cls })));
      setBooted(true);
      return;
    }

    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      await wait(BOOT_START_MS);
      for (const line of BOOT) {
        for (let n = 1; n <= line.text.length; n++) {
          if (cancelled) return;
          setTyping({ cls: line.cls, text: line.text.slice(0, n) });
          await wait(TYPING_MS);
        }
        if (cancelled) return;
        setCommitted((prev) => [...prev, { id: idRef.current++, kind: 'boot', text: line.text, cls: line.cls }]);
        setTyping(null);
        await wait(140);
      }
      if (!cancelled) setBooted(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Focus on a desktop pointer once booted (skip touch so the mobile
  // keyboard doesn't pop open on page load).
  useEffect(() => {
    if (!booted || !autoFocusOnBoot) return;
    if (window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [booted, autoFocusOnBoot]);

  // Keep the newest line in view.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [committed, typing, booted, busy]);

  const scrollToLanding = useCallback((target?: string) => {
    if (!target) return;
    const id = SECTION_MAP[target] ?? target;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const runAction = useCallback(
    (result: ReturnType<typeof parseCommand>) => {
      if (!result.action) return;
      const delay = result.action === 'scroll_to' ? 300 : 500;
      window.setTimeout(() => {
        switch (result.action) {
          case 'scroll_to':
          case 'navigate':
            scrollToLanding(result.target);
            break;
          case 'open_url':
            if (result.target) window.open(result.target, '_blank', 'noopener,noreferrer');
            break;
          case 'open_chat':
            window.dispatchEvent(new CustomEvent('swarajos:open-chat'));
            break;
          case 'copy':
            if (result.copyText) navigator.clipboard?.writeText(result.copyText).catch(() => {});
            break;
        }
      }, delay);
    },
    [scrollToLanding]
  );

  const pushHistory = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const h = historyRef.current;
    if (h.entries[h.entries.length - 1] !== trimmed) {
      h.entries.push(trimmed);
      if (h.entries.length > HISTORY_MAX) h.entries.shift();
    }
    h.index = -1;
  }, []);

  const submit = useCallback(() => {
    const raw = input;
    setInput('');
    historyRef.current.index = -1;
    appendLines([{ kind: 'cmd', text: raw }]);
    if (!raw.trim()) return;
    pushHistory(raw);

    const asyncRunner = getAsyncCommand(raw);
    if (asyncRunner) {
      busyRef.current = true;
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const writer: TerminalWriter = {
        writeln: (s) => appendLines([{ kind: 'out', text: s }]),
        prompt: () => {
          busyRef.current = false;
          setBusy(false);
        },
      };
      void asyncRunner(writer, controller.signal).finally(() => {
        busyRef.current = false;
        setBusy(false);
        abortRef.current = null;
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      });
      return;
    }

    const result = parseCommand(raw);
    if (result.action === 'clear') {
      setCommitted([]);
      return;
    }
    appendLines(result.output.map((text) => ({ kind: 'out' as const, text })));
    runAction(result);
  }, [input, appendLines, pushHistory, runAction]);

  const handleTab = useCallback(() => {
    const match = completion.complete(input);
    if (match) {
      setInput(match.endsWith(' ') ? match : `${match} `);
      return;
    }
    const suggestions = completion.getSuggestions(input);
    if (suggestions.length > 1) {
      appendLines([{ kind: 'out', text: `\x1b[90m  ${suggestions.join('   ')}\x1b[0m` }]);
    }
  }, [input, completion, appendLines]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (busyRef.current) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const h = historyRef.current;
        if (h.entries.length === 0) return;
        if (h.index === -1) {
          h.saved = input;
          h.index = h.entries.length - 1;
        } else if (h.index > 0) {
          h.index--;
        }
        setInput(h.entries[h.index] ?? '');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const h = historyRef.current;
        if (h.index === -1) return;
        if (h.index < h.entries.length - 1) {
          h.index++;
          setInput(h.entries[h.index] ?? '');
        } else {
          h.index = -1;
          setInput(h.saved);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleTab();
      }
    },
    [input, submit, handleTab]
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="term-wrap">
      <div className="term">
        <div className="term-bar">
          <span className="dots">
            <i style={{ background: '#FF5F57' }} />
            <i style={{ background: '#FEBC2E' }} />
            <i style={{ background: '#28C840' }} />
          </span>
          <span className="title">{title}</span>
        </div>
        <div className="term-body interactive" ref={bodyRef} onClick={focusInput}>
          {committed.map((line) =>
            line.kind === 'out' ? (
              <div key={line.id} className="out-ln">
                {line.text === '' ? ' ' : renderAnsi(line.text)}
              </div>
            ) : (
              <div key={line.id} className="ln">
                <span className="p">{PROMPT}</span>
                <span className={line.kind === 'boot' ? line.cls : 'c-text'}>{line.text}</span>
              </div>
            )
          )}

          {typing && (
            <div className="ln">
              <span className="p">{PROMPT}</span>
              <span className={typing.cls}>{typing.text}</span>
            </div>
          )}

          {booted && !busy && (
            <div className="ln in-line">
              <span className="p">{PROMPT}</span>
              <input
                ref={inputRef}
                className="term-input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  historyRef.current.index = -1;
                }}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Terminal input — type a command"
              />
            </div>
          )}
        </div>
      </div>
      <div className={`term-hint${booted ? ' show' : ''}`}>
        type <b>help</b> to begin · try about · lab · neofetch · sudo hire swaraj
      </div>
    </div>
  );
}
