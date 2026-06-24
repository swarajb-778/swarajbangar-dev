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

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ArrowRight, Minus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAgentChat } from '@/lib/hooks/useAgentChat';
import type { ChatMessage } from '@/lib/types';
import { renderWithSources, stepLabel } from './agentFormat';

const SUGGESTIONS = [
  'What did he build at McKinsey?',
  'Tell me about ThoughtWorks',
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

  // Let other surfaces (e.g. the hero terminal `agent`/`chat` command) open
  // the dock without prop-drilling shared state.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('swarajos:open-chat', onOpen);
    return () => window.removeEventListener('swarajos:open-chat', onOpen);
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
