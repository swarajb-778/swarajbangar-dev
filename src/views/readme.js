import { h, icon, prefersReducedMotion } from "../lib/dom.js";
import { kbd } from "../lib/keys.js";
import { chipList, codeBlock, doc, heading, mark } from "./parts.js";
import { impactTable } from "./impact.js";

let hasTyped = false;

function typeIn(el) {
  if (hasTyped || prefersReducedMotion()) return;
  hasTyped = true;
  const full = el.textContent;
  el.textContent = "";
  let i = 0;
  const tick = () => {
    el.textContent = full.slice(0, ++i);
    if (i < full.length) setTimeout(tick, 55);
  };
  setTimeout(tick, 300);
}

/** Types each role, pauses, deletes it, and moves on. Stops once the element leaves the page. */
function rotateRoles(el, roles) {
  if (prefersReducedMotion() || roles.length < 2) {
    el.textContent = roles.join(" · ");
    return;
  }
  let index = 0;
  let length = 0;
  let deleting = false;
  const tick = () => {
    if (!el.isConnected) return;
    const word = roles[index];
    length += deleting ? -1 : 1;
    el.textContent = word.slice(0, length);
    if (!deleting && length === word.length) {
      deleting = true;
      return setTimeout(tick, 1800);
    }
    if (deleting && length === 0) {
      deleting = false;
      index = (index + 1) % roles.length;
    }
    setTimeout(tick, deleting ? 30 : 65);
  };
  setTimeout(tick, 1200);
}

const QUICK_LINKS = [
  { path: "ai/agents.py", title: "Agent lab", icon: "sparkle", text: () => "SwarajOS answers, with the trace exposed" },
  { path: "ai/oncall.py", title: "On-call", icon: "warning", text: () => "A second agent that waits for approval" },
  { path: "metrics/impact.json", title: "Impact", icon: "check", text: (c) => `${c.impact?.length ?? 0} measured results` },
  { path: "projects/projects.tsx", title: "Projects", icon: "run", text: (c) => `${c.projects.length} things I've built` },
  { path: "github/activity.json", title: "GitHub activity", icon: "branch", text: () => "Live contribution graph" },
  { path: "experience/experience.yml", title: "Experience", icon: "branch", text: () => "Where I've worked and studied" },
  { path: "skills/skills.json", title: "Skills", icon: "extensions", text: () => "Tools I reach for" },
  { path: "contact/contact.ts", title: "Contact", icon: "chat", text: () => "Say hello" },
];

export function renderReadme(file, ctx) {
  const { content } = ctx;
  const { profile, highlights, focus, projects, impact = [] } = content;
  const featured = projects.filter((p) => p.featured).slice(0, 3);
  const roles = profile.roles ?? [profile.role];

  const name = h("span", { class: "typed" }, profile.name);
  typeIn(name);
  const roleText = h("span", { class: "role-text" }, roles[0]);
  rotateRoles(roleText, roles);

  return doc(
    codeBlock(file.lines, "Front matter"),
    h("h1", { class: "md-h1", id: "intro", "aria-label": profile.name, dataset: { outline: profile.name } }, mark("# "), name),
    h("p", { class: "roles", "aria-label": roles.join(", ") }, mark("> "), roleText, h("span", { class: "caret", "aria-hidden": "true" })),
    h("p", { class: "lead" }, profile.tagline),
    h("p", { class: "prose" }, profile.bio),
    chipList(highlights),

    impact.length > 0 && heading("Impact at a glance", "impact"),
    impact.length > 0 && impactTable(impact),
    impact.length > 0 &&
      h("p", { class: "hint" }, "Measured on production systems. Context for each number is in ", h("button", { class: "link-button", type: "button", onclick: () => ctx.open("metrics/impact.json") }, "metrics/impact.json"), "."),

    heading("What I do", "what-i-do"),
    h(
      "div",
      { class: "card-grid" },
      focus.map((f) => h("div", { class: "card" }, h("h3", { class: "card-title" }, f.title), h("p", { class: "card-text" }, f.text))),
    ),

    featured.length > 0 && heading("Featured projects", "featured"),
    featured.length > 0 &&
      h(
        "div",
        { class: "card-grid" },
        featured.map((p) =>
          h(
            "button",
            { class: "card link-card", type: "button", onclick: () => ctx.open("projects/projects.tsx") },
            h("h3", { class: "card-title" }, p.name),
            h("p", { class: "card-text" }, p.description),
            chipList(p.tags, "small"),
          ),
        ),
      ),

    heading("Quick links", "quick-links"),
    h(
      "p",
      { class: "hint" },
      "Browse the explorer, press ",
      kbd("mod+p"),
      " to jump to a file, or open the terminal with ",
      kbd("ctrl+`"),
      " and try ",
      h("code", {}, "neofetch"),
      ".",
    ),
    h(
      "div",
      { class: "card-grid" },
      QUICK_LINKS.filter((link) => ctx.hasFile(link.path)).map((link) =>
        h(
          "button",
          { class: "card link-card", type: "button", onclick: () => ctx.open(link.path) },
          h("span", { class: "card-icon" }, icon(link.icon, { size: 18 })),
          h("h3", { class: "card-title" }, link.title),
          h("p", { class: "card-text" }, link.text(content)),
        ),
      ),
    ),
  );
}
