import { h } from "./dom.js";

export const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

const MAC = { mod: "⌘", ctrl: "⌃", shift: "⇧", alt: "⌥", enter: "↩" };
const OTHER = { mod: "Ctrl", ctrl: "Ctrl", shift: "Shift", alt: "Alt", enter: "Enter" };

/** "mod+shift+p" → "⌘⇧P" on macOS, "Ctrl+Shift+P" elsewhere. */
export function keyLabel(combo) {
  const names = isMac ? MAC : OTHER;
  const parts = combo.split("+").map((p) => names[p] ?? p.toUpperCase());
  return parts.join(isMac ? "" : "+");
}

export const kbd = (combo) => h("kbd", {}, keyLabel(combo));
