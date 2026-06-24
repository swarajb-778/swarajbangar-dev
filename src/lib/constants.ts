// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — Constants & Configuration
// ═══════════════════════════════════════════════════════════════

import type { ExperienceEntry, SkillNode } from './types';

// ── Site Configuration ──

export const SITE_CONFIG = {
  name: 'Swaraj Bangar',
  title: 'Full Stack Developer',
  description:
    'Full-stack engineer building financial systems people trust — Python/FastAPI/React/AWS with GenAI & ML. Currently at McKinsey; previously ThoughtWorks.',
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
      text: '$ connecting to: mckinsey | thoughtworks | cal_state',
      color: 'gold',
    },
    {
      text: '$ status: open_to_software_engineering_roles | san_francisco | open_to_relocate',
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
    company: 'McKinsey & Company',
    title: 'Full Stack Developer',
    dates: 'Jan 2026 – Present',
    description:
      'Building a treasury & credit-risk intelligence platform: cloud-native Python/FastAPI microservices over 15K+ daily transactions, React dashboards, Kafka real-time monitoring, and a RAG/LangChain/Pinecone GenAI layer so analysts get grounded answers instead of raw tables. Brought ML forecasting (MLflow) into risk reporting and hardened it all with Docker/Kubernetes/Terraform/CI-CD on AWS.',
    metrics: [
      { label: 'Backend scalability', value: '+42%' },
      { label: 'Analyst research effort', value: '-40%' },
      { label: 'Forecast accuracy', value: '82→96%' },
    ],
    technologies: [
      'Python',
      'FastAPI',
      'React',
      'GraphQL',
      'Kafka',
      'RAG',
      'LangChain',
      'Pinecone',
      'AWS',
    ],
  },
  {
    company: 'ThoughtWorks',
    title: 'Senior Full Stack Software Engineer',
    dates: 'Dec 2023 – Sep 2024',
    description:
      'Promoted to Senior on the fintech lending & payment platforms. Cut loan-application processing time 38% with workflow automation, Redis caching and backend tuning; modernized deployment automation and platform security (Docker, Jenkins, CI/CD, OAuth 2.0, JWT) for +30% stability; and owned production reliability — remediating critical incidents to lift availability 32% and cut resolution time 27%.',
    metrics: [
      { label: 'System availability', value: '+32%' },
      { label: 'Loan processing time', value: '-38%' },
      { label: 'Platform stability', value: '+30%' },
    ],
    technologies: [
      'Python',
      'Redis',
      'Docker',
      'Jenkins',
      'CI/CD',
      'OAuth 2.0',
      'JWT',
      'Microservices',
    ],
  },
  {
    company: 'ThoughtWorks',
    title: 'Full Stack Software Engineer',
    dates: 'May 2021 – Dec 2023',
    description:
      'Built fintech lending & payment-reconciliation platforms processing 500K+ monthly transactions at 99.8% accuracy. Took reconciliation accuracy from 84% to 97% with automated matching engines, event-driven validation and PostgreSQL query optimization; established secure onboarding/transaction-validation workflows (-34% onboarding time); and accelerated exception detection & settlement tracking 45% with Pandas/Kafka ETL pipelines.',
    metrics: [
      { label: 'Reconciliation accuracy', value: '84→97%' },
      { label: 'Monthly transactions', value: '500K+' },
      { label: 'Onboarding time', value: '-34%' },
    ],
    technologies: [
      'Python',
      'PostgreSQL',
      'MongoDB',
      'Redis',
      'Kafka',
      'Pandas',
      'Azure',
      'REST APIs',
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
