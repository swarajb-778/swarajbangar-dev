// ═══════════════════════════════════════════════════════════════
// CommandParser — Pure function for terminal command processing
// ═══════════════════════════════════════════════════════════════

import { SITE_CONFIG } from '@/lib/constants';

export interface CommandResult {
  readonly output: readonly string[];
  readonly action?: 'scroll_to' | 'navigate' | 'open_url' | 'clear' | 'open_chat';
  readonly target?: string;
}

const HELP_TEXT: readonly string[] = [
  '',
  '\x1b[1;35m  Available Commands\x1b[0m',
  '\x1b[90m  ─────────────────────────────────────────\x1b[0m',
  '  \x1b[36mhelp\x1b[0m          Show this help message',
  '  \x1b[36mabout\x1b[0m         Who I am and what I do',
  '  \x1b[36mskills\x1b[0m        Technical skills by category',
  '  \x1b[36mexperience\x1b[0m    Work history timeline',
  '  \x1b[36mprojects\x1b[0m      Interactive demos and labs',
  '  \x1b[36mresume\x1b[0m        Open resume (PDF)',
  '  \x1b[36mcontact\x1b[0m       Get in touch',
  '  \x1b[36magent\x1b[0m         Chat with my AI assistant',
  '  \x1b[36mclear\x1b[0m         Clear terminal',
  '',
  '\x1b[90m  Easter eggs:\x1b[0m',
  '  \x1b[36mls\x1b[0m            List portfolio sections',
  '  \x1b[36mcat about.md\x1b[0m  Read about me',
  '  \x1b[36mneofetch\x1b[0m      System information',
  '  \x1b[36mapi\x1b[0m           Portfolio API example',
  '  \x1b[36msudo hire swaraj\x1b[0m  Try it ;)',
  '',
];

const NEOFETCH_ART: readonly string[] = [
  '',
  '\x1b[35m   ███████╗██████╗ \x1b[0m',
  '\x1b[35m   ██╔════╝██╔══██╗\x1b[0m  \x1b[1;37mvisitor\x1b[0m@\x1b[1;35mswarajbangar.dev\x1b[0m',
  '\x1b[35m   ███████╗██████╔╝\x1b[0m  \x1b[90m────────────────────────\x1b[0m',
  '\x1b[35m   ╚════██║██╔══██╗\x1b[0m  \x1b[35mOS:\x1b[0m      Next.js 16 + App Router',
  '\x1b[35m   ███████║██████╔╝\x1b[0m  \x1b[35mShell:\x1b[0m   xterm.js 5',
  '\x1b[35m   ╚══════╝╚═════╝ \x1b[0m  \x1b[35mDE:\x1b[0m      Tailwind CSS 4',
  '                     \x1b[35mCPU:\x1b[0m     Claude Sonnet 4',
  '                     \x1b[35mGPU:\x1b[0m     Framer Motion 11',
  '                     \x1b[35mMemory:\x1b[0m  Neo4j + pgvector',
  '                     \x1b[35mUptime:\x1b[0m  99.97%',
  '                     \x1b[35mStatus:\x1b[0m  \x1b[32m● Open to Senior Roles\x1b[0m',
  '',
];

const SKILLS_BY_CATEGORY: Record<string, readonly string[]> = {
  'AI / ML': [
    'Python', 'LangChain', 'LangGraph', 'RAG Pipelines',
    'Claude API', 'GPT-4', 'Embeddings',
  ],
  'Backend': [
    'FastAPI', 'Go', 'PostgreSQL', 'pgvector',
    'Redis', 'Docker',
  ],
  'Frontend': [
    'React', 'Next.js', 'TypeScript', 'Tailwind CSS',
    'Framer Motion', 'D3.js',
  ],
  'Tools': [
    'AWS', 'Kubernetes', 'Neo4j', 'Supabase', 'Vercel',
  ],
};

const LS_OUTPUT: readonly string[] = [
  '',
  '\x1b[1;34m.\x1b[0m',
  '\x1b[1;34m├── \x1b[36mabout/\x1b[0m          Who I am',
  '\x1b[1;34m├── \x1b[36mexperience/\x1b[0m     Where I\'ve built things',
  '\x1b[1;34m├── \x1b[36mlab/\x1b[0m            Interactive demos',
  '\x1b[1;34m│   ├── \x1b[33mfullstack\x1b[0m   Collaborative notepad',
  '\x1b[1;34m│   ├── \x1b[33mbackend\x1b[0m     Chaos Lab + API playground',
  '\x1b[1;34m│   ├── \x1b[33mai\x1b[0m          RAG X-ray + Embeddings + Arena',
  '\x1b[1;34m│   └── \x1b[33magent\x1b[0m       SwarajOS multi-agent chat',
  '\x1b[1;34m├── \x1b[36mcase-studies/\x1b[0m    Deep dives',
  '\x1b[1;34m├── \x1b[36mblog/\x1b[0m           Thinking out loud',
  '\x1b[1;34m├── \x1b[36mobservability/\x1b[0m   Self-monitoring dashboard',
  '\x1b[1;34m└── \x1b[36mcontact/\x1b[0m        Let\'s connect',
  '',
];

const CAT_ABOUT: readonly string[] = [
  '',
  '\x1b[1;37m# about.md\x1b[0m',
  '',
  '  AI engineer who builds production agent systems — not demos,',
  '  not prototypes, but systems that serve 1.8K+ enterprises daily.',
  '',
  '  Previously at Amazon building payment infrastructure processing',
  '  50M+ requests/day. Currently exploring the frontier of agentic AI:',
  '  multi-agent orchestration, RAG pipeline optimization, and making',
  '  LLMs actually reliable in production.',
  '',
  `  \x1b[90m— ${SITE_CONFIG.name}, ${SITE_CONFIG.title}\x1b[0m`,
  '',
];

