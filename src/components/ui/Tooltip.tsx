'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  readonly content: string;
  readonly children: ReactNode;
  readonly side?: TooltipSide;
}

const positionStyles: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({
  content,
  children,
  side = 'top',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap',
            'bg-bg-elevated text-text-primary text-sm px-3 py-1.5',
            'rounded-md border border-border-default',
            'shadow-lg pointer-events-none',
            'animate-in fade-in duration-150',
            positionStyles[side]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
