import { h } from "../lib/dom.js";
import { chipList, codeBlock, doc, heading, linkButton } from "./parts.js";

function projectCard(p) {
  return h(
    "article",
    { class: p.featured ? "card project-card is-featured" : "card project-card" },
    h(
      "header",
      { class: "card-head" },
      h("span", { class: "monogram", "aria-hidden": "true" }, p.name[0]),
      h("div", { class: "card-head-text" }, h("h3", { class: "card-title" }, p.name), h("p", { class: "card-sub" }, String(p.year))),
      h("span", { class: "badge" }, p.featured ? "featured" : "project"),
    ),
    h("p", { class: "card-text" }, p.description),
    chipList(p.tags, "small"),
    (p.repo || p.live) &&
      h("div", { class: "card-actions" }, p.repo && linkButton("Code", p.repo, "branch"), p.live && linkButton("Live", p.live, "external", "primary")),
  );
}

export function renderProjects(file, ctx) {
  const { projects } = ctx.content;
  const tags = [...new Set(projects.flatMap((p) => p.tags))];
  let current = "all";

  const filters = h("div", { class: "filters", role: "toolbar", "aria-label": "Filter projects by tag" });
  const grid = h("div", { class: "card-grid wide" });

  const render = () => {
    filters.replaceChildren(
      ...["all", ...tags].map((tag) =>
        h(
          "button",
          {
            class: "filter",
            type: "button",
            "aria-pressed": String(tag === current),
            onclick: () => {
              current = tag;
              render();
            },
          },
          tag === "all" ? `all (${projects.length})` : tag,
        ),
      ),
    );
    grid.replaceChildren(...projects.filter((p) => current === "all" || p.tags.includes(current)).map(projectCard));
  };
  render();

  return doc(codeBlock(file.lines), heading("Projects", "projects"), filters, grid);
}