const CONTACT_OUTPUT: readonly string[] = [
  '',
  '\x1b[1;37m  Contact\x1b[0m',
  '\x1b[90m  ────────────────────────────\x1b[0m',
  `  \x1b[36m📧\x1b[0m  ${SITE_CONFIG.email}`,
  `  \x1b[36m🔗\x1b[0m  ${SITE_CONFIG.linkedin}`,
  `  \x1b[36m🐙\x1b[0m  ${SITE_CONFIG.github}`,
  `  \x1b[36m📄\x1b[0m  ${SITE_CONFIG.url}${SITE_CONFIG.resume}`,
  '',
];

const API_OUTPUT: readonly string[] = [
  '',
  '\x1b[90m  # Try the portfolio API\x1b[0m',
  '',
  `  \x1b[32mcurl\x1b[0m ${SITE_CONFIG.url}/api/stats`,
  '',
  '  \x1b[90m# Response:\x1b[0m',
  '  {',
  '    "experience_years": 4,',
  '    "daily_requests": "50M+",',
  '    "enterprises_served": "1.8K+",',
  '    "agent_accuracy": "94%",',
  '    "status": "open_to_work"',
  '  }',
  '',
];

export function parseCommand(input: string): CommandResult {
  const trimmed = input.trim().toLowerCase();
  const [cmd, ...args] = trimmed.split(/\s+/);

  switch (cmd) {
    case 'help':
      return { output: HELP_TEXT };

    case 'about':
      return {
        output: ['\x1b[32m  Scrolling to about section...\x1b[0m', ''],
        action: 'scroll_to',
        target: 'about',
      };

    case 'skills': {
      const lines: string[] = [''];
      for (const [category, skills] of Object.entries(SKILLS_BY_CATEGORY)) {
        lines.push(`  \x1b[1;35m${category}\x1b[0m`);
        lines.push(`  ${skills.map((s) => `\x1b[36m${s}\x1b[0m`).join(' · ')}`);
        lines.push('');
      }
      return {
        output: [...lines, '\x1b[32m  Scrolling to about section...\x1b[0m', ''],
        action: 'scroll_to',
        target: 'about',
      };
    }

    case 'experience':
      return {
        output: [
          '',
          '  \x1b[1;33mMeshi.io\x1b[0m      AI Engineer          Jan 2024 – Present',
          '  \x1b[1;33mAmazon\x1b[0m        SDE                   Jun 2022 – Dec 2023',
          '  \x1b[1;33mSoftgenio\x1b[0m     Full Stack Developer  Aug 2021 – May 2022',
          '  \x1b[1;33mBlack Box\x1b[0m     Software Engineer     Jan 2021 – Jul 2021',
          '',
          '\x1b[32m  Scrolling to experience section...\x1b[0m',
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
          '  \x1b[1;37mThe Lab\x1b[0m — Interactive demos that prove the skills',
          '',
          '  \x1b[36m1.\x1b[0m Full-Stack Notepad  — Real-time collaborative editing',
          '  \x1b[36m2.\x1b[0m Chaos Lab           — Failure injection + circuit breakers',
          '  \x1b[36m3.\x1b[0m AI Intelligence     — RAG X-ray, Embeddings, Model Arena',
          '  \x1b[36m4.\x1b[0m SwarajOS            — Multi-agent chat system',
          '',
          '\x1b[32m  Scrolling to lab section...\x1b[0m',
          '',
        ],
        action: 'scroll_to',
        target: 'lab',
      };

    case 'resume':
      return {
        output: ['\x1b[32m  Opening resume...\x1b[0m', ''],
        action: 'open_url',
        target: SITE_CONFIG.resume,
      };

    case 'contact':
      return { output: CONTACT_OUTPUT };

    case 'agent':
    case 'chat':
      return {
        output: ['\x1b[32m  Opening AI assistant...\x1b[0m', ''],
        action: 'open_chat',
      };

    case 'clear':
      return { output: [], action: 'clear' };

    case 'api':
      return { output: API_OUTPUT };

    case 'ls':
      return { output: LS_OUTPUT };

    case 'cat':
      if (args.join(' ') === 'about.md') {
        return { output: CAT_ABOUT };
      }
      return { output: [`\x1b[31m  cat: ${args.join(' ')}: No such file or directory\x1b[0m`, ''] };

    case 'neofetch':
      return { output: NEOFETCH_ART };

    case 'sudo':
      if (args.join(' ') === 'hire swaraj') {
        return {
          output: [
            '',
            '\x1b[32m  ✓ Access granted!\x1b[0m',
            `  \x1b[1;37m  Contact: ${SITE_CONFIG.email}\x1b[0m`,
            `  \x1b[1;37m  LinkedIn: ${SITE_CONFIG.linkedin}\x1b[0m`,
            '',
            '  \x1b[33m  Excellent choice. Let\'s build something amazing together.\x1b[0m',
            '',
          ],
        };
      }
      return { output: ['\x1b[31m  sudo: permission denied. Nice try though.\x1b[0m', ''] };

    case 'cd':
      return { output: ['\x1b[33m  Nice try, but this isn\'t that kind of terminal ;)\x1b[0m', ''] };

    case 'rm':
      return { output: ['\x1b[31m  Whoa there! This portfolio took too long to build.\x1b[0m', ''] };

    case '':
      return { output: [] };

    default:
      return {
        output: [
          `\x1b[31m  Command not found: ${cmd}\x1b[0m. Type \x1b[36mhelp\x1b[0m for available commands.`,
          '',
        ],
      };
  }
}
