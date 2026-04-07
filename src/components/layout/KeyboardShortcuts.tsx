'use client';

// ═══════════════════════════════════════════════════════════════
// KeyboardShortcuts — Wrapper component that wires hook + overlay
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useFloating } from '@/lib/floating-context';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { ShortcutsOverlay } from './ShortcutsOverlay';

export function KeyboardShortcuts() {
  const { toggleTerminal, toggleChat, closeAll } = useFloating();
  const [showOverlay, setShowOverlay] = useState(false);

  const toggleShortcutsOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const closeOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  const { shortcuts } = useKeyboardShortcuts({
    toggleTerminal,
    toggleChat,
    closeAll,
    toggleShortcutsOverlay,
  });

  return (
    <ShortcutsOverlay
      isOpen={showOverlay}
      onClose={closeOverlay}
      shortcuts={shortcuts}
    />
  );
}
