import { h } from "../lib/dom.js";
import { contributionGrid, contributionTotal, contributionsUrl, monthLabels } from "../lib/contributions.js";
import { codeBlock, doc, heading } from "./parts.js";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function caption(day) {
  const [year, month, date] = day.date.split("-").map(Number);
  const label = new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const noun = day.count === 1 ? "contribution" : "contributions";
  return `${label}: ${day.count} ${noun}`;
}

function chart(days) {
  const weeks = contributionGrid(days);
  return h(
    "div",
    { class: "heat-chart" },
    h("div", { class: "heat-months" }, h("span"), monthLabels(weeks).map((label) => h("span", {}, label))),
    h(
      "div",
      { class: "heat-body" },
      h("div", { class: "heat-days", "aria-hidden": "true" }, DAY_LABELS.map((label) => h("span", {}, label))),
      h(
        "div",
        { class: "heat", role: "img", "aria-label": `${days.reduce((n, d) => n + d.count, 0)} contributions over ${weeks.length} weeks` },
        weeks.map((week) =>
          h(
            "div",
            { class: "heat-week" },
            week.map((day) =>
              day
                ? h("span", { class: "heat-cell", dataset: { level: day.level }, title: caption(day) })
                : h("span", { class: "heat-cell is-pad" }),
            ),
          ),
        ),
      ),
    ),
  );
}

export function renderActivity(file, ctx) {
  const { user } = ctx.content.github;
  const profile = `https://github.com/${user}`;
  const status = h("p", { class: "hint", role: "status" }, "Loading the public contribution graph…");
  const board = h("div", { class: "heat-board" });

  fetch(contributionsUrl(user), { signal: AbortSignal.timeout(8000) })
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((payload) => {
      const days = Array.isArray(payload.contributions) ? payload.contributions : [];
      if (!days.length) throw new Error("empty");
      const total = contributionTotal(payload).toLocaleString("en-US");
      status.textContent = `${total} public contributions in the last 12 months. A push can take up to a day to show here, and private contributions stay on your GitHub profile.`;
      board.replaceChildren(
        chart(days),
        h(
          "div",
          { class: "heat-legend" },
          h("span", {}, "Less"),
          ...[0, 1, 2, 3, 4].map((level) => h("span", { class: "heat-cell", dataset: { level } })),
          h("span", {}, "More"),
          h("a", { href: profile, target: "_blank", rel: "noopener noreferrer" }, `@${user}`),
        ),
      );
    })
    .catch(() => {
      status.textContent = "The live graph didn't load. GitHub still has it:";
      board.replaceChildren(h("a", { class: "btn", href: profile, target: "_blank", rel: "noopener noreferrer" }, "Open GitHub profile"));
    });

  return doc(
    codeBlock(file.lines),
    heading("Contributions", "contributions"),
    status,
    board,
  );
}
