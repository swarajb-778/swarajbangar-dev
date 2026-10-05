import { h, icon, tokens } from "../lib/dom.js";

export const mark = (text) => h("span", { class: "md-mark", "aria-hidden": "true" }, text);

export function heading(text, id) {
  return h("h2", { class: "md-h2", id, dataset: { outline: text } }, mark("## "), text);
}

export function codeBlock(lines, label = "Source") {
  return h(
    "div",
    { class: "code", role: "region", "aria-label": label, tabindex: 0 },
    lines.map((line) => h("div", { class: "code-line" }, line.length ? tokens(line) : "\u200b")),
  );
}

export function chipList(items, size) {
  return h("ul", { class: size ? `chips ${size}` : "chips" }, items.map((text) => h("li", { class: "chip" }, text)));
}

export function linkButton(label, href, iconName, variant) {
  return h(
    "a",
    { class: variant ? `btn ${variant}` : "btn", href, target: "_blank", rel: "noopener noreferrer" },
    icon(iconName, { size: 14 }),
    label,
  );
}

export const doc = (...children) => h("article", { class: "doc" }, ...children);
