import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'purple'
  | 'teal'
  | 'pink'
  | 'gold'
  | 'emerald'
  | 'coral'
  | 'gray';

export interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly children: ReactNode;
  readonly dot?: boolean;
  readonly className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  purple: 'bg-accent-primary/12 text-accent-primary',
  teal: 'bg-accent-teal/12 text-accent-teal',
  pink: 'bg-accent-pink/12 text-accent-pink',
  gold: 'bg-accent-gold/12 text-accent-gold',
  emerald: 'bg-accent-emerald/12 text-accent-emerald',
  coral: 'bg-accent-coral/12 text-accent-coral',
  gray: 'bg-white/[0.06] text-text-secondary',
};

const dotColors: Record<BadgeVariant, string> = {
  purple: 'bg-accent-primary',
  teal: 'bg-accent-teal',
  pink: 'bg-accent-pink',
  gold: 'bg-accent-gold',
  emerald: 'bg-accent-emerald',
  coral: 'bg-accent-coral',
  gray: 'bg-text-muted',
};

export function Badge({
  variant = 'purple',
  children,
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full animate-pulse',
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
