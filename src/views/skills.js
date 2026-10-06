import { h } from "../lib/dom.js";
import { codeBlock, doc, heading } from "./parts.js";

export function renderSkills(file, ctx) {
  return doc(
    codeBlock(file.lines),
    heading("Toolbox", "toolbox"),
    h(
      "div",
      { class: "card-grid" },
      ctx.content.skills.map((group) =>
        h(
          "section",
          { class: "card" },
          h("h3", { class: "card-title" }, group.group),
          h(
            "ul",
            { class: "skill-list" },
            group.items.map((item) =>
              h(
                "li",
                {},
                item.logo
                  ? h("img", { class: "skill-logo", src: item.logo, alt: "", loading: "lazy", width: 20, height: 20 })
                  : h("span", { class: "skill-logo is-empty", "aria-hidden": "true" }, item.name[0]),
                h("span", { class: "skill-text" }, h("span", { class: "skill-name" }, item.name), h("span", { class: "skill-note" }, item.note)),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
