const SVG_NS = "http://www.w3.org/2000/svg";

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

const ICONS = {
  files: ["M8 3h6l5 5v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M14 3v5h5", "M4 7v13a1 1 0 0 0 1 1h10"],
  search: ["M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z", "M15.5 15.5L20 20"],
  branch: [
    "M6 3.5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z",
    "M6 16.5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z",
    "M18 3.5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z",
    "M6 7.5v9",
    "M18 7.5c0 5-12 3.5-12 9",
  ],
  run: ["M7.5 4.5v15l12-7.5z"],
  extensions: ["M4 4h7v7H4z", "M4 13h7v7H4z", "M13 13h7v7h-7z", "M16.5 2.5l4.5 4.5-4.5 4.5L12 7z"],
  account: ["M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z", "M4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5"],
  gear: [
    "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z",
    "M12 2.5v3",
    "M12 18.5v3",
    "M2.5 12h3",
    "M18.5 12h3",
    "M5.3 5.3l2.1 2.1",
    "M16.6 16.6l2.1 2.1",
    "M5.3 18.7l2.1-2.1",
    "M16.6 7.4l2.1-2.1",
  ],
  chat: ["M4 5h16v11H10l-4 3.5V16H4z"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"],
  sidebarLeft: ["M3.5 4.5h17v15h-17z", "M9 4.5v15"],
  panelBottom: ["M3.5 4.5h17v15h-17z", "M3.5 14h17"],
  sidebarRight: ["M3.5 4.5h17v15h-17z", "M15 4.5v15"],
  close: ["M7 7l10 10", "M17 7L7 17"],
  chevronRight: ["M9.5 6l6 6-6 6"],
  chevronDown: ["M6 9.5l6 6 6-6"],
  bell: ["M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14z", "M10 20a2 2 0 0 0 4 0"],
  trash: ["M5 7h14", "M10 7V4.5h4V7", "M7 7l1 12.5h8L17 7"],
  external: ["M14 4h6v6", "M20 4l-8.5 8.5", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  copy: ["M9 9h11v11H9z", "M15 9V4H4v11h5"],
  send: ["M4 12l16-8-5.5 16-3-6.5z", "M11.5 13.5L20 4"],
  download: ["M12 4v11", "M7.5 10.5L12 15l4.5-4.5", "M5 19.5h14"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  warning: ["M12 4l9 16H3z", "M12 10v4", "M12 17v.5"],
  error: ["M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z", "M9 9l6 6", "M15 9l-6 6"],
  collapse: ["M4 5h16v14H4z", "M8 12h8"],
  lock: ["M7.5 11V8a4.5 4.5 0 0 1 9 0v3", "M5.5 11h13v9.5h-13z", "M12 14.5v2.5"],
  mail: ["M3.5 6h17v12h-17z", "M3.5 6.5l8.5 6.5 8.5-6.5"],
  linkedin: ["M4 4h16v16H4z", "M8 10.5v5.5", "M8 8v.01", "M11.5 16v-5.5", "M11.5 13a2.5 2.5 0 0 1 5 0v3"],
};

export function icon(name, { size = 20 } = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const attrs = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 1.6,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
  };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  for (const d of ICONS[name] ?? []) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

export const fileIcon = (kind) => h("span", { class: "file-icon", dataset: { icon: kind }, "aria-hidden": "true" });

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
