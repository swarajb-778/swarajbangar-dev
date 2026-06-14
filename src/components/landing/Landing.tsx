'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight, GitBranch, Zap, Bot, Brain, Users, Maximize2, FileText,
} from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
import { ChatButton } from '@/components/agent/ChatButton';
import { ChatPanel } from '@/components/agent/ChatPanel';
import { ParticleField } from './ParticleField';
import { HeroTerminal } from './HeroTerminal';
import { ChaosMiniSim } from './ChaosMiniSim';
import { MetricsChart } from './MetricsChart';

const TECH = [
  'Python', 'LangGraph', 'Claude API', 'FastAPI', 'pgvector', 'Neo4j',
  'React', 'Next.js', 'TypeScript', 'AWS', 'Kubernetes', 'Redis',
];

/**
 * Landing — the awwwards-style single-page landing at `/`.
 * Ported from templates/landing: Three.js particle field, GSAP scroll
 * choreography, glow-card bento, terminal boot, chaos mini-sim, and an
 * interactive observability chart. Self-contained chrome (own nav, footer,
 * background, chat dock); the shared SiteChrome is suppressed on `/`.
 */
export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.registerPlugin(ScrollTrigger);

      // scroll progress bar
      gsap.to('#progress', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
      });

      if (reduced) {
        gsap.utils.toArray<HTMLElement>('.gs-reveal').forEach((el) => {
          el.style.opacity = '1'; el.style.transform = 'none';
        });
        return;
      }

      // hero entrance
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.nav-inner', { y: -28, opacity: 0, duration: 0.7 }, 0.1)
        .from('.hero-pill', { y: 18, opacity: 0, duration: 0.6 }, 0.25)
        .from('.hero h1', { y: 34, opacity: 0, duration: 0.9 }, 0.35)
        .from('.hero .lede', { y: 24, opacity: 0, duration: 0.7 }, 0.55)
        .from('.cta-row', { y: 20, opacity: 0, duration: 0.6 }, 0.7)
        .from('.term-wrap', { y: 44, opacity: 0, rotateX: 8, duration: 1.0 }, 0.8)
        .from('.marquee-band', { opacity: 0, duration: 0.8 }, 1.1);

      // generic reveals
      gsap.utils.toArray<HTMLElement>('.gs-reveal').forEach((el) => {
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
          delay: parseInt(el.dataset.delay || '0', 10) / 1000,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        });
      });

      // stat count-ups
      gsap.utils.toArray<HTMLElement>('.stat .num em').forEach((el) => {
        const end = parseFloat(el.dataset.count || '0');
        const dec = el.dataset.dec ? 1 : 0;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end, duration: 1.6, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate() {
            el.textContent = dec ? obj.v.toFixed(2) : Math.round(obj.v).toLocaleString();
          },
        });
      });

      // magnetic CTAs
      gsap.utils.toArray<HTMLElement>('.btn-shimmer, .btn-ghost').forEach((btn) => {
        const onMove = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          gsap.to(btn, {
            x: (e.clientX - r.left - r.width / 2) * 0.16,
            y: (e.clientY - r.top - r.height / 2) * 0.3,
            duration: 0.4, ease: 'power2.out',
          });
        };
        const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        btn.addEventListener('pointermove', onMove);
        btn.addEventListener('pointerleave', onLeave);
      });
    },
    { scope: root }
  );

  return (
    <div className="lp" ref={root}>
      <div id="progress" />
      <ParticleField />
      <div className="grad-blur"><div /><div /><div /><div /><div /><div /></div>

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="nav-logo" href="#top">
            <b>SB</b><span>swarajbangar<i>.dev</i></span>
          </a>
          <div className="nav-links">
            <a href="#work">Experience</a>
            <a href="#lab">Lab</a>
            <a href="#metrics">Metrics</a>
            <a href="#contact">Contact</a>
          </div>
          <span className="nav-cta">
            <a className="btn-shimmer sm" href="#contact">
              <span className="spin" />
              <span className="inner">Hire me</span>
            </a>
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="hero" id="top">
        <span className="hero-pill"><span className="dot" />open_to_senior_roles · bay_area</span>
        <h1>Systems that<br /><span className="grad">prove themselves.</span></h1>
        <p className="lede">
          AI engineer building production agent systems and distributed backends.
          Every section below is a <code>working demo</code> — not a bullet point.
        </p>
        <div className="cta-row">
          <a className="btn-shimmer" href="#lab">
            <span className="spin" />
            <span className="inner">Explore the Lab
              <span className="arrow"><ArrowRight size={14} /></span>
            </span>
          </a>
          <a className="btn-ghost" href="#work"><GitBranch size={16} />See experience</a>
        </div>

        <HeroTerminal />
      </header>

      {/* ── Stack marquee ── */}
      <div className="marquee-band" aria-hidden="true">
        <div className="marquee-track">
          <div className="set">{TECH.map((t) => <span key={`a-${t}`}>{t}</span>)}</div>
          <div className="set">{TECH.map((t) => <span key={`b-${t}`}>{t}</span>)}</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <section className="section" id="stats">
        <div className="stats">
          <div className="stat gs-reveal" data-tint="purple"><div className="num"><em data-count="4">0</em>+ yrs</div><div className="lbl">Shipping production systems</div></div>
          <div className="stat gs-reveal" data-delay="80" data-tint="teal"><div className="num"><em data-count="50">0</em>M+</div><div className="lbl">Daily requests at Amazon</div></div>
          <div className="stat gs-reveal" data-delay="160" data-tint="emerald"><div className="num"><em data-count="1800">0</em>+</div><div className="lbl">Enterprises on Meshi agents</div></div>
          <div className="stat gs-reveal" data-delay="240" data-tint="gold"><div className="num"><em data-count="99.97" data-dec="1">0</em>%</div><div className="lbl">This site&apos;s uptime</div></div>
        </div>
      </section>

      {/* ── Experience ── */}
      <section className="section" id="work">
        <span className="kicker gs-reveal">Experience</span>
        <h2 className="gs-reveal">Hard problems, <span className="grad">shipped</span>.</h2>
        <div className="exp-list">
          <div className="glow-card gs-reveal">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <div className="exp">
                <div className="when">Sep 2025 — Now</div>
                <div className="card-body">
                  <h3>Meshi.io <span>· AI Engineer</span></h3>
                  <p>Multi-agent orchestration and production RAG for 1.8K+ enterprises — LangGraph workflows with live reasoning traces, hybrid-search pipeline tuned to 94% accuracy, Neo4j knowledge-graph memory.</p>
                  <div className="tags"><i>Python</i><i>LangGraph</i><i>Claude API</i><i>pgvector</i><i>Neo4j</i></div>
                </div>
                <div className="metric"><div className="v" style={{ color: 'var(--accent-primary)' }}>94%</div><div className="k">RAG accuracy</div></div>
              </div>
            </div>
          </div>
          <div className="glow-card t-teal gs-reveal" data-delay="80">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <div className="exp">
                <div className="when">Jun 2023 — Sep 2024</div>
                <div className="card-body">
                  <h3>Amazon <span>· Software Development Engineer</span></h3>
                  <p>Payment infrastructure at 50M+ daily transactions — event-driven migration from monolith to microservices with circuit breakers and idempotent consumers, zero downtime, $320K/yr saved.</p>
                  <div className="tags"><i>Java</i><i>AWS</i><i>DynamoDB</i><i>SQS</i><i>Go</i></div>
                </div>
                <div className="metric"><div className="v" style={{ color: 'var(--accent-teal)' }}>45ms</div><div className="k">p95 latency</div></div>
              </div>
            </div>
          </div>
          <div className="glow-card t-coral gs-reveal" data-delay="160">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <div className="exp">
                <div className="when">Aug 2023 — Mar 2024</div>
                <div className="card-body">
                  <h3>Softgenio <span>· Full Stack Developer</span></h3>
                  <p>End-to-end web apps; led the monolith → microservices migration that 4x&apos;d deployment frequency and cut API response time 60%.</p>
                  <div className="tags"><i>React</i><i>Node.js</i><i>TypeScript</i><i>Docker</i><i>Kubernetes</i></div>
                </div>
                <div className="metric"><div className="v" style={{ color: 'var(--accent-coral)' }}>4×</div><div className="k">deploy freq</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lab bento ── */}
      <section className="section" id="lab">
        <span className="kicker gs-reveal">The Lab</span>
        <h2 className="gs-reveal">Live, <span className="grad">breakable</span> demos.</h2>
        <p className="sub gs-reveal">Don&apos;t take the resume&apos;s word for it. Kill a service. Watch the breakers trip. <span className="click-hint">Open any card for the full interactive demo.</span></p>

        <div className="bento">
          {/* Chaos — interactive in place */}
          <div className="glow-card t-coral wide gs-reveal">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <Link className="expand-chip" href="/lab/backend" title="Open the full Chaos Lab"><Maximize2 /></Link>
              <div className="lab-head"><Zap /><span className="name">failure injection · live</span></div>
              <h3>Backend Chaos Lab</h3>
              <p className="desc">A real microservices mesh you&apos;re invited to break. Circuit breakers trip, dependents degrade, the system self-heals.</p>
              <ChaosMiniSim />
            </div>
          </div>

          {/* Agent */}
          <Link className="glow-card gs-reveal" data-delay="100" href="/lab/agent">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <span className="expand-chip"><Maximize2 /></span>
              <div className="lab-head"><Bot /><span className="name">multi-agent · LangGraph</span></div>
              <h3>SwarajOS</h3>
              <p className="desc">An agent that answers for me — with its reasoning trace exposed.</p>
              <div className="trace">
                <div className="t"><b>classify</b>experience_query · 0.94</div>
                <div className="t"><b>route</b>experience_navigator</div>
                <div className="t"><b>tool_call</b>vector_search · 45ms</div>
                <div className="t"><b>generate</b>claude-sonnet-4 · 247 tok</div>
              </div>
            </div>
          </Link>

          {/* RAG */}
          <Link className="glow-card t-teal gs-reveal" href="/lab/ai">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <span className="expand-chip"><Maximize2 /></span>
              <div className="lab-head"><Brain style={{ color: 'var(--accent-teal)' }} /><span className="name">RAG X-ray</span></div>
              <h3>AI Intelligence Lab</h3>
              <p className="desc">Every query dissected — embedding, retrieval, rerank, generation.</p>
              <div className="rag">
                <div className="s"><span className="n">1</span><span className="w">Query Embedding</span><span className="ms">24ms</span></div>
                <div className="s"><span className="n">2</span><span className="w">Retrieval · top-k 8</span><span className="ms">18ms</span></div>
                <div className="s"><span className="n">3</span><span className="w">Reranking · kept 4</span><span className="ms">42ms</span></div>
                <div className="s"><span className="n">4</span><span className="w">Generation · 156 tok</span><span className="ms">210ms</span></div>
              </div>
            </div>
          </Link>

          {/* Realtime */}
          <Link className="glow-card wide gs-reveal" data-delay="100" href="/lab/fullstack">
            <div className="body">
              <span className="smear" /><span className="hl top" /><span className="hl left" />
              <span className="expand-chip"><Maximize2 /></span>
              <div className="lab-head"><Users /><span className="name">real-time · WebSocket</span></div>
              <h3>Collaborative systems</h3>
              <p className="desc">Live cursors under 50ms, Redis pub/sub fan-out, presence that scales horizontally. The same patterns that ran 50M+ requests a day at Amazon, miniaturized into demos you can poke.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="section" id="metrics">
        <span className="kicker gs-reveal">Observability</span>
        <h2 className="gs-reveal">This site <span className="grad">monitors itself</span>.</h2>
        <div className="metrics-grid">
          <MetricsChart />
          <div className="kpis">
            <div className="glow-card t-teal gs-reveal" data-delay="80"><div className="body kpi"><span className="smear" /><div className="v">142ms</div><div className="k">p95 API latency</div></div></div>
            <div className="glow-card gs-reveal" data-delay="160"><div className="body kpi"><span className="smear" /><div className="v">847</div><div className="k">agent chats today</div></div></div>
            <div className="glow-card t-coral gs-reveal" data-delay="240"><div className="body kpi"><span className="smear" /><div className="v">14</div><div className="k">deploys this week</div></div></div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="section contact" id="contact">
        <span className="kicker gs-reveal" style={{ justifyContent: 'center' }}>Contact</span>
        <h2 className="gs-reveal">Ready when <span className="grad">you are</span>.</h2>
        <div className="term-wrap gs-reveal" data-delay="120">
          <div className="term">
            <div className="term-bar">
              <span className="dots"><i style={{ background: '#FF5F57' }} /><i style={{ background: '#FEBC2E' }} /><i style={{ background: '#28C840' }} /></span>
              <span className="title">terminal — contact</span>
            </div>
            <div className="term-body">
              <div className="ln"><span className="p">$</span><span className="c-gold">sudo hire swaraj</span></div>
              <div className="ln"><span className="p">→</span><span className="c-emerald">great choice. opening channel...</span></div>
              <div className="ln"><span className="p">→</span><span className="c-text">{SITE_CONFIG.email}</span><span className="cursor" /></div>
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: 32 }}>
            <a className="btn-shimmer" href={`mailto:${SITE_CONFIG.email}`}>
              <span className="spin" />
              <span className="inner">Get in touch
                <span className="arrow"><ArrowRight size={14} /></span>
              </span>
            </a>
            <a className="btn-ghost" href={SITE_CONFIG.resume} target="_blank" rel="noopener noreferrer"><FileText size={16} />Resume</a>
          </div>
        </div>
      </section>

      <footer className="site">
        <div className="in">
          <a className="nav-logo" href="#top"><b>SB</b><span>swarajbangar<i>.dev</i></span></a>
          <span className="tag">Built with Next.js, FastAPI, LangGraph, Claude, and too much coffee.</span>
          <div className="links">
            <a href={SITE_CONFIG.github} target="_blank" rel="noopener noreferrer"><GitHubIcon />GitHub</a>
            <a href={SITE_CONFIG.linkedin} target="_blank" rel="noopener noreferrer"><LinkedInIcon />LinkedIn</a>
          </div>
        </div>
      </footer>

      <ChatButton />
      <ChatPanel />
    </div>
  );
}
