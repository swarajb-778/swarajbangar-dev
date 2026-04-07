'use client';

// ═══════════════════════════════════════════════════════════════
// ChatButton — Fixed FAB with glow pulse + open/close toggle
// ═══════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { useFloating } from '@/lib/floating-context';

export function ChatButton() {
  const { isChatOpen, toggleChat } = useFloating();

  return (
    <motion.button
      onClick={toggleChat}
      className="group fixed bottom-6 right-6 z-50 flex items-center justify-center size-14 rounded-full bg-accent-primary text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      style={{
        boxShadow: '0 0 30px rgba(108, 92, 231, 0.15)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isChatOpen ? 'Close chat' : 'Open AI assistant'}
      title={isChatOpen ? 'Close chat' : 'Open AI assistant (⌘⇧A)'}
    >
      {/* Shortcut hint on hover — hidden on mobile */}
      {!isChatOpen && (
        <span className="hidden md:block absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-bg-elevated border border-white/[0.08] rounded text-[10px] text-text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          ⌘⇧A
        </span>
      )}

      {/* Pulse glow ring */}
      {!isChatOpen && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-20 bg-accent-primary"
          style={{ animationDuration: '3s' }}
        />
      )}

      <AnimatePresence mode="wait">
        {isChatOpen ? (
          <motion.span
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X size={24} />
          </motion.span>
        ) : (
          <motion.span
            key="bot"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Bot size={24} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
