'use client';

// ═══════════════════════════════════════════════════════════════
// AboutSection — Bio + StatCards + SkillConstellation
// ═══════════════════════════════════════════════════════════════

import dynamic from 'next/dynamic';
import { Briefcase, Zap, Building2 } from 'lucide-react';
import { StatCard } from './StatCard';
import { Marquee } from '@/components/ui/Marquee';
import { ConstellationSkeleton } from '@/components/ui/Skeleton';

const SkillConstellation = dynamic(
  () => import('@/components/skills/SkillConstellation').then(m => m.SkillConstellation),
  { ssr: false, loading: () => <ConstellationSkeleton /> }
);

const STATS = [
  {
    label: 'Experience',
    value: '4+ Years',
    icon: Briefcase,
    color: 'var(--accent-primary)',
  },
  {
    label: 'Txns/Month',
    value: '500K+',
    icon: Zap,
    color: 'var(--accent-teal)',
  },
  {
    label: 'Reconciliation',
    value: '97%',
    icon: Building2,
    color: 'var(--accent-emerald)',
  },
] as const;

const TECH_STACK = [
  'Python', 'TypeScript', 'FastAPI', 'LangGraph', 'LangChain', 'Next.js',
  'React', 'PostgreSQL', 'pgvector', 'Redis', 'Neo4j', 'Kafka',
  'Docker', 'Claude', 'Go', 'Three.js',
] as const;

export function AboutSection() {
  return (
    <div className="space-y-10">
      <div className="grid lg:grid-cols-[55%_45%] gap-12">
      {/* Left: Text + Stats */}
      <div className="space-y-5">
        <p className="text-text-secondary leading-relaxed text-lg">
          Full-stack engineer who builds financial systems people trust — not
          demos, but money-critical systems that serve{' '}
          <span className="text-accent-emerald font-medium">15K+ daily transactions</span>{' '}
          at McKinsey.
        </p>
        <p className="text-text-secondary leading-relaxed">
          Previously at{' '}
          <span className="text-accent-gold font-medium">ThoughtWorks</span> building
          fintech lending &amp; payment-reconciliation platforms (500K+ txns/month).
          Now layering GenAI and ML — RAG, LangChain, Pinecone — on solid
          Python/React/AWS foundations.
        </p>
        <p className="text-text-secondary leading-relaxed">
          I believe the best way to prove engineering skills is to{' '}
          <span className="text-accent-primary font-medium">
            let people interact with them
          </span>
          . That&apos;s why this portfolio is a working product, not a resume page.
        </p>

        {/* Stat cards */}
        <div className="flex gap-4 pt-2">
          {STATS.map((stat, i) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Right: Skill Constellation */}
      <div className="min-h-[350px] rounded-lg border border-border-default bg-bg-surface p-4 relative overflow-hidden">
        <SkillConstellation />
      </div>
      </div>

      {/* Tech-stack marquee — infinite strip of daily drivers */}
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-text-muted mb-4">
          Daily drivers
        </p>
        <Marquee duration={32} gap={40} className="py-1">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="font-mono text-sm text-text-muted whitespace-nowrap transition-colors hover:text-accent-teal"
            >
              {tech}
            </span>
          ))}
        </Marquee>
      </div>
    </div>
  );
}
