'use client';

// ═══════════════════════════════════════════════════════════════
// AboutSection — Bio + StatCards + SkillConstellation
// ═══════════════════════════════════════════════════════════════

import { Briefcase, Zap, Building2 } from 'lucide-react';
import { StatCard } from './StatCard';
import { SkillConstellation } from '@/components/skills/SkillConstellation';

const STATS = [
  {
    label: 'Experience',
    value: '4+ Years',
    icon: Briefcase,
    color: 'var(--accent-primary)',
  },
  {
    label: 'Requests/Day',
    value: '50M+',
    icon: Zap,
    color: 'var(--accent-teal)',
  },
  {
    label: 'Enterprises',
    value: '1.8K+',
    icon: Building2,
    color: 'var(--accent-emerald)',
  },
] as const;

export function AboutSection() {
  return (
    <div className="grid lg:grid-cols-[55%_45%] gap-12">
      {/* Left: Text + Stats */}
      <div className="space-y-5">
        <p className="text-text-secondary leading-relaxed text-lg">
          AI engineer who builds production agent systems — not demos, not
          prototypes, but systems that serve{' '}
          <span className="text-accent-emerald font-medium">1.8K+ enterprises</span>{' '}
          daily.
        </p>
        <p className="text-text-secondary leading-relaxed">
          Previously at{' '}
          <span className="text-accent-gold font-medium">Amazon</span> building
          payment infrastructure processing 50M+ requests/day. Currently
          exploring the frontier of agentic AI: multi-agent orchestration, RAG
          pipeline optimization, and making LLMs actually reliable in production.
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
  );
}
