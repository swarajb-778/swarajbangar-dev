import Link from 'next/link';
import { Badge } from '@/components/ui';
import type { CaseStudy } from '@/lib/types';

export interface CaseStudyCardProps {
  readonly study: CaseStudy;
}

const TOPIC_COLORS: Record<string, string> = {
  'multi-agent-orchestration': 'var(--accent-primary)',
  'event-driven-migration': 'var(--accent-teal)',
  'rag-pipeline-tuning': 'var(--accent-emerald)',
} as const;

export function CaseStudyCard({ study }: CaseStudyCardProps) {
  const color = TOPIC_COLORS[study.slug] ?? 'var(--accent-primary)';

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="group bg-bg-surface border border-border-default rounded-lg p-6 hover:border-border-hover hover:-translate-y-0.5 transition-all duration-150 border-l-4 block"
      style={{ borderLeftColor: color }}
    >
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
    </Link>
  );
}
