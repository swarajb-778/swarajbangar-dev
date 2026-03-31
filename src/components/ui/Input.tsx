'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string;
  readonly icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, icon: Icon, className, id, ...props }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-md bg-bg-interactive text-text-primary text-sm',
              'border border-white/[0.08] placeholder:text-text-disabled',
              'transition-all duration-[150ms] ease-out',
              'focus:outline-none focus:border-accent-primary focus:ring-[3px] focus:ring-accent-primary/15',
              Icon ? 'pl-9 pr-3' : 'px-3',
              error && 'border-accent-pink focus:border-accent-pink focus:ring-accent-pink/15',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-accent-pink">{error}</p>
        )}
      </div>
    );
  }
);
