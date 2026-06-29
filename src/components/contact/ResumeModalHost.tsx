'use client';

import { useEffect, useState } from 'react';
import { ContactModal } from './ContactModal';

// Single global ContactModal, opened from anywhere via the
// `swarajos:open-resume` event (the Resume button + the terminal `resume`
// command both dispatch it). Mirrors the open_chat → swarajos:open-chat pattern.
export function ResumeModalHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('swarajos:open-resume', onOpen);
    return () => window.removeEventListener('swarajos:open-resume', onOpen);
  }, []);
  return <ContactModal isOpen={open} onClose={() => setOpen(false)} />;
}
