// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — Constants & Configuration
// ═══════════════════════════════════════════════════════════════

import type { ExperienceEntry, SkillNode } from './types';

// ── Site Configuration ──

export const SITE_CONFIG = {
  name: 'Swaraj Bangar',
  title: 'AI Engineer',
  description:
    'AI Engineer building production agent systems, distributed backends, and interactive demos. Previously Amazon, currently exploring the frontier of agentic AI.',
  url: 'https://swarajbangar.dev',
  github: 'https://github.com/swarajb-778',
  linkedin: 'https://www.linkedin.com/in/swarajb778/',
  email: 'swarajbangar778@gmail.com',
  resume: '/resume.pdf',
} as const;

// ── Terminal Configuration ──

export const TERMINAL_CONFIG = {
  prompt: 'visitor@swarajbangar.dev:~$ ',
  bootLines: [
    { text: '$ initializing swaraj_bangar.dev...', color: 'teal' },
    {
      text: '$ loading modules: [ai_engineering, distributed_systems, full_stack]',
      color: 'emerald',
    },
    {
      text: '$ connecting to: meshi.io | amazon | csu_east_bay',
      color: 'gold',
    },
    {
      text: '$ status: open_to_senior_roles | bay_area',
      color: 'emerald',
    },
    {
      text: "$ system ready. type 'help' for commands, or just scroll.",
      color: 'primary',
    },
  ],
  typingSpeed: 40,
  linePause: 300,
  cursorBlinkRate: 530,
} as const;

// ── Navigation ──

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly isExternal: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'About', href: '#about', isExternal: false },
  { label: 'Experience', href: '#experience', isExternal: false },
  { label: 'Lab', href: '#lab', isExternal: false },
  { label: 'Case Studies', href: '#case-studies', isExternal: false },
  { label: 'Blog', href: '#blog', isExternal: false },
  { label: 'Observability', href: '#observability', isExternal: false },
  { label: 'Contact', href: '#contact', isExternal: false },
] as const;

// ── Experience Data ──

export const EXPERIENCE_DATA: readonly ExperienceEntry[] = [
  {
    company: 'Meshi.io',
    title: 'AI Engineer',
    dates: 'Sep 2025 – Present',
    description:
      'Building multi-agent orchestration systems and production RAG pipelines for enterprise AI applications. Designing LangGraph-based agent workflows with real-time reasoning visibility.',
    metrics: [
      { label: 'Agents in production', value: '12+' },
      { label: 'RAG accuracy', value: '94%' },
      { label: 'Enterprises served', value: '1.8K+' },
    ],
    technologies: [
      'Python',
      'LangGraph',
      'LangChain',
      'Claude API',
      'FastAPI',
      'PostgreSQL',
      'pgvector',
      'Redis',
      'Neo4j',
    ],
  },
  {
    company: 'Amazon',
    title: 'Software Development Engineer',
    dates: 'Jun 2023 – Sep 2024',
    description:
      'Built and maintained high-throughput payment infrastructure handling 50M+ daily transactions. Designed event-driven microservices with circuit breakers and chaos engineering practices.',
    metrics: [
      { label: 'Daily requests', value: '50M+' },
      { label: 'Cost saved', value: '$320K' },
      { label: 'P95 latency', value: '45ms' },
    ],
    technologies: [
      'Java',
      'AWS',
      'DynamoDB',
      'SQS',
      'Lambda',
      'CloudFormation',
      'Go',
      'Redis',
    ],
  },
  {
    company: 'Softgenio',
    title: 'Full Stack Developer',
    dates: 'Aug 2023 – Mar 2024',
    description:
      'Developed end-to-end web applications for enterprise clients. Led migration from monolith to microservices architecture, improving deployment frequency by 4x.',
    metrics: [
      { label: 'Deploy frequency', value: '4x' },
      { label: 'API response time', value: '-60%' },
      { label: 'Client retention', value: '95%' },
    ],
    technologies: [
      'React',
      'Node.js',
      'TypeScript',
      'PostgreSQL',
      'Docker',
      'Kubernetes',
    ],
  },
  {
    company: 'Black Box',
    title: 'Software Engineer',
    dates: 'Dec 2021 – Jun 2023',
    description:
      'Built data pipeline and analytics dashboards for network infrastructure monitoring. Implemented real-time alerting system processing thousands of events per second.',
    metrics: [
      { label: 'Events processed', value: '10K/s' },
      { label: 'Alert accuracy', value: '99.2%' },
      { label: 'Dashboard users', value: '500+' },
    ],
    technologies: [
      'Python',
      'React',
      'Elasticsearch',
      'Kafka',
      'Grafana',
      'Docker',
    ],
  },
] as const;

