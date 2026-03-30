# swarajbangar.dev — Portfolio System

## What This Is

A dark-mode, terminal-first developer portfolio that **proves** full-stack, backend, and AI engineering expertise through live, interactive demos. Not a resume website — a working product. The portfolio itself is the most impressive project on it.

Target: Senior AI Engineer / Staff Engineer roles. Audience: hiring managers, CTOs, AI leads, peer engineers.

## Current Phase: Phase 1 — Frontend Shell

Building the complete frontend with mocked data. No backend yet. Every component accepts typed props matching the real API shapes so we can swap mocks for real endpoints later without changing component code.

## Design System (Dark Mode First)

### Background Layers (darkest → lightest)
```
--bg-base:        #0A0A0F    /* Page body, deepest layer */
--bg-surface:     #12121A    /* Card backgrounds, panels */
--bg-elevated:    #1A1A2E    /* Modals, dropdowns, hover states */
--bg-interactive: #242438    /* Input fields, active states */
--bg-highlight:   #2D2D44    /* Code blocks, selected items */
```

### Accent Colors
```
--accent-primary:   #6C5CE7  /* Electric Purple — CTAs, links, brand */
--accent-teal:      #00CEC9  /* Cyber Teal — success, terminal prompt, live indicators */
--accent-pink:      #FD79A8  /* Soft Pink — errors, warnings, attention */
--accent-gold:      #FDCB6E  /* Warm Gold — highlights, premium indicators */
--accent-emerald:   #00B894  /* Emerald — online status, uptime, health */
--accent-coral:     #E17055  /* Warm Coral — destructive actions, chaos, hot paths */
```

### Text Colors
```
--text-primary:   #F0F0F0    /* Headings, primary content */
--text-secondary: #B0B0C0    /* Body text, descriptions */
--text-muted:     #6B6B80    /* Captions, timestamps, hints */
--text-disabled:  #4A4A5E    /* Inactive states, placeholders */
```

### Borders & Effects
```
--border-default: rgba(255, 255, 255, 0.06)   /* Card edges */
--border-hover:   rgba(255, 255, 255, 0.12)   /* Hover states */
--border-focus:   #6C5CE7                       /* Focus rings */
--glow-subtle:    0 0 20px rgba(108, 92, 231, 0.08)   /* Elevated cards */
--glow-active:    0 0 30px rgba(108, 92, 231, 0.15)   /* Active elements */
```

### Typography
```
--font-sans:    'Inter', -apple-system, BlinkMacSystemFont, sans-serif
--font-mono:    'JetBrains Mono', 'Fira Code', 'SF Mono', monospace
--font-display: 'Space Grotesk', var(--font-sans)
```

Type scale: display=48px/700, h1=36px/700, h2=28px/600, h3=22px/600, body-lg=18px/400, body=16px/400, body-sm=14px/400, code=14px/400, overline=12px/600(uppercase, 2px letter-spacing)

### Spacing (8px base)
space-1=4px, space-2=8px, space-3=12px, space-4=16px, space-6=24px, space-8=32px, space-12=48px, space-16=64px, space-24=96px

### Border Radius
radius-sm=4px, radius-md=8px, radius-lg=12px, radius-full=9999px

### Transitions
fast=150ms ease-out, normal=250ms cubic-bezier(0.4,0,0.2,1), slow=400ms cubic-bezier(0.4,0,0.2,1)

### Components
- **Cards**: bg-surface, 1px border-default, radius-lg, p-6. Hover: border-hover + translateY(-2px) + glow-subtle. Active: scale(0.99) 100ms.
- **Buttons Primary**: bg accent-primary, text white, hover #7C6CF7, radius-md, h-10, px-4, text-sm/500.
- **Buttons Secondary**: bg transparent, border-hover, text-primary. Hover: bg rgba(255,255,255,0.04).
- **Inputs**: bg-interactive, border rgba(255,255,255,0.08), focus: border accent-primary + 3px ring at 15% opacity. h-10, radius-md.
- **Badges/Pills**: accent color at 12% opacity bg, full accent text, radius-full, px-2.5 py-0.5, text-xs/500.

## Tech Stack

### Frontend (Phase 1 — building now)
- Next.js 14 (App Router) + TypeScript 5
- Tailwind CSS 3 (dark mode: 'class')
- Framer Motion 11 (all animations, respect prefers-reduced-motion)
- xterm.js 5 + @xterm/addon-webgl (terminal)
- D3.js 7 (skill constellation graph)
- Recharts 2 (observability charts)
- Shiki 1 (syntax highlighting in code viewers)
- next-mdx-remote (blog + case studies)

### Backend (Phase 3+ — later)
- FastAPI + LangGraph + LangChain
- LiteLLM (multi-model routing: Claude, GPT-4, Llama)
- PostgreSQL + pgvector (Supabase)
- Neo4j Aura (knowledge graph memory)
- Redis 7 with Streams (event bus, cache, sessions)
- Docker Compose on Hetzner VPS + Caddy

### Deploy
- Frontend: Vercel (auto-deploy from main)
- Backend: Hetzner CX31 (4 vCPU, 8GB RAM)
- DNS/CDN: Cloudflare

## Route Structure

