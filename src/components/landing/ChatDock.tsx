'use client';

// ═══════════════════════════════════════════════════════════════
// ChatDock — redesigned floating SwarajOS chatbot.
// Self-contained: gradient FAB with ping, glass panel, quick-reply
// chips, typing indicator, assistant avatars, command bar.
//
// Use it to REPLACE <ChatButton/> + <ChatPanel/> on the landing page,
// or keep both — but render only one chat affordance to avoid two FABs.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ArrowRight, Minus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

const SUGGESTIONS = [
  'What did he build at Amazon?',
  'Tell me about Meshi.io',
  'Is he open to work?',
  "What's his stack?",
];

const REPLIES: [RegExp, string][] = [
  [/amazon/i, 'At Amazon he built payment infrastructure handling 50M+ daily transactions — event-driven microservices with circuit breakers & idempotent consumers, $320K/yr saved at 45ms p95.'],
  [/meshi/i, 'At Meshi.io he ships multi-agent orchestration and production RAG for 1.8K+ enterprises — LangGraph workflows with live reasoning traces, tuned to 94% retrieval accuracy.'],
  [/open|hir|avail|role|job/i, "Yes — actively open to senior / staff roles, Bay Area or remote. The fastest path is the 'Hire me' button up top, or swarajbangar778@gmail.com."],
  [/stack|tech|skill|language|tool/i, 'Core stack: Python · LangGraph · FastAPI · Claude API · pgvector / Neo4j on the AI side; React · Next.js · TypeScript on the front; AWS · Kubernetes · Redis for infra.'],
  [/lab|demo|chaos|rag/i, 'The Lab has four live demos — click any card to open it, or hit “Explore more” inside for the full breakdown. The Chaos Lab is the fun one: kill a service and watch the breakers trip.'],
];
function reply(q: string) {
  for (const [re, text] of REPLIES) if (re.test(q)) return text;
  return "Good question — ask about his work at Amazon or Meshi.io, his stack, or whether he's open to work. You can also poke the live demos in the Lab.";
}

type Msg = { role: 'user' | 'assistant'; text: string };

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: "Hey — I'm SwarajOS, Swaraj's portfolio agent. Ask me anything about his work, or try a prompt below." },
  ]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [msgs, open, typing]);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || typing) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'assistant', text: reply(text) }]);
      setTyping(false);
    }, 650);
  };

  const showSuggestions = msgs.length <= 1 && !typing;

  return (
    <div className="chat-dock">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="SwarajOS chat">
          <div className="head">
            <span className="head-av"><Avatar name="SwarajOS" size={34} status="online" /></span>
            <div className="head-meta">
              <span className="nm">SwarajOS</span>
              <span className="sub"><span className="online-dot" />online · multi-agent · LangGraph</span>
            </div>
            <button className="head-x" onClick={() => setOpen(false)} aria-label="Minimize chat"><Minus size={16} /></button>
          </div>

          <div className="thread" ref={threadRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`row ${m.role}`}>
                {m.role === 'assistant' && <span className="row-av"><Avatar name="SwarajOS" size={24} /></span>}
                <div className={`bubble ${m.role}`}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="row assistant">
                <span className="row-av"><Avatar name="SwarajOS" size={24} /></span>
                <div className="bubble assistant typing-bubble"><span /><span /><span /></div>
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
            <button onClick={() => ask(input)} disabled={!input.trim() || typing} aria-label="Send"><ArrowRight size={16} /></button>
          </div>
          <div className="composer-hint">SwarajOS is a demo agent · responses are canned for this portfolio</div>
        </div>
      )}
      <button className={`chat-fab${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Chat with SwarajOS'}>
        {!open && <span className="fab-ping" />}
        {open ? <X size={22} /> : <Sparkles size={23} />}
      </button>
    </div>
  );
}
