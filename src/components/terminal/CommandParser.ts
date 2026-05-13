// ═══════════════════════════════════════════════════════════════
// CommandParser — Pure function for terminal command processing
// ═══════════════════════════════════════════════════════════════

import { SITE_CONFIG } from '@/lib/constants';
import { isSoundEnabled, setSoundEnabled } from '@/lib/hooks/useSoundEffects';

export interface CommandResult {
  readonly output: readonly string[];
  readonly action?: 'scroll_to' | 'navigate' | 'open_url' | 'clear' | 'open_chat' | 'copy';
  readonly target?: string;
  readonly copyText?: string;
}

// ── ANSI Color Helpers ──
const C = {
  purple: '\x1b[38;2;108;92;231m',
  teal: '\x1b[38;2;0;206;201m',
  gold: '\x1b[38;2;253;203;110m',
  pink: '\x1b[38;2;253;121;168m',
  emerald: '\x1b[38;2;0;184;148m',
  coral: '\x1b[38;2;225;112;85m',
  white: '\x1b[1;37m',
  muted: '\x1b[90m',
  reset: '\x1b[0m',
} as const;

/** Pad string to fixed width */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}

// ── Help Text ──
const HELP_TEXT: readonly string[] = [
  '',
  `  ${C.purple}━━━ NAVIGATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`,
  `  ${C.teal}${pad('about', 18)}${C.reset}${C.muted}Who I am and what I do${C.reset}`,
  `  ${C.teal}${pad('skills', 18)}${C.reset}${C.muted}Technical skills by category${C.reset}`,
  `  ${C.teal}${pad('experience', 18)}${C.reset}${C.muted}Work history timeline${C.reset}`,
  `  ${C.teal}${pad('projects / lab', 18)}${C.reset}${C.muted}Interactive demos and labs${C.reset}`,
  `  ${C.teal}${pad('blog', 18)}${C.reset}${C.muted}Thinking out loud${C.reset}`,
  `  ${C.teal}${pad('contact', 18)}${C.reset}${C.muted}Get in touch${C.reset}`,
  '',
  `  ${C.teal}━━━ TOOLS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`,
  `  ${C.teal}${pad('agent / chat', 18)}${C.reset}${C.muted}Chat with my AI assistant${C.reset}`,
  `  ${C.teal}${pad('resume', 18)}${C.reset}${C.muted}Open resume (PDF)${C.reset}`,
  `  ${C.teal}${pad('api', 18)}${C.reset}${C.muted}Portfolio API example${C.reset}`,
  `  ${C.teal}${pad('clear', 18)}${C.reset}${C.muted}Clear terminal${C.reset}`,
  `  ${C.teal}${pad('theme', 18)}${C.reset}${C.muted}Toggle theme${C.reset}`,
  '',
  `  ${C.gold}━━━ EXPLORE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`,
  `  ${C.teal}${pad('ls', 18)}${C.reset}${C.muted}List portfolio sections${C.reset}`,
  `  ${C.teal}${pad('cat <file>', 18)}${C.reset}${C.muted}Read about.md, skills.json, readme.md${C.reset}`,
  `  ${C.teal}${pad('neofetch', 18)}${C.reset}${C.muted}System information${C.reset}`,
  `  ${C.teal}${pad('sudo hire swaraj', 18)}${C.reset}${C.muted}Try it ;)${C.reset}`,
  '',
  `  ${C.muted}Psst... there are hidden commands 🥚${C.reset}`,
  '',
];

// ── Skills by Category ──
const SKILLS_BY_CATEGORY: Record<string, { readonly color: string; readonly skills: readonly string[] }> = {
  'AI / ML': {
    color: C.purple,
    skills: ['Python', 'LangChain', 'LangGraph', 'RAG Pipelines', 'Claude API', 'GPT-4', 'Embeddings'],
  },
  'Backend': {
    color: C.emerald,
    skills: ['FastAPI', 'Go', 'PostgreSQL', 'pgvector', 'Redis', 'Docker'],
  },
  'Frontend': {
    color: C.teal,
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'D3.js'],
  },
  'Infra': {
    color: C.gold,
    skills: ['AWS', 'Kubernetes', 'Neo4j', 'Supabase', 'Vercel'],
  },
};