```
/                         Home (8 scroll sections)
/lab                      Lab overview (4 demo cards)
/lab/fullstack            Collaborative notepad demo
/lab/backend              Chaos Lab (tabbed sub-demos)
/lab/backend/chaos        Failure injection
/lab/backend/rate-limiter Token bucket visualizer
/lab/backend/event-replay Event sourcing timeline
/lab/backend/api-playground Live API explorer
/lab/ai                   AI Intelligence Lab (tabbed)
/lab/ai/rag-xray          RAG pipeline visualization
/lab/ai/embeddings        3D embedding explorer
/lab/ai/model-arena       Side-by-side LLM comparison
/lab/agent                SwarajOS multi-agent chat
/case-studies             Case study index
/case-studies/[slug]      Individual case study (MDX)
/blog                     Blog index
/blog/[slug]              Blog post (MDX)
```

## Project Structure

```
src/
  app/
    page.tsx                 # Home with 8 sections
    layout.tsx               # Root layout: fonts, dark mode, metadata
    globals.css              # CSS custom properties + Tailwind base
    lab/
      page.tsx               # Lab overview
      fullstack/page.tsx
      backend/
        page.tsx             # Chaos lab with tabs
        chaos/page.tsx
        rate-limiter/page.tsx
        event-replay/page.tsx
        api-playground/page.tsx
      ai/
        page.tsx             # AI lab with tabs
        rag-xray/page.tsx
        embeddings/page.tsx
        model-arena/page.tsx
      agent/page.tsx         # SwarajOS full-page view
    case-studies/
      page.tsx
      [slug]/page.tsx
    blog/
      page.tsx
      [slug]/page.tsx
    api/                     # Next.js API routes (proxies to backend later)
      agent/chat/route.ts
      chaos/metrics/route.ts
      stats/route.ts
  components/
    ui/                      # Primitives: Button, Card, Badge, Input, CodeBlock
    layout/                  # Navbar, Footer, Section wrapper
    terminal/                # Terminal, BootSequence, CommandParser, StatusSidebar
    agent/                   # ChatWidget, ReasoningPanel, ChatMessage
    lab/                     # ChaosLab, RAGXray, EmbeddingExplorer, ModelArena, CollabNotepad
    experience/              # Timeline, ExperienceCard
    skills/                  # SkillConstellation (D3 force graph)
    observability/           # MetricsDashboard, MetricCard, Sparkline
    hero/                    # HeroSection (combines Terminal + StatusSidebar)
  lib/
    types.ts                 # ALL TypeScript interfaces
    mock-data.ts             # Realistic mock data for every component
    api-client.ts            # Typed fetch wrappers (uses mocks in Phase 1)
    constants.ts             # Design tokens as JS objects
    utils.ts                 # cn() utility, formatters, helpers
    hooks/                   # useInView, useTerminal, useWebSocket, useAnimateOnScroll
  content/
    case-studies/            # MDX files
    blog/                    # MDX files
```

## Code Conventions

- Functional React components with hooks. No class components.
- Named exports everywhere: `export function Button()`, not `export default`.
- TypeScript strict mode. No `any` types. Define interfaces for all props.
- Collocate component-specific types in the component file. Shared types in `lib/types.ts`.
- Use `cn()` utility (clsx + tailwind-merge) for conditional Tailwind classes.
- Framer Motion for ALL animations. Wrap in `<LazyMotion>` for tree-shaking. Always check `prefers-reduced-motion`.
- Data fetching: components receive data as props. API calls happen in page.tsx or Server Components. Components are pure renderers.
- Mock data pattern: `lib/api-client.ts` exports functions like `getExperience()` that return mock data now but will fetch from the real API later. Components never import from `mock-data.ts` directly.
- File naming: PascalCase for components (`Terminal.tsx`), camelCase for utilities (`api-client.ts`), kebab-case for routes.
- CSS: Tailwind utilities only. No CSS modules. `globals.css` only for CSS custom properties and base resets.
- Images: Next.js `<Image>` component with blur placeholder. All in `public/`.
- Responsive: mobile-first. Breakpoints: sm=640, md=768, lg=1024, xl=1280.

## Section Behavior Summary

1. **Terminal Hero** (100vh): xterm.js boot sequence → interactive CLI. Status sidebar on desktop with live stats (mocked). Prompt: `visitor@swarajbangar.dev:~$` in teal.
2. **About + Skills**: 3 stat cards (count-up on scroll) + D3 force graph. Click node → filter projects.
3. **Experience Timeline**: Vertical timeline, alternating cards. Click to expand → bullets + inline architecture diagram + metrics.
4. **The Lab**: Tabbed interface (4 tabs). Each tab loads a different interactive demo section. Active tab = accent-primary pill with sliding indicator.
5. **Case Studies**: 3 cards linking to deep-dive MDX pages.
6. **Blog**: Latest 3 posts as cards with reading time + tags.
7. **Observability Wall**: Grafana-style dashboard, 6 metric panels. Auto-refresh 30s. (Mocked in Phase 1.)
8. **Contact + Footer**: 4 icon links + witty footer text.

**Floating elements** (always visible):
- AI Chat Button: fixed bottom-right, 56px circle, accent-primary, glow. Expands to 400px chat panel.
- Terminal Toggle: in navbar, opens slide-up terminal overlay covering bottom 50%.

## What NOT to Do

- No light mode implementation yet. Dark mode only for Phase 1.
- No actual backend calls. Everything uses mock data through api-client.ts.
- No localStorage or sessionStorage for state. Use React state only.
- No CSS-in-JS libraries. Tailwind only.
- No `any` types. No `@ts-ignore`.
- No default exports.
- No inline styles except for truly dynamic values (e.g., D3 computed positions).
- No parallax effects. No scroll hijacking.
- No heavy dependencies without asking first (keep initial bundle < 150KB gzip).
