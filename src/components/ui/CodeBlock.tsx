'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CodeBlockProps {
  readonly code: string;
  readonly language?: string;
  readonly filename?: string;
  readonly showLineNumbers?: boolean;
  readonly className?: string;
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split('\n');

  return (
    <div
      className={cn(
        'relative rounded-lg border border-border-default overflow-hidden',
        className
      )}
    >
      {/* Header */}
      {(filename || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border-default">
          <span className="text-xs text-text-muted font-mono">
            {filename ?? language}
          </span>
          <button
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center gap-1 text-xs text-text-muted',
              'hover:text-text-primary transition-colors duration-150'
            )}
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check size={14} className="text-accent-emerald" />
                <span className="text-accent-emerald">Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Code */}
      <pre className="bg-bg-highlight p-4 overflow-x-auto m-0 rounded-none border-none">
        <code className="font-mono text-sm text-text-secondary leading-relaxed">
          {lines.map((line, i) => (
            <span key={i} className="block">
              {showLineNumbers && (
                <span className="inline-block w-8 text-right mr-4 text-text-disabled select-none">
                  {i + 1}
                </span>
              )}
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
