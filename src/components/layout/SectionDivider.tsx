import { cn } from '@/lib/utils';

export interface SectionDividerProps {
  readonly label?: string;
  readonly className?: string;
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div className={cn('relative flex items-center max-w-7xl mx-auto px-6', className)}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent-primary/20 to-transparent" />
      {label && (
        <span className="px-4 text-xs font-mono text-text-disabled tracking-wider">
          {label}
        </span>
      )}
      {label && (
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent-primary/20 to-transparent" />
      )}
    </div>
  );
}
