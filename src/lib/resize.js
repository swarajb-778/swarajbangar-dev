// Sizing rules for the drag-to-resize sashes in src/ui/resize.js. Sizes are in px.

const MIN = { sidebarW: 170, chatW: 260, panelH: 100 };
const MAX_W = 600;
// The activity bar plus a usable editor column always stay visible.
const RESERVED_W = 250;
const ARROWS = { ArrowLeft: ["x", -1], ArrowRight: ["x", 1], ArrowUp: ["y", -1], ArrowDown: ["y", 1] };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// When space runs out the upper bound wins, so a panel shrinks instead of overflowing.
function fit(want, min, max) {
  const hi = Math.max(0, Math.floor(max));
  const lo = Math.min(min, hi);
  return { size: clamp(Math.round(want), lo, hi), min: lo, max: hi };
}

/**
 * Fits the wanted sizes into a workbench of `width` x `height`. The sidebar leaves room
 * for an open chat's minimum, and the chat gets whatever width the sidebar leaves.
 */
export function fitPanels(want, { width, height, sidebarOpen, chatOpen }) {
  const free = width - RESERVED_W;
  const sidebarW = fit(want.sidebarW, MIN.sidebarW, Math.min(MAX_W, width / 2, free - (chatOpen ? MIN.chatW : 0)));
  const chatW = fit(want.chatW, MIN.chatW, Math.min(MAX_W, free - (sidebarOpen ? sidebarW.size : 0)));
  return { sidebarW, chatW, panelH: fit(want.panelH, MIN.panelH, height * 0.7) };
}

/** The size a key press on a sash asks for, or null for keys the sash ignores. */
export function keySize({ key, shiftKey }, { axis, sign }, { size, min, max }) {
  if (key === "Home") return min;
  if (key === "End") return max;
  const [keyAxis, dir] = ARROWS[key] ?? [];
  return keyAxis === axis ? clamp(size + dir * sign * (shiftKey ? 50 : 10), min, max) : null;
}
