'use client';

// ═══════════════════════════════════════════════════════════════
// ChatPanel — Slide-up chat panel with messages + input
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import { useFloating } from '@/lib/floating-context';
import { getMockChatResponse } from '@/lib/mock-data';
import { sleep } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

const INITIAL_MESSAGE: ChatMessageType = {
  id: 'initial',
  role: 'assistant',
  content:
    "Hey! I'm SwarajOS — Swaraj's portfolio agent. Ask me about his experience, paste code for a review, or try 'design a URL shortener'. What's on your mind?",
  timestamp: new Date().toISOString(),
};

export function ChatPanel() {
  const { isChatOpen, toggleChat } = useFloating();
  const [messages, setMessages] = useState<readonly ChatMessageType[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isChatOpen) {
      // Small delay so the panel animation starts first
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate 1-2s delay
    await sleep(1000 + Math.random() * 1000);

    const response = getMockChatResponse();
    setMessages((prev) => [...prev, response]);
    setIsTyping(false);
  }, [input, isTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isChatOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={toggleChat}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed z-50 bottom-0 right-0 w-full lg:bottom-24 lg:right-6 lg:w-[420px] lg:max-h-[600px] lg:rounded-lg overflow-hidden border border-border-default bg-bg-elevated shadow-xl flex flex-col"
        style={{ height: 'min(80vh, 600px)' }}
        role="dialog"
        aria-label="AI Chat Assistant"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-surface">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">SwarajOS</h3>
            <p className="text-xs text-text-muted">AI Assistant</p>
          </div>
          <button
            onClick={toggleChat}
            className="flex items-center justify-center size-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-interactive transition-colors"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
        >
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border-default bg-bg-surface">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 h-10 px-3 rounded-md bg-bg-interactive border border-transparent text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
              aria-label="Chat message input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center size-10 rounded-md bg-accent-primary text-white hover:bg-[#7C6CF7] disabled:opacity-50 disabled:pointer-events-none transition-colors"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
