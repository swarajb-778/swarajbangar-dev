'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import type { MetricCard } from '@/lib/types';

const ObservabilityWall = dynamic(
  () => import('./ObservabilityWall').then((m) => m.ObservabilityWall),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    ),
  }
);

export interface ObservabilityWallLazyProps {
  readonly metrics: readonly MetricCard[];
}

export function ObservabilityWallLazy({ metrics }: ObservabilityWallLazyProps) {
  return <ObservabilityWall metrics={metrics} />;
}
