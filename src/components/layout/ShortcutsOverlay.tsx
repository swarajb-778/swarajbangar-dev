'use client';

// ═══════════════════════════════════════════════════════════════
// ShortcutsOverlay — Modal showing all keyboard shortcuts
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { formatKey, isMac, type Shortcut } from '@/lib/hooks/useKeyboardShortcuts';

interface ShortcutsOverlayProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly shortcuts: readonly Shortcut[];
}

/** Key badge component */
function KeyBadge({ children }: { readonly children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 bg-bg-interactive border border-white/[0.08] rounded-md font-mono text-xs text-text-primary">
      {children}
    </kbd>
  );
}

/** Single shortcut row */
function ShortcutRow({ shortcut }: { readonly shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-text-secondary">{shortcut.description}</span>
      <KeyBadge>{formatKey(shortcut)}</KeyBadge>
    </div>
  );
}

/** Terminal-specific shortcuts (not from registry) */
const TERMINAL_SHORTCUTS: readonly { readonly key: string; readonly description: string }[] = [
  { key: '↑ / ↓', description: 'Browse command history' },
  { key: 'Tab', description: 'Autocomplete command' },
  { key: 'Ctrl+C', description: 'Cancel command' },
  { key: 'Ctrl+L', description: 'Clear terminal' },
  { key: 'Ctrl+A', description: 'Cursor to start' },
  { key: 'Ctrl+E', description: 'Cursor to end' },
];

export function ShortcutsOverlay({ isOpen, onClose, shortcuts }: ShortcutsOverlayProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const navShortcuts = shortcuts.filter((s) => s.category === 'navigation');
  const panelShortcuts = shortcuts.filter((s) => s.category === 'panels');

  // Dedupe display: show Cmd+K and / together
  const dedupedNav = navShortcuts.filter(
    (s, i, arr) =>
      // Remove duplicate "Open terminal" (keep Cmd+K, skip /)
      !(s.key === '/' && arr.some((o) => o.key === 'k' && o.metaKey))
      // Remove duplicate "Previous section" for 'k' without meta (conflicts with Cmd+K display)
      && !(s.key === 'k' && !s.metaKey)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-bg-base/80 backdrop-blur-xl"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            role="dialog"
            aria-label="Keyboard shortcuts"
            aria-modal="true"
          >
            <div className="w-full max-w-lg glass-elevated rounded-xl border border-white/[0.06] p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Keyboard Shortcuts
                  </h2>
                  <div className="mt-1 h-0.5 w-16 bg-accent-primary rounded-full" />
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Close shortcuts"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Navigation column */}
                <div>
                  <h3 className="text-xs font-semibold text-accent-primary uppercase tracking-wider mb-3">
                    Navigation
                  </h3>
                  <div className="space-y-0.5">
                    {/* Combined entry for / and Cmd+K */}
                    <div className="flex items-center justify-between gap-4 py-1.5">
                      <span className="text-sm text-text-secondary">Open terminal</span>
                      <span className="flex items-center gap-1">
                        <KeyBadge>/</KeyBadge>
                        <span className="text-text-disabled text-xs">or</span>
                        <KeyBadge>{isMac() ? '⌘K' : 'Ctrl+K'}</KeyBadge>
                      </span>
                    </div>
                    {/* Section shortcuts 1-8 */}
                    <div className="flex items-center justify-between gap-4 py-1.5">
                      <span className="text-sm text-text-secondary">Go to section</span>
                      <KeyBadge>1-8</KeyBadge>
                    </div>
                    {/* j/k */}
                    <div className="flex items-center justify-between gap-4 py-1.5">
                      <span className="text-sm text-text-secondary">Next / prev section</span>
                      <span className="flex items-center gap-1">
                        <KeyBadge>J</KeyBadge>
                        <KeyBadge>K</KeyBadge>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panels column */}
                <div>
                  <h3 className="text-xs font-semibold text-accent-teal uppercase tracking-wider mb-3">
                    Panels
                  </h3>
                  <div className="space-y-0.5">
                    {panelShortcuts.map((s) => (
                      <ShortcutRow key={`${s.key}-${s.metaKey}`} shortcut={s} />
                    ))}
                  </div>
                </div>

                {/* Terminal column — spans full width */}
                <div className="md:col-span-2 border-t border-white/[0.06] pt-4">
                  <h3 className="text-xs font-semibold text-accent-gold uppercase tracking-wider mb-3">
                    Terminal
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                    {TERMINAL_SHORTCUTS.map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-4 py-1.5">
                        <span className="text-sm text-text-secondary">{s.description}</span>
                        <KeyBadge>{s.key}</KeyBadge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
