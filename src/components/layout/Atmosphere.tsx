/**
 * Atmosphere — the site-wide background layer: a faint dot grid with a
 * slowly drifting aurora behind all content. Fixed, non-interactive, and
 * sits beneath everything (-z-10). Aurora drift respects prefers-reduced-motion
 * (handled in globals.css).
 */
export function Atmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-dots"
    >
      <div className="aurora h-full w-full" />
    </div>
  );
}
