# Project: swarajbangar.dev

## What this is
A dark-mode, terminal-inspired developer portfolio with live interactive demos
and a multi-agent AI system (SwarajOS). See PRD.md for full spec.

## Design Tokens
- bg-base: #0A0A0F, bg-surface: #12121A, bg-elevated: #1A1A2E
- accent-primary: #6C5CE7, accent-teal: #00CEC9, accent-pink: #FD79A8
- accent-gold: #FDCB6E, accent-emerald: #00B894, accent-coral: #E17055
- text-primary: #F0F0F0, text-secondary: #B0B0C0, text-muted: #6B6B80
- fonts: Inter (sans), JetBrains Mono (code), Space Grotesk (display)

## Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- Terminal: xterm.js v5 with WebGL renderer
- Backend: FastAPI, LangGraph, Redis, pgvector, Neo4j
- Deploy: Vercel (frontend), Hetzner VPS Docker Compose (backend)

## Current Phase: Phase 2 — Terminal + Navigation + Interactivity

Phase 1 is complete. All 8 sections render with mock data. Terminal has basic
boot sequence. Chat button floats. Now making everything REAL:

- Terminal: command history (up/down), tab completion, all commands wired to
  real navigation actions (scroll, route, open URLs)
- Easter eggs: neofetch, sudo hire swaraj, matrix rain, coffee, rm -rf /
- Keyboard shortcuts: /, Cmd+K, Escape, Cmd+Shift+A, 1-8, j/k, ?, t
- Terminal overlay: resizable, persistent state, split-view with source code
- View-source toggle: every lab demo shows its implementation code
- Active section detection: nav highlights, scroll progress bar, section dots
- Commands use ANSI escape codes for colored output in xterm.js

### Key files added/modified in Phase 2:
- src/lib/hooks/useCommandHistory.ts (terminal history)
- src/lib/hooks/useTabCompletion.ts (autocomplete engine)
- src/lib/hooks/useTerminalActions.ts (command → navigation bridge)
- src/lib/hooks/useKeyboardShortcuts.ts (global shortcut registry)
- src/lib/hooks/useActiveSection.ts (scroll-aware section tracking)
- src/components/terminal/Terminal.tsx (major upgrade: history, completion, resize)
- src/components/terminal/CommandParser.ts (all commands fully implemented)
- src/components/terminal/TerminalOverlay.tsx (resize, persistence, split-view)
- src/components/layout/ShortcutsOverlay.tsx (keyboard shortcuts help modal)
- src/components/layout/ScrollProgress.tsx (top progress bar)
- src/components/layout/SectionIndicator.tsx (right-edge dot navigation)
- src/components/lab/ViewSourceToggle.tsx (demo/code split-pane)
- src/components/lab/CodeViewer.tsx (multi-file code viewer with tabs)
- src/components/lab/DemoContainer.tsx (wrapper for all lab demos)

## Code Style
- Functional React components with hooks
- Named exports, not default exports
- Collocate types with components when single-use
- Shared types in src/lib/types.ts
- Use cn() utility (clsx + tailwind-merge) for conditional classes
- Framer Motion for all animations, respecting prefers-reduced-motion
```

**Step 2: First Claude Code prompt — scaffold the entire project.**

Run `claude` in your terminal and give it this:
```
Read PRD.md and CLAUDE.md. Scaffold the complete Phase 1 Next.js project:

1. Initialize Next.js 14 with App Router, TypeScript, Tailwind CSS
2. Set up tailwind.config.ts with all dark mode design tokens from CLAUDE.md
3. Create the full directory structure from PRD Section 11.3
4. Build src/lib/types.ts with all TypeScript interfaces (AgentStep, 
   ChaosMetrics, RAGResult, ChatMessage, SkillNode, ExperienceEntry)
5. Build src/lib/mock-data.ts with realistic mock data for every component
6. Create src/components/ui/ primitives: Button, Card, Badge, Input, 
   CodeBlock — all using the design tokens
7. Create the root layout with Inter + JetBrains Mono fonts, dark mode 
   class, and metadata
8. Create page.tsx with placeholder sections for all 8 sections
9. Create the global.css with CSS custom properties from PRD Section 11.1
10. Add the cn() utility with clsx + tailwind-merge

Don't build individual section components yet — just the skeleton 
with proper types and structure. I'll build each section next.
```

Claude Code will generate 30-40 files in about 2-3 minutes. Review, commit.

**Step 3: Build Section 1 (Terminal Hero) in Claude Code.**
```
Build the Terminal Hero section (Section 4.1 from PRD.md):

1. Create src/components/terminal/Terminal.tsx using xterm.js with 
   WebGL renderer
2. Create src/components/terminal/commands.ts with the command parser 
   (all 15 commands from the PRD)
3. Create src/components/terminal/BootSequence.tsx with the typewriter 
   animation (40ms per char, 200ms between lines)
4. Create src/components/terminal/StatusSidebar.tsx with 4 metric cards 
   (GitHub activity, uptime, agent chats, visitors) using mock data
5. Wire everything into a HeroSection component that occupies 100vh
6. Use the exact terminal theme from PRD: bg-elevated background, 
   accent-teal prompt color, JetBrains Mono font at 14px
7. Implement the slide-up terminal overlay triggered by the nav button

Install xterm.js and @xterm/addon-webgl as dependencies.
```

**Step 4: Open in Cursor, iterate visually.**

Now open the project in Cursor. Run `npm run dev`. You'll see the terminal rendering. This is where Cursor shines — you're looking at the real thing and tweaking:

- "Make the cursor glow more subtle, use box-shadow with 6px spread"
- "The boot sequence feels too fast, change to 50ms per character"
- "Add a slight blur to the terminal container border"
- "Make the status sidebar cards animate in with stagger delay"

Use Cursor Composer (Cmd+I) for changes that touch multiple files. Use inline Chat (Cmd+K) for single-line tweaks.

**Step 5: Repeat for each section.**

Go back to Claude Code for each new section (About + Skills, Experience Timeline, Lab tabs, etc.). Claude Code generates the component structure and logic. Then switch to Cursor for visual polish. The rhythm is:
```
Claude Code: "Build Section 3: Experience Timeline with expandable 
cards, mock data for 4 roles, and Framer Motion expand animation"
→ generates 3-4 files

Cursor: tweak animations, spacing, responsive behavior, hover states
→ 15-20 quick iterations looking at the browser
```

**Step 6: Use Antigravity for experiments.**

Before you build something complex like the 3D embedding explorer or the chaos lab particle animation, prototype it in Antigravity first. Create a throwaway project:
```
Build a standalone React component that visualizes a token bucket 
rate limiter. Show requests as colored particles flowing through 
a funnel — green for accepted, amber for queued, red for rejected. 
Add a slider to control incoming RPS from 1 to 10000. 
Use Framer Motion for particle animation.