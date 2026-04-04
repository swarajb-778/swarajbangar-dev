'use client';

// ═══════════════════════════════════════════════════════════════
// KeyboardShortcuts — Global keyboard shortcut handler
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useFloating } from '@/lib/floating-context';

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (active as HTMLElement).isContentEditable
  );
}

export function KeyboardShortcuts() {
  const { isTerminalOpen, isChatOpen, toggleTerminal, toggleChat, closeAll } =
    useFloating();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+Shift+A: toggle chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        toggleChat();
        return;
      }

      // Cmd+K or "/": toggle terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleTerminal();
        return;
      }

      // Don't trigger single-key shortcuts when focused on input
      if (isInputFocused()) return;

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleTerminal();
        return;
      }

      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleTerminal();
        return;
      }

      if (e.key === 'Escape') {
        closeAll();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTerminalOpen, isChatOpen, toggleTerminal, toggleChat, closeAll]);

  return null;
}
