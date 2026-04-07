'use client';

// ═══════════════════════════════════════════════════════════════
// DemoContainer — Wrapper for lab demos with view-source toggle
// Desktop: split-pane (55% demo / 45% code)
// Mobile: tab switcher ("Demo" | "Code")
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ViewSourceToggle } from './ViewSourceToggle';
import { CodeViewer } from './CodeViewer';
import type { CodeFile } from '@/lib/constants/code-snippets';

interface DemoContainerProps {
  readonly title: string;
  readonly description: string;
  readonly techStack: readonly string[];
  readonly sourceFiles: readonly CodeFile[];
  readonly demoUrl?: string;
  readonly children: React.ReactNode;
}

export function DemoContainer({
  title,
  description,
  techStack,
  sourceFiles,
  demoUrl,
  children,
}: DemoContainerProps) {
  const [showSource, setShowSource] = useState(false);
  const [mobileTab, setMobileTab] = useState<'demo' | 'code'>('demo');

  const toggleSource = useCallback(() => {
    setShowSource((prev) => !prev);
  }, []);

  // Listen for global 's' keyboard shortcut
  useEffect(() => {
    function handleToggle() {
      setShowSource((prev) => !prev);
    }
    window.addEventListener('toggle-view-source', handleToggle);
    return () => window.removeEventListener('toggle-view-source', handleToggle);
  }, []);

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 pb-4 border-b border-border-default">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">
            {description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {techStack.map((tech) => (
              <Badge key={tech} variant="gray">{tech}</Badge>
            ))}
          </div>
        </div>
        {sourceFiles.length > 0 && (
          <ViewSourceToggle active={showSource} onToggle={toggleSource} />
        )}
      </div>

      {/* Mobile tab switcher — only when source is active */}
      {showSource && (
        <div className="flex lg:hidden border-b border-border-default">
          <button
            onClick={() => setMobileTab('demo')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors border-b-2 ${
              mobileTab === 'demo'
                ? 'text-text-primary border-accent-primary'
                : 'text-text-muted border-transparent'
            }`}
          >
            Demo
          </button>
          <button
            onClick={() => setMobileTab('code')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors border-b-2 ${
              mobileTab === 'code'
                ? 'text-text-primary border-accent-primary'
                : 'text-text-muted border-transparent'
            }`}
          >
            Code
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-[280px]">
        {/* Desktop layout */}
        <div className="hidden lg:flex w-full">
          {/* Demo pane */}
          <motion.div
            className="overflow-hidden"
            animate={{ width: showSource ? '55%' : '100%' }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="p-5">{children}</div>
          </motion.div>

          {/* Code pane — slides in from right */}
          <AnimatePresence>
            {showSource && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '45%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="border-l border-border-default overflow-hidden"
              >
                <CodeViewer files={sourceFiles} className="h-full border-0 rounded-none" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden w-full">
          {!showSource || mobileTab === 'demo' ? (
            <div className="p-5">{children}</div>
          ) : (
            <CodeViewer
              files={sourceFiles}
              className="h-[400px] border-0 rounded-none"
            />
          )}
        </div>
      </div>

      {/* Footer */}
      {demoUrl && (
        <div className="flex items-center justify-end px-5 py-3 border-t border-border-default">
          <a
            href={demoUrl}
            className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:text-[#7C6CF7] transition-colors duration-150"
          >
            Open full page
            <ArrowRight size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
