'use client';

// ═══════════════════════════════════════════════════════════════
// FloatingContext — Shared state for terminal overlay + chat panel
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const TERMINAL_HEIGHT_KEY = 'terminal-height';
const DEFAULT_HEIGHT = 50; // vh

interface FloatingState {
  readonly isTerminalOpen: boolean;
  readonly isChatOpen: boolean;
  readonly isSplitView: boolean;
  readonly terminalHeight: number;
  readonly toggleTerminal: () => void;
  readonly toggleChat: () => void;
  readonly openChat: () => void;
  readonly closeAll: () => void;
  readonly toggleSplitView: () => void;
  readonly setTerminalHeight: (height: number) => void;
}

const FloatingContext = createContext<FloatingState | null>(null);

function getStoredHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_HEIGHT;
  try {
    const stored = sessionStorage.getItem(TERMINAL_HEIGHT_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 15 && parsed <= 85) return parsed;
    }
  } catch {
    // sessionStorage may not be available
  }
  return DEFAULT_HEIGHT;
}

export function FloatingProvider({ children }: { readonly children: ReactNode }) {
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);
  const [isSplitView, setSplitView] = useState(false);
  // Lazy initializer reads from sessionStorage on first render (no effect needed)
  const [terminalHeight, setTerminalHeightState] = useState(getStoredHeight);

  const toggleTerminal = useCallback(() => {
    setTerminalOpen((prev) => !prev);
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  const openChat = useCallback(() => {
    setChatOpen(true);
  }, []);

  const closeAll = useCallback(() => {
    setTerminalOpen(false);
    setChatOpen(false);
  }, []);

  const toggleSplitView = useCallback(() => {
    setSplitView((prev) => !prev);
  }, []);

  const setTerminalHeight = useCallback((height: number) => {
    const clamped = Math.max(15, Math.min(85, height));
    setTerminalHeightState(clamped);
    try {
      sessionStorage.setItem(TERMINAL_HEIGHT_KEY, String(clamped));
    } catch {
      // sessionStorage may not be available
    }
  }, []);

  return (
    <FloatingContext.Provider
      value={{
        isTerminalOpen,
        isChatOpen,
        isSplitView,
        terminalHeight,
        toggleTerminal,
        toggleChat,
        openChat,
        closeAll,
        toggleSplitView,
        setTerminalHeight,
      }}
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
