'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly hover?: boolean;
  readonly glass?: boolean;
}

export function Card({
  children,
  hover = false,
  glass = false,
  className,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-6',
        'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        glass
          ? 'glass-surface'
          : 'bg-bg-surface border border-border-default',
        hover && [
          'hover:border-white/[0.1] hover:-translate-y-0.5 hover:shadow-glow-subtle',
          'active:scale-[0.99] active:duration-100',
        ],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
