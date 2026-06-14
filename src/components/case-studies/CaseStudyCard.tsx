import Link from 'next/link';
import { Badge } from '@/components/ui';
import { CornerGlowCard, type CornerGlowTint } from '@/components/ui/CornerGlowCard';
import type { CaseStudy } from '@/lib/types';

export interface CaseStudyCardProps {
  readonly study: CaseStudy;
}

const TOPIC_TINTS: Record<string, CornerGlowTint> = {
  'multi-agent-orchestration': 'purple',
  'event-driven-migration': 'teal',
  'rag-pipeline-tuning': 'emerald',
};

export function CaseStudyCard({ study }: CaseStudyCardProps) {
  const tint = TOPIC_TINTS[study.slug] ?? 'purple';

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="group block h-full"
    >
      <CornerGlowCard tint={tint} style={{ height: '100%' }}>
        <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2">
          {study.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {study.headline}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {study.techFocus.map((tech) => (
            <Badge key={tech} variant="gray">{tech}</Badge>
          ))}
        </div>
        <span className="text-sm text-accent-primary group-hover:text-[#7C6CF7] transition-colors">
          Read Case Study &rarr;
        </span>
      </CornerGlowCard>
    </Link>
  );
}
