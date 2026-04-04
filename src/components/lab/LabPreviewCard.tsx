'use client';

// ═══════════════════════════════════════════════════════════════
// LabPreviewCard — Demo preview with features, tech stack, status
// ═══════════════════════════════════════════════════════════════

import { Check, ArrowRight, Bell } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

export interface LabPreviewCardProps {
  readonly title: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly techStack: readonly string[];
  readonly status: 'live' | 'coming-soon';
  readonly demoUrl?: string;
}

export function LabPreviewCard({
  title,
  description,
  features,
  techStack,
  status,
  demoUrl,
}: LabPreviewCardProps) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-6 hover:border-border-hover transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            {description}
          </p>
        </div>
        {status === 'live' ? (
          <Badge variant="emerald" dot>Live Demo</Badge>
        ) : (
          <Badge variant="gold">Coming Soon</Badge>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2 mb-5">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <Check size={14} className="text-accent-emerald flex-shrink-0" />
            <span className="text-sm text-text-secondary">{feature}</span>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {techStack.map((tech) => (
          <Badge key={tech} variant="gray">{tech}</Badge>
        ))}
      </div>

      {/* Action */}
      {status === 'live' ? (
        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          onClick={() => {
            if (demoUrl) window.location.href = demoUrl;
          }}
        >
          Launch Demo
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          icon={Bell}
        >
          Notify Me
        </Button>
      )}
    </div>
  );
}
