'use client';

import { useEffect, useRef } from 'react';

const LINES: ReadonlyArray<readonly [string, string]> = [
  ['c-teal', 'initializing swaraj_bangar.dev...'],
  ['c-emerald', 'loading modules: [ai_engineering, distributed_systems, full_stack]'],
  ['c-gold', 'status: open_to_senior_roles | bay_area'],
  ['c-text', 'system ready. scroll to verify claims.'],
];
const PROMPT = 'visitor@swarajbangar.dev:~$';

/**
 * HeroTerminal — the boot-sequence terminal in the landing hero.
 * Types each line out character-by-character (ported from landing.js),
 * or renders everything instantly under prefers-reduced-motion.
 */
export function HeroTerminal() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    const hint = hintRef.current;
    if (!body || !hint) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showHint = () => {
      hint.style.transition = 'opacity 0.5s ease-out';
      hint.style.opacity = '1';
    };
    const timers: number[] = [];

    if (reduced) {
      body.innerHTML =
        LINES.map(([c, t]) => `<div class="ln"><span class="p">${PROMPT}</span><span class="${c}">${t}</span></div>`).join('') +
        `<div class="ln"><span class="p">${PROMPT}</span><span class="cursor"></span></div>`;
      showHint();
      return;
    }

    body.innerHTML = '';
    let li = 0;
    const typeLine = () => {
      if (li >= LINES.length) {
        const fin = document.createElement('div');
        fin.className = 'ln';
        fin.innerHTML = `<span class="p">${PROMPT}</span><span class="cursor"></span>`;
        body.appendChild(fin);
        showHint();
        return;
      }
      const [cls, text] = LINES[li];
      const row = document.createElement('div');
      row.className = 'ln';
      row.innerHTML = `<span class="p">${PROMPT}</span><span class="${cls}"></span>`;
      body.appendChild(row);
      const target = row.lastElementChild as HTMLElement;
      let n = 0;
      const iv = window.setInterval(() => {
        n++;
        target.textContent = text.slice(0, n);
        if (n >= text.length) {
          clearInterval(iv);
          li++;
          timers.push(window.setTimeout(typeLine, 200));
        }
      }, 17);
      timers.push(iv);
    };
    timers.push(window.setTimeout(typeLine, 900));

    return () => {
      timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
    };
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
          <span className="title">terminal — swarajbangar.dev</span>
        </div>
        <div className="term-body" ref={bodyRef} />
      </div>
      <div className="term-hint" ref={hintRef}>
        about · skills · experience · lab · agent · resume · contact · neofetch
      </div>
    </div>
  );
}
