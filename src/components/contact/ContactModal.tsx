'use client';

// ═══════════════════════════════════════════════════════════════
// ContactModal — Glass pop-up contact form
// Opens from the "Resume" button. Collects Name, Email, and an
// optional Message, validates, then hands off to the visitor's mail
// client (mailto) and shows a success state.
//
// Conventions match the existing codebase:
//   • framer-motion AnimatePresence (see ShortcutsOverlay / ChatPanel)
//   • lucide-react icons
//   • Tailwind token classes (text-text-*, bg-bg-*, accent-*, glass-elevated)
//   • ShimmerButton for the primary action
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/ShimmerButton';
import { SITE_CONFIG } from '@/lib/constants';

interface ContactModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [sent, setSent] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus the first field once the entrance animation has begun.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => nameRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  // Reset to a clean form whenever the modal is (re)opened. Render-phase
  // reset on the isOpen transition — avoids a setState-in-effect cascade.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setSent(false);
      setErrors({});
    }
  }

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const next: { name?: string; email?: string } = {};
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName) next.name = 'Please enter your name.';
      if (!trimmedEmail) next.email = 'Please enter your email.';
      else if (!EMAIL_RE.test(trimmedEmail)) next.email = 'That email looks off.';

      setErrors(next);
      if (Object.keys(next).length > 0) return;

      const subject = `Portfolio contact from ${trimmedName}`;
      const body = [
        `Name: ${trimmedName}`,
        `Email: ${trimmedEmail}`,
        '',
        message.trim() || '(no message)',
      ].join('\n');

      window.location.href =
        `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
      setSent(true);
    },
    [name, email, message]
  );

  return (
    <AnimatePresence>
      {/* Backdrop and modal are direct, keyed children of AnimatePresence so
          exit animations fire on close (a wrapping Fragment would swallow them). */}
      {isOpen && (
        <motion.div
          key="cm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] bg-bg-base/70 backdrop-blur-xl"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {isOpen && (
          <motion.div
            key="cm-modal"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[71] flex items-center justify-center p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
          >
            <div className="relative w-full max-w-[460px] overflow-hidden rounded-[22px] glass-elevated border border-white/[0.12] p-8 shadow-2xl">
              {/* corner glow smear — matches CornerGlowCard vocabulary */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-px left-[8%] h-12 w-52 rounded-full"
                style={{
                  background: 'rgba(108, 92, 231, 0.35)',
                  filter: 'blur(22px)',
                  transform: 'rotate(20deg)',
                  transformOrigin: '10% 50%',
                }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-[2] flex size-9 items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-text-secondary hover:text-white hover:bg-white/[0.13] transition-all duration-150"
                aria-label="Close contact form"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <span className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-accent-teal">
                <span className="size-[7px] rounded-full bg-accent-emerald shadow-[0_0_9px_var(--accent-emerald)]" />
                get in touch
              </span>

              {!sent ? (
                <>
                  <h3
                    id="contact-modal-title"
                    className="mt-3.5 font-display text-[27px] font-bold tracking-tight text-text-primary"
                  >
                    Let&apos;s build something.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    Drop your details and a note — I&apos;ll get back to you fast.
                  </p>

                  <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="cm-name" className="text-[12.5px] font-medium text-text-secondary">
                        Name
                      </label>
                      <input
                        ref={nameRef}
                        id="cm-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        autoComplete="name"
                        className={fieldClass(!!errors.name)}
                      />
                      {errors.name && <p className="text-[11.5px] text-accent-pink">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="cm-email" className="text-[12.5px] font-medium text-text-secondary">
                        Email
                      </label>
                      <input
                        id="cm-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        className={fieldClass(!!errors.email)}
                      />
                      {errors.email && <p className="text-[11.5px] text-accent-pink">{errors.email}</p>}
                    </div>

                    {/* Message (optional) */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="cm-msg"
                        className="flex items-center gap-2 text-[12.5px] font-medium text-text-secondary"
                      >
                        Message
                        <span className="font-mono text-[10.5px] text-text-disabled">optional</span>
                      </label>
                      <textarea
                        id="cm-msg"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="What's on your mind?"
                        rows={3}
                        className={`${fieldClass(false)} min-h-[88px] resize-none`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => { setName(''); setEmail(''); setMessage(''); setErrors({}); }}
                      className="-mb-1 self-end text-xs text-text-muted hover:text-text-secondary transition-colors duration-150"
                    >
                      Clear All Fields
                    </button>

                    <ShimmerButton type="submit" arrow className="mt-1.5 w-full [&>span:last-child]:w-full [&>span:last-child]:justify-center">
                      Send message
                    </ShimmerButton>
                  </form>
                </>
              ) : (
                /* Success state */
                <div className="flex flex-col items-center py-5 text-center">
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="mb-4 flex size-16 items-center justify-center rounded-full text-accent-emerald"
                    style={{ background: 'rgba(0,184,148,0.12)', border: '1px solid rgba(0,184,148,0.4)' }}
                  >
                    <Check size={28} />
                  </motion.span>
                  <h3 className="font-display text-[27px] font-bold tracking-tight text-text-primary">
                    Message ready.
                  </h3>
                  <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-text-muted">
                    Your email client just opened with everything filled in — hit send and it lands in my inbox.
                  </p>
                </div>
              )}

              <p className="mt-3.5 text-center text-xs text-text-muted">
                Or email directly ·{' '}
                <a href={`mailto:${SITE_CONFIG.email}`} className="text-accent-teal hover:underline">
                  {SITE_CONFIG.email}
                </a>
              </p>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shared input/textarea styling — mirrors the Input component. */
function fieldClass(invalid: boolean): string {
  return [
    'w-full rounded-[11px] px-3.5 py-3 text-sm leading-normal',
    'bg-white/[0.04] text-text-primary placeholder:text-text-disabled',
    'border border-white/10 transition-all duration-150 ease-out',
    'focus:outline-none focus:border-accent-primary focus:bg-white/[0.06] focus:ring-[3px] focus:ring-accent-primary/15',
    invalid && 'border-accent-pink focus:border-accent-pink focus:ring-accent-pink/15',
  ]
    .filter(Boolean)
    .join(' ');
}