// ── Neofetch ──
const NEOFETCH_ART: readonly string[] = [
  '',
  `${C.purple}   ███████╗██████╗ ${C.reset}`,
  `${C.purple}   ██╔════╝██╔══██╗${C.reset}  ${C.white}visitor${C.reset}@${C.purple}swarajbangar.dev${C.reset}`,
  `${C.purple}   ███████╗██████╔╝${C.reset}  ${C.muted}────────────────────────${C.reset}`,
  `${C.purple}   ╚════██║██╔══██╗${C.reset}  ${C.purple}OS:${C.reset}      Next.js 16 + App Router`,
  `${C.purple}   ███████║██████╔╝${C.reset}  ${C.purple}Shell:${C.reset}   xterm.js 5`,
  `${C.purple}   ╚══════╝╚═════╝ ${C.reset}  ${C.purple}DE:${C.reset}      Tailwind CSS 4`,
  `                     ${C.purple}CPU:${C.reset}     Claude Sonnet 4`,
  `                     ${C.purple}GPU:${C.reset}     Framer Motion 12`,
  `                     ${C.purple}Memory:${C.reset}  Neo4j + pgvector`,
  `                     ${C.purple}Uptime:${C.reset}  99.97%`,
  `                     ${C.purple}Status:${C.reset}  ${C.emerald}● Open to Senior Roles${C.reset}`,
  '',
  `                     ${C.pink}██${C.purple}██${C.teal}██${C.emerald}██${C.gold}██${C.coral}██${C.white}██${C.muted}██${C.reset}`,
  '',
];

// ── LS Output ──
const LS_OUTPUT: readonly string[] = [
  '',
  `  ${C.teal}drwxr-xr-x${C.reset}  ${C.teal}about/${C.reset}`,
  `  ${C.teal}drwxr-xr-x${C.reset}  ${C.teal}experience/${C.reset}`,
  `  ${C.teal}drwxr-xr-x${C.reset}  ${C.teal}lab/${C.reset}`,
  `  ${C.muted}  drwxr-xr-x${C.reset}  ${C.teal}lab/fullstack/${C.reset}`,
  `  ${C.muted}  drwxr-xr-x${C.reset}  ${C.teal}lab/backend/${C.reset}`,
  `  ${C.muted}  drwxr-xr-x${C.reset}  ${C.teal}lab/ai/${C.reset}`,
  `  ${C.muted}  drwxr-xr-x${C.reset}  ${C.teal}lab/agent/${C.reset}`,
  `  ${C.teal}drwxr-xr-x${C.reset}  ${C.teal}case-studies/${C.reset}`,
  `  ${C.teal}drwxr-xr-x${C.reset}  ${C.teal}blog/${C.reset}`,
  `  ${C.muted}-rw-r--r--${C.reset}  resume.pdf`,
  `  ${C.muted}-rw-r--r--${C.reset}  README.md`,
  '',
];

// ── Cat about.md ──
const CAT_ABOUT: readonly string[] = [
  '',
  `${C.white}# about.md${C.reset}`,
  '',
  '  AI engineer who builds production agent systems — not demos,',
  '  not prototypes, but systems that serve 1.8K+ enterprises daily.',
  '',
  '  Previously at Amazon building payment infrastructure processing',
  '  50M+ requests/day. Currently exploring the frontier of agentic AI:',
  '  multi-agent orchestration, RAG pipeline optimization, and making',
  '  LLMs actually reliable in production.',
  '',
  `  ${C.muted}— ${SITE_CONFIG.name}, ${SITE_CONFIG.title}${C.reset}`,
  '',
];