// ── Skills Data ──

export const SKILLS_DATA: readonly SkillNode[] = [
  // AI / ML
  {
    id: 'python',
    name: 'Python',
    category: 'ai-ml',
    proficiency: 95,
    connections: ['langchain', 'langraph', 'fastapi', 'rag'],
  },
  {
    id: 'langchain',
    name: 'LangChain',
    category: 'ai-ml',
    proficiency: 90,
    connections: ['python', 'langraph', 'rag', 'claude-api'],
  },
  {
    id: 'langraph',
    name: 'LangGraph',
    category: 'ai-ml',
    proficiency: 88,
    connections: ['langchain', 'python', 'neo4j'],
  },
  {
    id: 'rag',
    name: 'RAG Pipelines',
    category: 'ai-ml',
    proficiency: 92,
    connections: ['langchain', 'pgvector', 'embeddings'],
  },
  {
    id: 'claude-api',
    name: 'Claude API',
    category: 'ai-ml',
    proficiency: 90,
    connections: ['langchain', 'gpt4'],
  },
  {
    id: 'gpt4',
    name: 'GPT-4',
    category: 'ai-ml',
    proficiency: 85,
    connections: ['claude-api', 'langchain'],
  },
  {
    id: 'embeddings',
    name: 'Embeddings',
    category: 'ai-ml',
    proficiency: 88,
    connections: ['rag', 'pgvector'],
  },

  // Backend
  {
    id: 'fastapi',
    name: 'FastAPI',
    category: 'backend',
    proficiency: 90,
    connections: ['python', 'postgresql', 'redis'],
  },
  {
    id: 'go',
    name: 'Go',
    category: 'backend',
    proficiency: 80,
    connections: ['redis', 'docker'],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'backend',
    proficiency: 88,
    connections: ['fastapi', 'pgvector', 'supabase'],
  },
  {
    id: 'pgvector',
    name: 'pgvector',
    category: 'backend',
    proficiency: 85,
    connections: ['postgresql', 'rag', 'embeddings'],
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'backend',
    proficiency: 85,
    connections: ['fastapi', 'go', 'docker'],
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'backend',
    proficiency: 82,
    connections: ['redis', 'go', 'kubernetes'],
  },

  // Frontend
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    proficiency: 92,
    connections: ['nextjs', 'typescript', 'framer-motion'],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'frontend',
    proficiency: 90,
    connections: ['react', 'typescript', 'tailwind'],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'frontend',
    proficiency: 93,
    connections: ['react', 'nextjs'],
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    category: 'frontend',
    proficiency: 90,
    connections: ['nextjs', 'framer-motion'],
  },
  {
    id: 'framer-motion',
    name: 'Framer Motion',
    category: 'frontend',
    proficiency: 82,
    connections: ['react', 'tailwind', 'd3'],
  },
  {
    id: 'd3',
    name: 'D3.js',
    category: 'frontend',
    proficiency: 75,
    connections: ['framer-motion'],
  },

  // Tools
  {
    id: 'aws',
    name: 'AWS',
    category: 'tools',
    proficiency: 85,
    connections: ['docker', 'kubernetes'],
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'tools',
    proficiency: 72,
    connections: ['docker', 'aws'],
  },
  {
    id: 'neo4j',
    name: 'Neo4j',
    category: 'tools',
    proficiency: 78,
    connections: ['langraph'],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'tools',
    proficiency: 80,
    connections: ['postgresql'],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'tools',
    proficiency: 85,
    connections: ['nextjs'],
  },
] as const;
