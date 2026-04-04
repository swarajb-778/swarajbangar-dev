'use client';

// ═══════════════════════════════════════════════════════════════
// LabTabs — Pill tabs with sliding indicator
// ═══════════════════════════════════════════════════════════════

import { Code2, Server, Brain, Bot, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type LabTab = 'fullstack' | 'backend' | 'ai' | 'agent';

interface TabConfig {
  readonly id: LabTab;
  readonly label: string;
  readonly icon: LucideIcon;
}

const TABS: readonly TabConfig[] = [
  { id: 'fullstack', label: 'Full Stack', icon: Code2 },
  { id: 'backend', label: 'Backend', icon: Server },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'agent', label: 'Agent', icon: Bot },
] as const;

export interface LabTabsProps {
  readonly activeTab: LabTab;
  readonly onChange: (tab: LabTab) => void;
}

export function LabTabs({ activeTab, onChange }: LabTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
              'transition-colors duration-150 whitespace-nowrap',
              isActive ? 'text-white' : 'text-text-muted hover:text-text-secondary bg-bg-interactive'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="lab-tab-indicator"
                className="absolute inset-0 bg-accent-primary rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={14} />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
