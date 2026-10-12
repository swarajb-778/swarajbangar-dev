import { h } from "../lib/dom.js";
import { formatMetric, impactDelta } from "../lib/format.js";
import { codeBlock, doc, heading } from "./parts.js";

function kpiCard(m) {
  const max = Math.max(m.before, m.after);
  const row = (label, value, variant) =>
    h(
      "div",
      { class: "kpi-row" },
      h("span", { class: "kpi-row-label" }, label),
      h("span", { class: "meter", "aria-hidden": "true" }, h("span", { class: `meter-fill ${variant}`, style: { width: `${(value / max) * 100}%` } })),
      h("span", { class: "kpi-row-value" }, formatMetric(value, m.unit)),
    );
  return h(
    "article",
    { class: "card kpi" },
    h("div", { class: "kpi-head" }, h("span", { class: "kpi-delta" }, impactDelta(m)), h("span", { class: "card-sub" }, m.company)),
    h("h3", { class: "card-title" }, m.label),
    row("before", m.before, "is-before"),
    row("after", m.after, "is-after"),
    m.note && h("p", { class: "card-text kpi-note" }, m.note, m.better === "lower" ? " · lower is better" : ""),
  );
}

/** A plain markdown-style table for the README: one row per result, numbers in mono. */
export function impactTable(impact) {
  const cell = (cls, ...children) => h("td", { class: cls }, ...children);
  return h(
    "div",
    { class: "table-scroll" },
    h(
      "table",
      { class: "md-table" },
      h("thead", {}, h("tr", {}, ["Result", "Before", "After", "Change"].map((label) => h("th", { scope: "col" }, label)))),
      h(
        "tbody",
        {},
        impact.map((m) =>
          h(
            "tr",
            {},
            cell("", m.label, h("span", { class: "md-table-sub" }, m.company)),
            cell("num", formatMetric(m.before, m.unit)),
            cell("num", formatMetric(m.after, m.unit)),
            cell("num delta", impactDelta(m)),
          ),
        ),
      ),
    ),
  );
}

export function renderImpact(file, ctx) {
  return doc(
    codeBlock(file.lines),
    heading("Impact", "impact"),
    h("p", { class: "hint" }, "Before and after, measured on production systems. Bars are to scale within each metric."),
    h("div", { class: "card-grid wide" }, ctx.content.impact.map(kpiCard)),
  );
}
