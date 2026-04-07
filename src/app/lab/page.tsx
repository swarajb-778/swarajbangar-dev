import Link from 'next/link';
import { Code2, Server, Brain, Bot } from 'lucide-react';
import { Badge } from '@/components/ui';

const DEMOS = [
  {
    title: 'Collaborative Notepad',
    description: 'Real-time collaborative editing with WebSocket infrastructure.',
    href: '/lab/fullstack',
    icon: Code2,
    tech: ['React', 'Socket.io', 'Redis'],
    color: 'var(--accent-gold)',
  },
  {
    title: 'Chaos Lab',
    description: 'Failure injection, circuit breakers, rate limiting, and event replay.',
    href: '/lab/backend',
    icon: Server,
    tech: ['Go', 'Redis Streams', 'Docker'],
    color: 'var(--accent-teal)',
  },
  {
    title: 'Intelligence Lab',
    description: 'RAG X-ray, 3D embeddings, and side-by-side model comparison.',
    href: '/lab/ai',
    icon: Brain,
    tech: ['LangChain', 'pgvector', 'Claude API'],
    color: 'var(--accent-primary)',
  },
  {
    title: 'SwarajOS',
    description: 'Multi-agent system with visible reasoning chains and tool calls.',
    href: '/lab/agent',
    icon: Bot,
    tech: ['LangGraph', 'Neo4j', 'Pyodide'],
    color: 'var(--accent-emerald)',
  },
] as const;

export default function LabPage() {
  return (
    <div className="min-h-screen bg-bg-base pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-accent-primary mb-3">
          {'// lab'}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary font-display mb-3">
          Interactive Demos
        </h1>
        <p className="text-text-secondary mb-12 max-w-2xl">
          Each demo is a working system — not a mockup. Explore distributed
          infrastructure, AI pipelines, and multi-agent orchestration hands-on.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {DEMOS.map(({ title, description, href, icon: Icon, tech, color }) => (
            <Link
              key={href}
              href={href}
              className="group bg-bg-surface border border-border-default rounded-lg p-6 hover:border-border-hover hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center size-10 rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                    color,
                  }}
                >
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  {title}
                </h2>
              </div>
              <p className="text-sm text-text-secondary mb-4">{description}</p>
              <div className="flex flex-wrap gap-1.5">
                {tech.map((t) => (
                  <Badge key={t} variant="gray">{t}</Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