// ── Cat readme.md ──
const CAT_README: readonly string[] = [
  '',
  `${C.white}# swarajbangar.dev${C.reset}`,
  '',
  `  ${C.muted}A terminal-first portfolio that proves the skills, not just lists them.${C.reset}`,
  '',
  `  ${C.teal}## Tech Stack${C.reset}`,
  `  Frontend:  Next.js 16 · TypeScript · Tailwind CSS 4 · Framer Motion 12`,
  `  Terminal:  xterm.js + WebGL · Custom shell with history + tab completion`,
  `  Backend:   FastAPI · LangGraph · PostgreSQL + pgvector · Redis · Neo4j`,
  `  AI:        Claude API · GPT-4 · RAG Pipelines · Multi-agent orchestration`,
  `  Deploy:    Vercel (frontend) · Hetzner VPS (backend) · Cloudflare (CDN)`,
  '',
  `  ${C.teal}## Features${C.reset}`,
  `  • Interactive terminal with 20+ commands and easter eggs`,
  `  • 4 live lab demos proving full-stack + AI expertise`,
  `  • AI chat assistant powered by multi-agent system`,
  `  • Real-time observability dashboard`,
  '',
  `  ${C.muted}Built with ❤️ and too much coffee.${C.reset}`,
  '',
];

// ── Cat skills.json ──
function buildSkillsJson(): readonly string[] {
  const lines: string[] = ['', `  ${C.muted}{${C.reset}`];
  const categories = Object.entries(SKILLS_BY_CATEGORY);
  categories.forEach(([category, { skills }], catIdx) => {
    lines.push(`    ${C.teal}"${category}"${C.reset}: [`);
    skills.forEach((skill, idx) => {
      const comma = idx < skills.length - 1 ? ',' : '';
      lines.push(`      ${C.gold}"${skill}"${C.reset}${comma}`);
    });
    const catComma = catIdx < categories.length - 1 ? ',' : '';
    lines.push(`    ]${catComma}`);
  });
  lines.push(`  ${C.muted}}${C.reset}`, '');
  return lines;
}

// ── Contact Card ──
const CONTACT_CARD: readonly string[] = [
  '',
  `  ${C.muted}╭─────────────────────────────────────╮${C.reset}`,
  `  ${C.muted}│${C.reset}  📧  ${SITE_CONFIG.email}       ${C.muted}│${C.reset}`,
  `  ${C.muted}│${C.reset}  🔗  ${SITE_CONFIG.linkedin}  ${C.muted}│${C.reset}`,
  `  ${C.muted}│${C.reset}  💻  ${SITE_CONFIG.github}   ${C.muted}│${C.reset}`,
  `  ${C.muted}│${C.reset}  📍  San Francisco Bay Area          ${C.muted}│${C.reset}`,
  `  ${C.muted}╰─────────────────────────────────────╯${C.reset}`,
  '',
];

// ── API Output ──
const CURL_COMMAND = `curl -X POST ${SITE_CONFIG.url}/api/stats -H 'Content-Type: application/json'`;

const API_OUTPUT: readonly string[] = [
  '',
  `  ${C.muted}# Try the portfolio API${C.reset}`,
  '',
  `  ${C.emerald}curl${C.reset} ${SITE_CONFIG.url}/api/stats`,
  '',
  `  ${C.muted}# Response:${C.reset}`,
  `  ${C.muted}{${C.reset}`,
  `    ${C.teal}"experience_years"${C.reset}: ${C.pink}4${C.reset},`,
  `    ${C.teal}"daily_requests"${C.reset}: ${C.gold}"50M+"${C.reset},`,
  `    ${C.teal}"enterprises_served"${C.reset}: ${C.gold}"1.8K+"${C.reset},`,
  `    ${C.teal}"agent_accuracy"${C.reset}: ${C.gold}"94%"${C.reset},`,
  `    ${C.teal}"status"${C.reset}: ${C.gold}"open_to_work"${C.reset}`,
  `  ${C.muted}}${C.reset}`,
  '',
  `  ${C.muted}→ Copied curl command to clipboard!${C.reset}`,
  '',
];

