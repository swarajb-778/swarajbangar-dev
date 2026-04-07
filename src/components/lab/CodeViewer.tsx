'use client';

// ═══════════════════════════════════════════════════════════════
// CodeViewer — Multi-file tabs + syntax highlighted code + copy
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeFile } from '@/lib/constants/code-snippets';

interface CodeViewerProps {
  readonly files: readonly CodeFile[];
  readonly activeFile?: number;
  readonly className?: string;
}

// Language display names and colors
const LANG_CONFIG: Record<string, { label: string; color: string }> = {
  typescript: { label: 'TypeScript', color: '#3178C6' },
  tsx: { label: 'React TSX', color: '#61DAFB' },
  python: { label: 'Python', color: '#3776AB' },
  go: { label: 'Go', color: '#00ADD8' },
  sql: { label: 'SQL', color: '#E38C00' },
  yaml: { label: 'YAML', color: '#CB171E' },
};

export function CodeViewer({ files, activeFile = 0, className }: CodeViewerProps) {
  const [activeIdx, setActiveIdx] = useState(activeFile);
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const currentFile = files[activeIdx] ?? null;
  const currentCode = currentFile?.code ?? '';
  const currentLanguage = currentFile?.language ?? '';
  const langInfo = currentFile
    ? (LANG_CONFIG[currentFile.language] ?? { label: currentFile.language, color: '#6B6B80' })
    : { label: '', color: '#6B6B80' };

  // Lazy-load Shiki for syntax highlighting
  useEffect(() => {
    if (!currentCode || !currentLanguage) {
      setHighlightedHtml('');
      return;
    }

    let cancelled = false;

    async function highlight() {
      try {
        const { codeToHtml } = await import('shiki');
        const html = await codeToHtml(currentCode, {
          lang: currentLanguage === 'tsx' ? 'tsx' : currentLanguage,
          theme: 'github-dark',
        });
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch {
        if (!cancelled) {
          setHighlightedHtml('');
        }
      }
    }

    highlight();
    return () => { cancelled = true; };
  }, [currentCode, currentLanguage]);

  // Reset scroll when switching files
  useEffect(() => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTop = 0;
    }
  }, [activeIdx]);

  const handleCopy = useCallback(async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [currentCode]);

  if (!currentFile) return null;

  const lines = currentCode.split('\n');

  return (
    <div className={cn('flex flex-col h-full bg-bg-elevated rounded-lg overflow-hidden border border-border-default', className)}>
      {/* File tab bar */}
      <div className="flex items-center bg-bg-base border-b border-border-default shrink-0 overflow-x-auto">
        {files.map((file, i) => (
          <button
            key={file.filename}
            onClick={() => setActiveIdx(i)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-mono whitespace-nowrap transition-colors duration-150 border-b-2',
              i === activeIdx
                ? 'text-text-primary border-accent-primary bg-bg-elevated'
                : 'text-text-muted hover:text-text-secondary border-transparent hover:bg-bg-surface'
            )}
          >
            {file.filename}
          </button>
        ))}

        {/* Right side: language badge + copy */}
        <div className="ml-auto flex items-center gap-2 px-3 shrink-0">
          {/* Language badge */}
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${langInfo.color}20`,
              color: langInfo.color,
            }}
          >
            {langInfo.label}
          </span>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors duration-150"
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check size={12} className="text-accent-emerald" />
                <span className="text-accent-emerald">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code area */}
      <div ref={codeContainerRef} className="flex-1 overflow-auto min-h-0">
        {highlightedHtml ? (
          /* Shiki highlighted output */
          <div
            className="p-4 text-sm leading-relaxed [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!text-sm [&_code]:!leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          /* Fallback: plain text with line numbers */
          <pre className="p-4 m-0 text-sm leading-relaxed">
            <code className="font-mono text-text-secondary">
              {lines.map((line, i) => (
                <span key={i} className="block">
                  <span className="inline-block w-8 text-right mr-4 text-text-disabled select-none">
                    {i + 1}
                  </span>
                  {line || ' '}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
