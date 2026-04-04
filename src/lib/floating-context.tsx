'use client';

// ═══════════════════════════════════════════════════════════════
// FloatingContext — Shared state for terminal overlay + chat panel
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface FloatingState {
  readonly isTerminalOpen: boolean;
  readonly isChatOpen: boolean;
  readonly toggleTerminal: () => void;
  readonly toggleChat: () => void;
  readonly closeAll: () => void;
}

const FloatingContext = createContext<FloatingState | null>(null);

export function FloatingProvider({ children }: { readonly children: ReactNode }) {
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);

  const toggleTerminal = useCallback(() => {
    setTerminalOpen((prev) => !prev);
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  const closeAll = useCallback(() => {
    setTerminalOpen(false);
    setChatOpen(false);
  }, []);

  return (
    <FloatingContext.Provider
      value={{ isTerminalOpen, isChatOpen, toggleTerminal, toggleChat, closeAll }}
    >
      {children}
    </FloatingContext.Provider>
  );
}

export function useFloating(): FloatingState {
  const context = useContext(FloatingContext);
  if (!context) {
    throw new Error('useFloating must be used within a FloatingProvider');
  }
  return context;
}
