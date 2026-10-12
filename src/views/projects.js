import { h, icon, initials } from "../lib/dom.js";
import { chipList, codeBlock, doc, heading } from "./parts.js";

// The first category with a matching tag wins, so order is priority.
// Hues are OKLCH angles; styles/cards.css picks the lightness per theme.
const CATEGORIES = [
  { label: "Agentic AI", hue: 300, tags: ["agentic-ai", "mcp", "langgraph", "voice-agent", "voice"] },
  { label: "Mobile", hue: 355, tags: ["react-native"] },
  { label: "ML", hue: 200, tags: ["computer-vision", "yolov8"] },
  { label: "Data", hue: 75, tags: ["quant", "optimization"] },
  { label: "Security", hue: 25, tags: ["security", "jwt"] },
  { label: "Commerce", hue: 150, tags: ["e-commerce"] },
];
const DEFAULT_CATEGORY = { label: "Web", hue: 255 };

const categoryOf = (tags) => CATEGORIES.find((c) => c.tags.some((tag) => tags.includes(tag))) ?? DEFAULT_CATEGORY;

function parseUrl(href) {
  if (!href) return null;
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

/** owner/repo for GitHub, otherwise the bare host of the repo or live site. */
function sourceOf(p) {
  const repo = parseUrl(p.repo);
  if (repo) return repo.hostname === "github.com" ? repo.pathname.replace(/^\/+|\/+$/g, "") : repo.hostname;
  const live = parseUrl(p.live);
  return live ? live.hostname.replace(/^www\./, "") : "";
}

function cardLink(label, href, { iconName, trailing = false, variant, name }) {
  const glyph = icon(iconName, { size: 14 });
  return h(
    "a",
    {
      class: `btn ${variant}`,
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      // "Code"/"Live" repeat on every card; name the project for screen-reader link lists.
      "aria-label": `${label}: ${name} (opens in a new tab)`,
    },
    trailing ? [label, glyph] : [glyph, label],
  );
}

function cardHead(p, category) {
  const source = sourceOf(p);
  return h(
    "header",
    { class: "card-head" },
    h("span", { class: "monogram", "aria-hidden": "true" }, initials(p.name)),
    h(
      "div",
      { class: "card-head-text" },
      h("h3", { class: "card-title" }, p.name),
      h("p", { class: "card-sub" }, source && h("span", { class: "card-source", title: source }, source), h("span", { class: "card-year" }, String(p.year))),
    ),
    p.featured ? h("span", { class: "badge" }, icon("sparkle", { size: 11 }), "Featured") : h("span", { class: "badge" }, category.label),
  );
}

function cardActions(p) {
  if (!p.repo && !p.live) return null;
  return h(
    "div",
    { class: "card-actions" },
    p.repo && cardLink("Code", p.repo, { iconName: "branch", variant: "ghost", name: p.name }),
    p.live && cardLink("Live", p.live, { iconName: "external", trailing: true, variant: "primary", name: p.name }),
  );
}

function projectCard(p) {
  const category = categoryOf(p.tags);
  return h(
    "article",
    { class: p.featured ? "card project-card is-featured" : "card project-card", style: { "--card-hue": category.hue } },
    cardHead(p, category),
    h("p", { class: "card-text" }, p.description),
    chipList(p.tags, "small"),
    cardActions(p),
  );
}

export function renderProjects(file, ctx) {
  const { projects } = ctx.content;
  const tags = ["all", ...new Set(projects.flatMap((p) => p.tags))];
  const grid = h("div", { class: "card-grid wide project-grid" });

  // Buttons are built once and only their pressed state changes, so keyboard focus stays put.
  const select = (tag) => {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.tag === tag));
    grid.replaceChildren(...projects.filter((p) => tag === "all" || p.tags.includes(tag)).map(projectCard));
  };
  const buttons = tags.map((tag) =>
    h(
      "button",
      { class: "filter", type: "button", "aria-pressed": "false", dataset: { tag }, onclick: () => select(tag) },
      tag === "all" ? `all (${projects.length})` : tag,
    ),
  );
  const filters = h("div", { class: "filters project-filters", role: "toolbar", "aria-label": "Filter projects by tag" }, buttons);
  select("all");

  return doc(codeBlock(file.lines), heading("Projects", "projects"), filters, grid);
}
