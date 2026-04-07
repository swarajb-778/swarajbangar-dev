// ═══════════════════════════════════════════════════════════════
// Async Commands — Terminal commands that stream output over time
// ═══════════════════════════════════════════════════════════════

import type { TerminalHandle } from './Terminal';

/** Sleep utility that respects AbortSignal */
function sleepAsync(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/** Check if error is an abort */
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// ── ANSI Colors ──
const C = {
  teal: '\x1b[38;2;0;206;201m',
  gold: '\x1b[38;2;253;203;110m',
  pink: '\x1b[38;2;253;121;168m',
  emerald: '\x1b[38;2;0;184;148m',
  green: '\x1b[32m',
  muted: '\x1b[90m',
  white: '\x1b[1;37m',
  reset: '\x1b[0m',
} as const;

/** Fake ping command — 4 replies with delays */
export async function runPing(term: TerminalHandle, signal: AbortSignal): Promise<void> {
  try {
    term.writeln('');
    term.writeln(`  ${C.muted}PING google.com (142.250.80.46): 56 data bytes${C.reset}`);

    const times = ['12.4', '11.8', '13.1', '12.0'];
    for (let i = 0; i < times.length; i++) {
      await sleepAsync(800, signal);
      term.writeln(`  64 bytes from 142.250.80.46: icmp_seq=${i} ttl=118 time=${times[i]}ms`);
    }

    await sleepAsync(400, signal);
    term.writeln(`  ${C.muted}--- google.com ping statistics ---${C.reset}`);
    term.writeln(`  ${C.muted}4 packets transmitted, 4 received, 0% packet loss${C.reset}`);
    term.writeln(`  ${C.muted}round-trip min/avg/max = 11.8/12.3/13.1 ms${C.reset}`);
    term.writeln('');
    term.prompt();
  } catch (err) {
    if (isAbortError(err)) {
      term.writeln('');
      term.writeln(`  ${C.pink}^C${C.reset}`);
      term.prompt();
    }
  }
}

/** rm -rf / — fake glitch then recovery */
export async function runRmRf(term: TerminalHandle, signal: AbortSignal): Promise<void> {
  try {
    term.writeln('');
    term.writeln(`  ${C.pink}rm: destroying filesystem...${C.reset}`);

    // Glitch effect — random chars for ~300ms
    const glitchChars = '░▒▓█▄▀▐▌┤┬├┼╬╗╝╚╔═║';
    for (let i = 0; i < 6; i++) {
      let line = '  ';
      for (let j = 0; j < 40; j++) {
        line += glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      term.writeln(`${C.pink}${line}${C.reset}`);
      await sleepAsync(50, signal);
    }

    await sleepAsync(200, signal);
    term.writeln('');
    term.writeln(`  ${C.emerald}Just kidding. Everything's fine. 😏${C.reset}`);
    term.writeln(`  ${C.muted}Type 'help' to continue.${C.reset}`);
    term.writeln('');
    term.prompt();
  } catch (err) {
    if (isAbortError(err)) {
      term.writeln('');
      term.writeln(`  ${C.pink}^C${C.reset}`);
      term.prompt();
    }
  }
}

/** Matrix rain effect — green characters for 3 seconds */
export async function runMatrix(term: TerminalHandle, signal: AbortSignal): Promise<void> {
  const katakana = 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダ';
  const chars = katakana + '0123456789ABCDEF';

  try {
    term.writeln('');

    const iterations = 60; // ~3 seconds at 50ms intervals
    for (let i = 0; i < iterations; i++) {
      let line = '  ';
      const width = 50;
      for (let j = 0; j < width; j++) {
        const intensity = Math.random();
        if (intensity > 0.7) {
          line += `${C.green}${chars[Math.floor(Math.random() * chars.length)]}${C.reset}`;
        } else if (intensity > 0.4) {
          line += `\x1b[2;32m${chars[Math.floor(Math.random() * chars.length)]}${C.reset}`;
        } else {
          line += ' ';
        }
      }
      term.writeln(line);
      await sleepAsync(50, signal);
    }

    term.writeln('');
    term.writeln(`  ${C.green}Wake up, Neo.${C.reset}`);
    term.writeln(`  ${C.muted}Type 'help' to continue.${C.reset}`);
    term.writeln('');
    term.prompt();
  } catch (err) {
    if (isAbortError(err)) {
      term.writeln('');
      term.writeln(`  ${C.pink}^C${C.reset}`);
      term.prompt();
    }
  }
}

/** sudo hire swaraj — with verification delay */
export async function runSudoHire(term: TerminalHandle, signal: AbortSignal): Promise<void> {
  try {
    term.writeln('');
    term.writeln(`  ${C.gold}🔐 Verifying credentials...${C.reset}`);
    await sleepAsync(500, signal);
    term.writeln(`  ${C.emerald}✅ Access granted! You have sudo privileges.${C.reset}`);
    await sleepAsync(300, signal);
    term.writeln('');
    term.writeln(`  ${C.muted}╔══════════════════════════════════════════════╗${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  🎯 ${C.white}MISSION: Hire Swaraj Bangar${C.reset}             ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}                                              ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.teal}📧${C.reset} swarajbangar778@gmail.com              ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.teal}🔗${C.reset} linkedin.com/in/swarajb778               ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.teal}💻${C.reset} github.com/swarajb-778                   ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.teal}📍${C.reset} San Francisco Bay Area                   ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}                                              ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.gold}Current:${C.reset}  AI Engineer @ Meshi.io           ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.gold}Previous:${C.reset} SDE @ Amazon                     ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}                                              ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.muted}Superpower: Building AI systems that${C.reset}       ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}║${C.reset}  ${C.muted}actually work in production.${C.reset}               ${C.muted}║${C.reset}`);
    term.writeln(`  ${C.muted}╚══════════════════════════════════════════════╝${C.reset}`);
    term.writeln('');
    term.prompt();
  } catch (err) {
    if (isAbortError(err)) {
      term.writeln('');
      term.writeln(`  ${C.pink}^C${C.reset}`);
      term.prompt();
    }
  }
}

/** Registry of async command names to their runner functions */
export type AsyncRunner = (term: TerminalHandle, signal: AbortSignal) => Promise<void>;

export function getAsyncCommand(input: string): AsyncRunner | null {
  const trimmed = input.trim().toLowerCase();
  const [cmd, ...args] = trimmed.split(/\s+/);

  if (cmd === 'ping') return runPing;
  if (cmd === 'matrix') return runMatrix;
  if (cmd === 'rm' && args.join(' ').startsWith('-rf')) return runRmRf;
  if (cmd === 'sudo' && args.join(' ') === 'hire swaraj') return runSudoHire;

  return null;
}
