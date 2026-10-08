import { test } from "node:test";
import assert from "node:assert/strict";
import { contributionGrid, contributionTotal, monthLabels } from "../src/lib/contributions.js";

test("contributionGrid aligns the first date to its weekday", () => {
  // 2024-01-03 was a Wednesday.
  const weeks = contributionGrid([
    { date: "2024-01-03", count: 2, level: 1 },
    { date: "2024-01-04", count: 0, level: 0 },
  ]);
  assert.equal(weeks[0][3].date, "2024-01-03");
  assert.equal(weeks[0][4].date, "2024-01-04");
  assert.deepEqual(weeks[0].slice(0, 3), [null, null, null]);
  assert.equal(weeks[0].length, 5);
});

test("the last week stops on the last day", () => {
  const days = Array.from({ length: 8 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, count: 0, level: 0 }));
  assert.equal(contributionGrid(days).at(-1).length, 2);
});

test("monthLabels skip captions that would overlap", () => {
  const weeks = ["2024-01-07", "2024-01-14", "2024-01-21", "2024-01-28", "2024-02-04"].map((date) => [{ date }]);
  assert.deepEqual(monthLabels(weeks), ["Jan", "", "", "", "Feb"]);
});

test("contributionTotal prefers the reported last-year total", () => {
  assert.equal(contributionTotal({ total: { lastYear: 1341 }, contributions: [{ count: 1 }] }), 1341);
  assert.equal(contributionTotal({ contributions: [{ count: 2 }, { count: 3 }] }), 5);
});
