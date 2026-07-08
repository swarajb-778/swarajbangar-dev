// ═══════════════════════════════════════════════════════════════
// Shared formatters for the agent UIs (ChatDock + Lab AgentDemo).
// Keeps the reasoning-trace labels and [Source:] pill rendering in one
// place so both surfaces stay consistent.
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import type { AgentStep } from '@/lib/types';

/** Inline formatting: [Source: x] pills, **bold**, `code`. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\[Source:[^\]]+\]|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const src = part.match(/^\[Source:\s*([^\]]+)\]$/);
    if (src) {
      return (
        <span key={`${keyPrefix}-${i}`} className="src-pill">
          {src[1].trim()}
        </span>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={`${keyPrefix}-${i}`}>{bold[1]}</strong>;
    const code = part.match(/^`([^`]+)`$/);
    if (code) {
      return (
        <code key={`${keyPrefix}-${i}`} className="md-code">
          {code[1]}
        </code>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

/**
 * Render assistant text as the mini-markdown subset the agent's prompts
 * enforce: short paragraphs, '- ' bullet lists, bold, inline code, and
 * [Source: x] citation pills. Tolerates partial markup mid-stream (an
 * unclosed ** simply renders as plain text).
 */
export function renderAssistantMarkdown(text: string): ReactNode {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const lines = text.split('\n');

  const flushList = (idx: number) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${idx}`} className="md-list">
        {list.map((item, j) => (
          <li key={j}>{renderInline(item, `li-${idx}-${j}`)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      list = [...list, bullet[1]];
      return;
    }
    flushList(i);
    if (line.trim()) {
      blocks.push(
        <p key={`p-${i}`} className="md-p">
          {renderInline(line, `p-${i}`)}
        </p>
      );
    }
  });
  flushList(lines.length);
  return blocks;
}

/** Plain-text version of an answer for TTS: strip citations + markdown. */
export function speechText(text: string): string {
  return text
    .replace(/\[Source:[^\]]+\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Compact label + detail for one reasoning step, tolerant of missing data. */
export function stepLabel(step: AgentStep): { label: string; detail: string } {
  const d = step.data as Record<string, unknown>;
  const ms = step.latency_ms ? ` · ${Math.round(step.latency_ms)}ms` : '';
  switch (step.type) {
    case 'classify': {
      const conf = typeof d.confidence === 'number' ? ` · ${d.confidence.toFixed(2)}` : '';
      return { label: 'classify', detail: `${String(d.intent ?? 'intent')}${conf}` };
    }
    case 'route':
      return { label: 'route', detail: String(d.selected_agent ?? d.agent ?? d.node ?? '') };
    case 'tool_call':
      return { label: 'tool_call', detail: `${String(d.tool ?? 'tool')}${ms}` };
    case 'retrieve':
      return { label: 'retrieve', detail: `${Number(d.chunk_count ?? d.chunks_retrieved ?? 0)} chunks` };
    case 'generate': {
      const tok = d.output_tokens ?? d.tokens;
      return { label: 'generate', detail: `${String(d.model ?? 'model')}${tok ? ` · ${tok} tok` : ''}` };
    }
    case 'synthesize':
      return { label: 'synthesize', detail: String(d.agent ?? '') };
    case 'memory':
      return { label: 'memory', detail: d.persisted ? 'persisted' : 'noted' };
    default:
      return { label: step.type, detail: '' };
  }
}
