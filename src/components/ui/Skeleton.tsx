import { cn } from '@/lib/utils';

export interface SkeletonProps {
  readonly className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-bg-interactive',
        className
      )}
    />
  );
}

export function TerminalSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] rounded-lg bg-bg-surface border border-border-default p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="size-3 rounded-full" />
        <Skeleton className="size-3 rounded-full" />
        <Skeleton className="size-3 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function ConstellationSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="flex justify-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-7 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-bg-surface rounded-md p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-10 w-full mt-2" />
    </div>
  );
}
