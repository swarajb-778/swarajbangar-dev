'use client';

// ═══════════════════════════════════════════════════════════════
// ChatDock — floating SwarajOS chatbot, wired to the live agent.
//
// Streams the answer + a live reasoning trace from one SSE stream via
// useAgentChat (api-client.streamAgent → /api/agent → backend). When the
// backend is offline the hook transparently falls back to a canned mock
// stream, the footer flips to "demo" copy, and a one-time demo-mode toast
// fires elsewhere — the chat never shows a broken state.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Sparkles, X, ArrowRight, Minus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAgentChat } from '@/lib/hooks/useAgentChat';
import type { AgentStep, ChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  'What did he build at Amazon?',
  'Tell me about Meshi.io',
  'Is he open to work?',
  "What's his stack?",
];

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hey — I'm SwarajOS, Swaraj's portfolio agent. Ask me anything about his work, or try a prompt below.",
  timestamp: new Date(0).toISOString(),
};

/** Render assistant text, turning [Source: x] markers into accent pills. */
function renderWithSources(text: string): ReactNode {
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
function stepLabel(step: AgentStep): { label: string; detail: string } {
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

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const { messages, agentSteps, isLoading, error, sendMessage } = useAgentChat([GREETING]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, agentSteps, open, isLoading]);

  // Flip the footer to "demo" copy the first time anything degrades to mock.
  useEffect(() => {
    const onDemo = () => setDemoMode(true);
    window.addEventListener('swarajos:demo-mode', onDemo);
    return () => window.removeEventListener('swarajos:demo-mode', onDemo);
  }, []);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || isLoading) return;
    setInput('');
    void sendMessage(text);
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) void sendMessage(lastUser.content);
  };

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <div className="chat-dock">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="SwarajOS chat">
          <div className="head">
            <span className="head-av"><Avatar name="SwarajOS" size={34} status="online" /></span>
            <div className="head-meta">
              <span className="nm">SwarajOS</span>
              <span className="sub">
                <span className="online-dot" />
                {demoMode ? 'demo · responses are canned' : 'online · multi-agent · LangGraph'}
              </span>
            </div>
            <button className="head-x" onClick={() => setOpen(false)} aria-label="Minimize chat"><Minus size={16} /></button>
          </div>

          <div className="thread" ref={threadRef}>
            {messages.map((m) => {
              const isTyping = m.role === 'assistant' && m.streaming && !m.content;
              return (
                <div key={m.id} className={`row ${m.role}`}>
                  {m.role === 'assistant' && <span className="row-av"><Avatar name="SwarajOS" size={24} /></span>}
                  {isTyping ? (
                    <div className="bubble assistant typing-bubble"><span /><span /><span /></div>
                  ) : (
                    <div className={`bubble ${m.role}`}>
                      {m.role === 'assistant' ? renderWithSources(m.content) : m.content}
                    </div>
                  )}
                </div>
              );
            })}

            {agentSteps.length > 0 && (
              <div className="chat-trace" aria-label="reasoning trace">
                <span className="ct-label">reasoning</span>
                {agentSteps.map((s) => {
                  const { label, detail } = stepLabel(s);
                  return (
                    <div key={s.id} className="t">
                      <b>{label}</b>
                      {detail}
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="row assistant">
                <span className="row-av"><Avatar name="SwarajOS" size={24} /></span>
                <div className="bubble assistant chat-error">
                  Something went wrong.
                  <button onClick={retry} disabled={isLoading}>Try again</button>
                </div>
              </div>
            )}

            {showSuggestions && (
              <div className="suggestions">
                {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
              </div>
            )}
          </div>

          <div className="composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask(input)}
              placeholder="Ask SwarajOS…"
              aria-label="Message"
            />
            <button onClick={() => ask(input)} disabled={!input.trim() || isLoading} aria-label="Send"><ArrowRight size={16} /></button>
          </div>
          <div className="composer-hint">
            {demoMode
              ? 'SwarajOS demo · backend offline, responses are canned'
              : 'SwarajOS · live multi-agent system on LangGraph + Claude'}
          </div>
        </div>
      )}
      <button className={`chat-fab${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Chat with SwarajOS'}>
        {!open && <span className="fab-ping" />}
        {open ? <X size={22} /> : <Sparkles size={23} />}
      </button>
    </div>
  );
}
