'use client';

// ═══════════════════════════════════════════════════════════════
// ViewSourceToggle — Toggle button for code/demo split view
// ═══════════════════════════════════════════════════════════════

import { Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSourceToggleProps {
  readonly active: boolean;
  readonly onToggle: () => void;
  readonly className?: string;
}

export function ViewSourceToggle({ active, onToggle, className }: ViewSourceToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
        active
          ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
          : 'bg-bg-interactive text-text-muted hover:text-text-primary border border-transparent hover:border-border-hover',
        className
      )}
      aria-label={active ? 'Hide source code' : 'View source code'}
      title="Toggle source code (S)"
    >
      <Code2 size={14} />
      <span className="hidden sm:inline">{active ? 'Hide Source' : 'View Source'}</span>
    </button>
  );
}
