import { glyphFor, fileIconSrc, folderIconSrc } from "./icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";
// VS Code draws file and folder icons at 16px.
const FILE_ICON_SIZE = 16;
const STROKE = { fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" };

/** Builds an element. Text children are inserted as text, never parsed as HTML. */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key === "style") for (const [prop, v] of Object.entries(value)) el.style.setProperty(prop, String(v));
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  return el;
}

/** A VS Code Codicon as inline SVG, colored by currentColor. Unknown names render empty. */
export function icon(name, { size = 20 } = {}) {
  const { grid = 16, stroke = false, paths = [] } = glyphFor(name) ?? {};
  const paint = stroke ? STROKE : { fill: "currentColor" };
  const svg = svgEl("svg", { class: "codicon", viewBox: `0 0 ${grid} ${grid}`, width: size, height: size, ...paint, "aria-hidden": "true", focusable: "false" });
  for (const p of paths) svg.append(svgEl("path", typeof p === "string" ? { d: p } : { d: p.d, "fill-rule": p.fillRule }));
  return svg;
}

const iconImage = (src, className) =>
  h("img", { class: className, src, alt: "", width: FILE_ICON_SIZE, height: FILE_ICON_SIZE, "aria-hidden": "true", draggable: "false" });

/** Material Icon Theme file icon. Pass the file name too so README.md, LICENSE, etc. get their own art. */
export const fileIcon = (kind, name) => iconImage(fileIconSrc(kind, name), "file-icon");

/** Material Icon Theme folder icon, open or closed to match the folder's expanded state. */
export const folderIcon = (name, open) => iconImage(folderIconSrc(name, open), "file-icon");

export const tokens = (line) => line.map(([kind, text]) => h("span", { class: `tok-${kind}` }, text));

/** Wraps the characters at `indices` (sorted) in <mark>. */
export function highlighted(text, indices) {
  if (!indices?.length) return [text];
  const wanted = new Set(indices);
  const out = [];
  let run = "";
  let inMatch = false;
  for (let i = 0; i <= text.length; i++) {
    const isMatch = wanted.has(i);
    if (i === text.length || isMatch !== inMatch) {
      if (run) out.push(inMatch ? h("mark", {}, run) : run);
      run = "";
      inMatch = isMatch;
    }
    if (i < text.length) run += text[i];
  }
  return out;
}

export const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
