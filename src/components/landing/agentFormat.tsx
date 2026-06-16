// ═══════════════════════════════════════════════════════════════
// Shared formatters for the agent UIs (ChatDock + Lab AgentDemo).
// Keeps the reasoning-trace labels and [Source:] pill rendering in one
// place so both surfaces stay consistent.
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import type { AgentStep } from '@/lib/types';

/** Render assistant text, turning `[Source: x]` markers into accent pills. */
export function renderWithSources(text: string): ReactNode {
  const parts = text.split(/(\[Source:[^\]]+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[Source:\s*([^\]]+)\]$/);
    if (m) {
      return (
        <span key={i} className="src-pill">
          {m[1].trim()}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
