import Link from 'next/link';

export default function AILabPage() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-accent-primary mb-3">
          {'// ai'}
        </p>
        <h1 className="text-2xl font-bold text-text-primary font-display mb-3">
          Intelligence Lab
        </h1>
        <p className="text-text-secondary mb-6">
          RAG X-Ray, embedding explorer, and model arena coming in Phase 3.
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
