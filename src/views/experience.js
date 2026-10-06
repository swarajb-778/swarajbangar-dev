import { h } from "../lib/dom.js";
import { formatPeriod } from "../lib/format.js";
import { chipList, codeBlock, doc, heading } from "./parts.js";

function educationList(education) {
  return h(
    "ol",
    { class: "timeline" },
    education.map((e) =>
      h(
        "li",
        { class: "timeline-item" },
        h("span", { class: "timeline-dot is-muted", "aria-hidden": "true" }),
        h(
          "div",
          { class: "card" },
          h("p", { class: "card-sub" }, formatPeriod(e.start, e.end)),
          h("h3", { class: "card-title" }, `${e.degree} `, h("span", { class: "at" }, `@ ${e.school}`)),
          e.notes && h("p", { class: "card-text" }, e.notes),
        ),
      ),
    ),
  );
}

export function renderExperience(file, ctx) {
  const education = ctx.content.education ?? [];
  return doc(
    codeBlock(file.lines),
    heading("Timeline", "timeline"),
    h(
      "ol",
      { class: "timeline" },
      ctx.content.experience.map((e) =>
        h(
          "li",
          { class: "timeline-item" },
          h("span", { class: "timeline-dot", "aria-hidden": "true" }),
          h(
            "div",
            { class: "card" },
            h("p", { class: "card-sub" }, formatPeriod(e.start, e.end), e.location ? ` · ${e.location}` : ""),
            h("h3", { class: "card-title" }, `${e.role} `, h("span", { class: "at" }, `@ ${e.company}`)),
            h("p", { class: "card-text" }, e.summary),
            e.highlights?.length > 0 && h("ul", { class: "bullets" }, e.highlights.map((item) => h("li", {}, item))),
            e.stack?.length > 0 && chipList(e.stack, "small"),
          ),
        ),
      ),
    ),
    education.length > 0 && heading("Education", "education"),
    education.length > 0 && educationList(education),
  );
}
