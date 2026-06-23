// ═══════════════════════════════════════════════════════════════
// ansi — render the terminal command brain's ANSI output as React.
//
// CommandParser/async-commands emit strings with ANSI escape codes
// (truecolor + a handful of SGR codes) because they were written for
// xterm.js. The landing's CSS terminal can't interpret those, so this
// pure helper converts a single ANSI-coded line into colored <span>s.
// This is the bridge that lets the landing terminal reuse the exact
// same command brain as the /portfolio xterm terminal — no forking.
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';

// Named SGR codes used by CommandParser + async-commands, mapped to the
// design-system palette. Truecolor (38;2;r;g;b) is handled separately.
const NAMED_COLORS: Record<string, string> = {
  '1;37': '#F0F0F0', // bold white
  '37': '#F0F0F0',
  '1;30': '#6B6B80',
  '90': '#6B6B80', // bright black → text-muted
  '36': '#00CEC9', // teal
  '32': '#00B894', // green → emerald
  '2;32': '#0E8C66', // dim green
  '33': '#FDCB6E', // gold
  '31': '#FD79A8', // red → pink
  '35': '#FD79A8', // magenta → pink
  '34': '#6C5CE7', // blue → primary
};

const ANSI_RE = /\x1b\[([0-9;]*)m/g;

/** Resolve an SGR parameter string to a CSS color, or null for reset/default. */
function codeToColor(code: string): string | null {
  if (!code || code === '0') return null;
  if (code.startsWith('38;2;')) {
    const [, , r, g, b] = code.split(';');
    if (r !== undefined && g !== undefined && b !== undefined) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return null;
  }
  return NAMED_COLORS[code] ?? null;
}

/**
 * Convert one ANSI-coded line into React nodes. Plain (no-escape) lines
 * are returned as-is for the common case. `white-space: pre-wrap` on the
 * container preserves the leading-space indentation the command brain uses.
 */
export function renderAnsi(line: string): ReactNode {
  if (!line.includes('\x1b')) return line;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let color: string | null = null;
  let key = 0;
  let match: RegExpExecArray | null;

  ANSI_RE.lastIndex = 0;
  while ((match = ANSI_RE.exec(line)) !== null) {
    const text = line.slice(lastIndex, match.index);
    if (text) {
      parts.push(
        color ? <span key={key++} style={{ color }}>{text}</span> : <span key={key++}>{text}</span>
      );
    }
    color = codeToColor(match[1] ?? '');
    lastIndex = ANSI_RE.lastIndex;
  }

  const tail = line.slice(lastIndex);
  if (tail) {
    parts.push(
      color ? <span key={key++} style={{ color }}>{tail}</span> : <span key={key++}>{tail}</span>
    );
  }

  return parts;
}
