'use client';

// ═══════════════════════════════════════════════════════════════
// useTerminalActions — Navigation actions triggered by terminal commands
// ═══════════════════════════════════════════════════════════════

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFloating } from '@/lib/floating-context';

export interface TerminalActions {
  readonly scrollToSection: (sectionId: string) => string;
  readonly navigateTo: (path: string) => string;
  readonly openUrl: (url: string) => string;
  readonly openChat: () => string;
  readonly clearTerminal: () => null;
  readonly copyToClipboard: (text: string) => string;
}

export function useTerminalActions(): TerminalActions {
  const router = useRouter();
  const { isTerminalOpen, toggleTerminal, toggleChat } = useFloating();

  const scrollToSection = useCallback(
    (sectionId: string): string => {
      if (isTerminalOpen) {
        toggleTerminal();
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } else {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return `→ Scrolling to ${sectionId}...`;
    },
    [isTerminalOpen, toggleTerminal]
  );

  const navigateTo = useCallback(
    (path: string): string => {
      if (isTerminalOpen) {
        toggleTerminal();
      }
      setTimeout(() => {
        router.push(path);
      }, isTerminalOpen ? 300 : 0);
      return `→ Navigating to ${path}...`;
    },
    [isTerminalOpen, toggleTerminal, router]
  );

  const openUrl = useCallback((url: string): string => {
    window.open(url, '_blank', 'noopener,noreferrer');
    return `→ Opening ${url} in new tab...`;
  }, []);

  const openChat = useCallback((): string => {
    if (isTerminalOpen) {
      toggleTerminal();
    }
    setTimeout(() => {
      toggleChat();
    }, isTerminalOpen ? 300 : 0);
    return '→ Launching SwarajOS agent...';
  }, [isTerminalOpen, toggleTerminal, toggleChat]);

  const clearTerminal = useCallback((): null => {
    return null;
  }, []);

  const copyToClipboard = useCallback((text: string): string => {
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard API not available
    });
    return '→ Copied to clipboard!';
  }, []);

  return useMemo(
    () => ({
      scrollToSection,
      navigateTo,
      openUrl,
      openChat,
      clearTerminal,
      copyToClipboard,
    }),
    [scrollToSection, navigateTo, openUrl, openChat, clearTerminal, copyToClipboard]
  );
}
