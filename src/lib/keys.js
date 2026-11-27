import { h } from "./dom.js";

export const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

const MAC = { mod: "⌘", ctrl: "⌃", shift: "⇧", alt: "⌥", enter: "↩" };
const OTHER = { mod: "Ctrl", ctrl: "Ctrl", shift: "Shift", alt: "Alt", enter: "Enter" };

/** Splits a shortcut combo into display key tokens, e.g. ["⌘", "P"] or ["Ctrl", "P"]. */
export function keyParts(combo) {
  const names = isMac ? MAC : OTHER;
  return combo.split("+").map((p) => names[p] ?? p.toUpperCase());
}

/** "mod+shift+p" → "⌘ ⇧ P" on macOS (for plain text), "Ctrl+Shift+P" elsewhere. */
export function keyLabel(combo) {
  return keyParts(combo).join(isMac ? " " : "+");
}

/** Renders VS Code-style separate keycaps with crisp optical spacing. */
export function kbd(combo) {
  const parts = keyParts(combo);
  return h(
    "span",
    { class: "kbd-group", "aria-label": keyLabel(combo) },
    parts.flatMap((part, i) => [
      ...(i > 0 && !isMac ? [h("span", { class: "kbd-sep", "aria-hidden": "true" }, "+")] : []),
      h("kbd", { class: part.length === 1 && !/^[A-Z0-9`]$/.test(part) ? "kbd-sym" : null }, part),
    ]),
  );
}