/** All top-level command names for tab completion */
export const COMMAND_NAMES: readonly string[] = [
  'help', 'about', 'skills', 'experience', 'projects', 'lab',
  'resume', 'contact', 'agent', 'chat', 'clear', 'api', 'ls',
  'cat', 'neofetch', 'sudo', 'cd', 'rm', 'theme', 'blog',
  'whoami', 'pwd', 'ping', 'exit', 'vim', 'nano', 'emacs',
  'matrix', 'coffee', 'date', 'sound',
] as const;

export function parseCommand(input: string): CommandResult {
  const trimmed = input.trim().toLowerCase();
  const [cmd, ...args] = trimmed.split(/\s+/);

  switch (cmd) {
    case 'help':
      return { output: HELP_TEXT };

    case 'about':
      return {
        output: [
          '',
          `  ${C.teal}AI engineer building production agent systems.${C.reset}`,
          `  ${C.muted}Previously Amazon · Currently Meshi.io${C.reset}`,
          '',
          `  ${C.emerald}→ Scrolling to about section...${C.reset}`,
          '',
        ],
        action: 'scroll_to',
        target: 'about',
      };

    case 'skills': {
      const lines: string[] = [''];
      for (const [category, { color, skills }] of Object.entries(SKILLS_BY_CATEGORY)) {
        lines.push(`  ${color}${category}:${C.reset} ${skills.map((s) => `${C.teal}${s}${C.reset}`).join(' · ')}`);
      }
      lines.push('', `  ${C.emerald}→ Scrolling to about section...${C.reset}`, '');
      return {
        output: lines,
        action: 'scroll_to',
        target: 'about',
      };
    }

    case 'experience':
      return {
        output: [
          '',
          `  ${C.gold}Meshi.io${C.reset}      ${C.teal}AI Engineer${C.reset}          Jan 2024 – Present`,
          `  ${C.gold}Amazon${C.reset}        ${C.teal}SDE${C.reset}                   Jun 2022 – Dec 2023`,
          `  ${C.gold}Softgenio${C.reset}     ${C.teal}Full Stack Developer${C.reset}  Aug 2021 – May 2022`,
          `  ${C.gold}Black Box${C.reset}     ${C.teal}Software Engineer${C.reset}     Jan 2021 – Jul 2021`,
          '',
          `  ${C.emerald}→ Scrolling to experience section...${C.reset}`,
          '',
        ],
        action: 'scroll_to',
        target: 'experience',
      };

    case 'projects':
    case 'lab':
      return {
        output: [
          '',
          `  ${C.white}The Lab${C.reset} — ${C.muted}4 live demos: Full Stack | Backend Chaos | AI Lab | SwarajOS Agent${C.reset}`,
          '',
          `  ${C.emerald}→ Scrolling to lab section...${C.reset}`,
          '',
        ],
        action: 'scroll_to',
        target: 'lab',
      };

    case 'blog':
      return {
        output: [
          '',
          `  ${C.emerald}→ Scrolling to blog section...${C.reset}`,
          '',
        ],
        action: 'scroll_to',
        target: 'blog',
      };

    case 'resume':
      return {
        output: [`  ${C.emerald}→ Opening resume...${C.reset}`, ''],
        action: 'open_url',
        target: SITE_CONFIG.resume,
      };

    case 'contact':
      return { output: CONTACT_CARD };

    case 'agent':
    case 'chat':
      return {
        output: [`  ${C.emerald}→ Launching SwarajOS agent... (or press Cmd+Shift+A)${C.reset}`, ''],
        action: 'open_chat',
      };

    case 'clear':
      return { output: [], action: 'clear' };

    case 'theme':
      return {
        output: [
          '',
          `  ${C.muted}Sorry, as a developer, I like dark mode and it's the only mode  🌒${C.reset}`,
          '',
        ],
      };

    case 'api':
      return {
        output: API_OUTPUT,
        action: 'copy',
        copyText: CURL_COMMAND,
      };

    case 'ls':
      return { output: LS_OUTPUT };

    case 'cat': {
      const file = args.join(' ');
      if (file === 'about.md') return { output: CAT_ABOUT };
      if (file === 'readme.md') return { output: CAT_README };
      if (file === 'skills.json') return { output: buildSkillsJson() };
      return {
        output: [`  ${C.pink}cat: ${file || '(no file specified)'}: No such file or directory${C.reset}`, ''],
      };
    }

    case 'neofetch':
      return { output: NEOFETCH_ART };

    case 'sudo':
      // "sudo hire swaraj" is handled by async-commands.ts with delay animation
      if (args.join(' ') === 'hire swaraj') {
        return { output: [] }; // async handler takes over
      }
      return { output: [`  ${C.pink}sudo: permission denied. Nice try though.${C.reset}`, ''] };

    case 'cd':
      return { output: [`  ${C.gold}Nice try, but this isn't that kind of terminal ;)${C.reset}`, ''] };

    case 'rm':
      return { output: [`  ${C.pink}Whoa there! This portfolio took too long to build.${C.reset}`, ''] };

    // ── Easter Eggs (hidden — not in help) ──

    case 'whoami':
      return {
        output: [
          '',
          `  ${C.teal}visitor${C.reset} — but you could be my next teammate.`,
          '',
        ],
      };

    case 'pwd':
      return {
        output: [
          '',
          `  ${C.teal}/home/swaraj/portfolio/you-found-an-easter-egg${C.reset}`,
          '',
        ],
      };

    case 'exit':
      return {
        output: [
          '',
          `  ${C.gold}You can check out any time you like, but you can never leave. 🎸${C.reset}`,
          `  ${C.muted}(...try scrolling instead)${C.reset}`,
          '',
        ],
      };

    case 'vim':
      return {
        output: [`  ${C.gold}You're already in the best editor. Type 'help' instead of :q!${C.reset}`, ''],
      };

    case 'nano':
      return {
        output: [`  ${C.gold}Real engineers use the terminal, not nano. Oh wait...${C.reset}`, ''],
      };

    case 'emacs':
      return {
        output: [`  ${C.teal}M-x hire-swaraj RET${C.reset}`, ''],
      };

    case 'coffee':
      return {
        output: [
          '',
          `  ${C.gold}      ( (${C.reset}`,
          `  ${C.gold}       ) )${C.reset}`,
          `  ${C.gold}    .______.${C.reset}`,
          `  ${C.gold}    |      |]${C.reset}`,
          `  ${C.gold}    \\      /${C.reset}`,
          `  ${C.gold}     \`----'${C.reset}`,
          '',
          `  ${C.muted}Here's your coffee. Now get back to hiring me.${C.reset}`,
          '',
        ],
      };

    case 'date':
      return {
        output: [
          '',
          `  ${C.teal}${new Date().toString()}${C.reset}`,
          `  ${C.muted}Time flies when you're exploring a great portfolio.${C.reset}`,
          '',
        ],
      };

    case 'sound': {
      const arg = args[0];
      if (arg === 'on') {
        setSoundEnabled(true);
        return {
          output: [
            '',
            `  ${C.emerald}🔊 Terminal sounds enabled.${C.reset}`,
            `  ${C.muted}Type ${C.teal}sound off${C.muted} to disable.${C.reset}`,
            '',
          ],
        };
      }
      if (arg === 'off') {
        setSoundEnabled(false);
        return {
          output: [
            '',
            `  ${C.gold}🔇 Terminal sounds disabled.${C.reset}`,
            '',
          ],
        };
      }
      const status = isSoundEnabled() ? 'on' : 'off';
      return {
        output: [
          '',
          `  ${C.teal}Terminal sound: ${status}${C.reset}`,
          `  ${C.muted}Usage: ${C.teal}sound on${C.muted} | ${C.teal}sound off${C.reset}`,
          '',
        ],
      };
    }

    case '':
      return { output: [] };

    default:
      return {
        output: [
          `  ${C.pink}Command not found: ${cmd}${C.reset}. Type ${C.teal}help${C.reset} for available commands.`,
          '',
        ],
      };
  }
}
