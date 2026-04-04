'use client';

// ═══════════════════════════════════════════════════════════════
// ChatMessage — User/agent message bubbles + typing indicator
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ChatMessageProps {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-accent-primary/20 text-text-primary rounded-br-sm'
            : 'bg-bg-surface text-text-secondary rounded-bl-sm'
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-bg-surface rounded-lg px-3 py-2 rounded-bl-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-text-muted"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
