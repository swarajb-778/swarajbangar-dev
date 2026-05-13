'use client';

// ═══════════════════════════════════════════════════════════════
// useKeyboardShortcuts — Centralized shortcut registry + section nav
// Single global keydown listener. Priority-based Escape handling.
// Uses useActiveSection for section tracking (no duplicate observers).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useActiveSection } from './useActiveSection';

export interface Shortcut {
  readonly key: string;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly description: string;
  readonly action: () => void;
  readonly global: boolean;
  readonly category: 'navigation' | 'panels' | 'terminal';
}

const SECTION_IDS: readonly string[] = [
  'hero',
  'about',
  'experience',
  'lab',
  'case-studies',
  'blog',
  'observability',
  'contact',
] as const;

/** Check if an input-like element is focused */
function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((active as HTMLElement).isContentEditable) return true;
  // Also check if inside the terminal (xterm canvas)
  if (active.closest('.xterm')) return true;
  return false;
}

/** Detect Mac platform for display labels */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform?.startsWith('Mac') || navigator.userAgent.includes('Mac');
}

/** Format shortcut key for display */
export function formatKey(shortcut: Pick<Shortcut, 'key' | 'metaKey' | 'shiftKey'>): string {
  const parts: string[] = [];
  if (shortcut.metaKey) parts.push(isMac() ? '⌘' : 'Ctrl');
  if (shortcut.shiftKey) parts.push(isMac() ? '⇧' : 'Shift');
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join(isMac() ? '' : '+');
}

function scrollToSection(sectionId: string): void {
  const el = document.getElementById(sectionId);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface UseKeyboardShortcutsOptions {
  readonly toggleTerminal: () => void;
  readonly toggleChat: () => void;
  readonly toggleShortcutsOverlay: () => void;
  /** Current state flags for priority-based Escape */
  readonly isShortcutsOpen?: boolean;
  readonly isChatOpen?: boolean;
  readonly isTerminalOpen?: boolean;
}

export function useKeyboardShortcuts({
  toggleTerminal,
  toggleChat,
  toggleShortcutsOverlay,
  isShortcutsOpen = false,
  isChatOpen = false,
  isTerminalOpen = false,
}: UseKeyboardShortcutsOptions): { readonly shortcuts: readonly Shortcut[] } {
  // Use shared useActiveSection for section index (no duplicate observers)
  const { activeSection, sectionIds } = useActiveSection();
  const currentSectionRef = useRef(0);

  // Sync current section index from shared hook
  useEffect(() => {
    const idx = sectionIds.indexOf(activeSection);
    if (idx !== -1) currentSectionRef.current = idx;
  }, [activeSection, sectionIds]);

  const scrollNext = useCallback(() => {
    const next = Math.min(currentSectionRef.current + 1, SECTION_IDS.length - 1);
    scrollToSection(SECTION_IDS[next]);
  }, []);

  const scrollPrev = useCallback(() => {
    const prev = Math.max(currentSectionRef.current - 1, 0);
    scrollToSection(SECTION_IDS[prev]);
  }, []);

  // Priority-based Escape: closes topmost overlay first
  // Sync refs in effect to comply with React 19 lint rules
  const isShortcutsOpenRef = useRef(isShortcutsOpen);
  const isChatOpenRef = useRef(isChatOpen);
  const isTerminalOpenRef = useRef(isTerminalOpen);
  useEffect(() => {
    isShortcutsOpenRef.current = isShortcutsOpen;
    isChatOpenRef.current = isChatOpen;
    isTerminalOpenRef.current = isTerminalOpen;
  }, [isShortcutsOpen, isChatOpen, isTerminalOpen]);

  const handleEscape = useCallback(() => {
    // Priority order: shortcuts overlay → chat panel → terminal overlay
    if (isShortcutsOpenRef.current) {
      toggleShortcutsOverlay();
    } else if (isChatOpenRef.current) {
      toggleChat();
    } else if (isTerminalOpenRef.current) {
      toggleTerminal();
    }
  }, [toggleShortcutsOverlay, toggleChat, toggleTerminal]);

  // Build shortcut registry (memoized to stabilize useEffect deps)
  const shortcuts: readonly Shortcut[] = useMemo(() => [
    // Navigation
    { key: '/', description: 'Open terminal', action: toggleTerminal, global: false, category: 'navigation' },
    { key: 'k', metaKey: true, description: 'Open terminal', action: toggleTerminal, global: true, category: 'navigation' },
    ...SECTION_IDS.map((id, i) => ({
      key: String(i + 1),
      description: `Go to ${id.replace('-', ' ')}`,
      action: () => scrollToSection(id),
      global: false,
      category: 'navigation' as const,
    })),
    { key: 'j', description: 'Next section', action: scrollNext, global: false, category: 'navigation' },
    { key: 'k', description: 'Previous section', action: scrollPrev, global: false, category: 'navigation' },

    // Panels
    { key: 't', description: 'Toggle terminal', action: toggleTerminal, global: false, category: 'panels' },
    { key: 'a', metaKey: true, shiftKey: true, description: 'Toggle AI chat', action: toggleChat, global: true, category: 'panels' },
    { key: 'Escape', description: 'Close overlays', action: handleEscape, global: true, category: 'panels' },
    { key: '?', description: 'Show shortcuts', action: toggleShortcutsOverlay, global: false, category: 'panels' },
    { key: 's', description: 'Toggle view source', action: () => window.dispatchEvent(new CustomEvent('toggle-view-source')), global: false, category: 'panels' },
  ], [toggleTerminal, toggleChat, handleEscape, toggleShortcutsOverlay, scrollNext, scrollPrev]);

  // Global keydown handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Match against registry (first match wins — order matters)
      for (const shortcut of shortcuts) {
        const keyMatch = e.key === shortcut.key
          || e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (!keyMatch) continue;

        const metaMatch = shortcut.metaKey
          ? (e.metaKey || e.ctrlKey)
          : !(e.metaKey || e.ctrlKey);

        if (!metaMatch) continue;

        // Shift matching: if shortcut explicitly requires shift, enforce it.
        // If shortcut doesn't specify shift, allow shift only for keys that
        // inherently need it (like '?' which is Shift+/)
        const isShiftedSymbol = shortcut.key.length === 1 && /[?!@#$%^&*()_+{}|:"<>~]/.test(shortcut.key);
        const shiftMatch = shortcut.shiftKey
          ? e.shiftKey
          : isShiftedSymbol
            ? true // Don't reject shift for symbols that require it
            : !e.shiftKey;

        if (!shiftMatch) continue;

        // For non-global shortcuts, skip if input is focused
        if (!shortcut.global && isInputFocused()) continue;

        e.preventDefault();
        shortcut.action();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return { shortcuts };
}
