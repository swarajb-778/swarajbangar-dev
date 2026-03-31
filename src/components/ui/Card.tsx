'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly hover?: boolean;
}

export function Card({
  children,
  hover = false,
  className,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-surface border border-border-default rounded-lg p-6',
        'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        hover && [
          'hover:border-border-hover hover:-translate-y-0.5 hover:shadow-glow-subtle',
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
