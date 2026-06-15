'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const DATA = [12, 18, 14, 22, 19, 26, 31, 28, 35, 30, 38, 34, 41, 37, 44, 40, 33, 29, 36, 42, 39, 45, 43, 48];
const W = 720, H = 240, PX = 6, PT = 14, PB = 24, MAX = 50, MIN = 8;
const GRID = [0.25, 0.5, 0.75];

const xOf = (i: number) => PX + (i / (DATA.length - 1)) * (W - PX * 2);
const yOf = (v: number) => PT + (1 - (v - MIN) / (MAX - MIN)) * (H - PT - PB);

// smooth path (catmull-rom-ish via quadratic midpoints)
const D = (() => {
  let d = `M ${xOf(0)} ${yOf(DATA[0])}`;
  for (let i = 1; i < DATA.length; i++) {
    const xm = (xOf(i - 1) + xOf(i)) / 2;
    d += ` Q ${xm} ${yOf(DATA[i - 1])}, ${xm} ${(yOf(DATA[i - 1]) + yOf(DATA[i])) / 2} T ${xOf(i)} ${yOf(DATA[i])}`;
  }
  return d;
})();
const AREA = `${D} L ${xOf(DATA.length - 1)} ${H - PB} L ${xOf(0)} ${H - PB} Z`;

/**
 * MetricsChart — interactive area chart for the observability section.
 * The line draws in on scroll (GSAP) and a crosshair tooltip follows the
 * pointer. Ported from the SVG chart IIFE in landing.js.
 */
export function MetricsChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const crossRef = useRef<SVGGElement>(null);
  const vlineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current, line = lineRef.current, fill = fillRef.current;
    const cross = crossRef.current, vline = vlineRef.current, dot = dotRef.current, tip = tipRef.current;
    if (!svg || !line || !fill || !cross || !vline || !dot || !tip) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);

    const len = line.getTotalLength();
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = reduced ? '0' : String(len);

    const triggers: ScrollTrigger[] = [];
    if (!reduced) {
      const t1 = gsap.to(line, {
        strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut',
        scrollTrigger: { trigger: svg, start: 'top 85%', once: true },
      });
      const t2 = gsap.to(fill, {
        opacity: 1, duration: 1.0, delay: 0.9,
        scrollTrigger: { trigger: svg, start: 'top 85%', once: true },
      });
      if (t1.scrollTrigger) triggers.push(t1.scrollTrigger);
      if (t2.scrollTrigger) triggers.push(t2.scrollTrigger);
    } else {
      fill.style.opacity = '1';
    }

    const wrap = svg.parentElement as HTMLElement;
    const onMove = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(DATA.length - 1, Math.round(((px - PX) / (W - PX * 2)) * (DATA.length - 1))));
      const cx = xOf(i), cy = yOf(DATA[i]);
      vline.setAttribute('x1', String(cx)); vline.setAttribute('x2', String(cx));
      dot.setAttribute('cx', String(cx)); dot.setAttribute('cy', String(cy));
      cross.style.opacity = '1';
      const wr = wrap.getBoundingClientRect();
      tip.style.left = `${r.left - wr.left + (cx / W) * r.width}px`;
      tip.style.top = `${r.top - wr.top + (cy / H) * r.height}px`;
      tip.style.opacity = '1';
      tip.innerHTML = `${DATA[i]}k req/min<small>${String(i).padStart(2, '0')}:00</small>`;
    };
    const onLeave = () => { cross.style.opacity = '0'; tip.style.opacity = '0'; };
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', onLeave);

    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="glow-card gs-reveal">
      <div className="body chart-panel" style={{ position: 'relative' }}>
        <span className="smear" /><span className="hl top" /><span className="hl left" />
        <div className="ttl">
          <span className="t">Requests / min · last 24h</span>
          <span className="live">live</span>
        </div>
        <svg id="chart" ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Requests per minute over the last 24 hours">
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {GRID.map((p, idx) => {
            const yy = PT + p * (H - PT - PB);
            return <line key={idx} x1={PX} x2={W - PX} y1={yy} y2={yy} stroke="rgba(255,255,255,0.05)" />;
          })}
          <path className="fill" ref={fillRef} d={AREA} fill="url(#cg)" opacity={0} />
          <path className="line" ref={lineRef} d={D} fill="none" stroke="#6C5CE7" strokeWidth={2.2} strokeLinecap="round" />
          <g className="crosshair" ref={crossRef}>
            <line ref={vlineRef} y1={PT} y2={H - PB} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <circle ref={dotRef} r={4.5} fill="#6C5CE7" stroke="#0A0A0F" strokeWidth={2} />
          </g>
        </svg>
        <div className="chart-tip" ref={tipRef} />
      </div>
    </div>
  );
}
