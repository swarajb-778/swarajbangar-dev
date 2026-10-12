import { h, icon } from "../lib/dom.js";
import { doc, heading } from "./parts.js";

const SKELETON = [62, 38, 90, 84, 70, 0, 45, 92, 88, 76, 0, 52, 86, 80];

export function renderResume(file, ctx) {
  const { profile } = ctx.content;

  return doc(
    heading("Résumé", "resume"),
    h(
      "div",
      { class: "card locked" },
      h(
        "div",
        { class: "locked-preview", "aria-hidden": "true" },
        SKELETON.map((width) => h("span", { class: width ? "skeleton-line" : "skeleton-gap", style: width ? { width: `${width}%` } : {} })),
      ),
      h(
        "div",
        { class: "locked-body" },
        h("span", { class: "locked-icon" }, icon("lock", { size: 22 })),
        h("h3", { class: "card-title" }, "Available on request"),
        h(
          "p",
          { class: "card-text" },
          "I share my résumé personally so it's always current. Send me a quick note and I'll email you the latest version.",
        ),
        h(
          "div",
          { class: "form-actions" },
          h("button", { class: "btn primary", type: "button", onclick: () => ctx.requestResume() }, icon("mail", { size: 14 }), "Request résumé"),
          h("button", { class: "btn", type: "button", onclick: () => ctx.copy(profile.email, "Email address copied.") }, icon("copy", { size: 14 }), profile.email),
        ),
      ),
    ),
  );
}
