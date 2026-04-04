import Link from 'next/link';

export default function FullStackLabPage() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-accent-gold mb-3">
          // full stack
        </p>
        <h1 className="text-2xl font-bold text-text-primary font-display mb-3">
          Collaborative Notepad
        </h1>
        <p className="text-text-secondary mb-6">
          Real-time collaborative editing demo coming in Phase 2.
        </p>
        <Link
          href="/lab"
          className="text-sm text-accent-primary hover:text-[#7C6CF7] transition-colors"
        >
          &larr; Back to Lab
        </Link>
      </div>
    </div>
  );
}
