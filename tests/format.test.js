import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMonth, formatPeriod, shortHash, formatMetric, impactDelta } from "../src/lib/format.js";

test("formatMetric adds units the way people write them", () => {
  assert.equal(formatMetric(1110, "req/min"), "1,110 req/min");
  assert.equal(formatMetric(1.7, "s"), "1.7s");
  assert.equal(formatMetric(84, "%"), "84%");
  assert.equal(formatMetric(60, "% of baseline"), "60%");
});

test("impactDelta reports relative change, or points for percentages", () => {
  assert.equal(impactDelta({ before: 780, after: 1110, unit: "req/min" }), "+42%");
  assert.equal(impactDelta({ before: 4, after: 1.7, unit: "s" }), "−58%");
  assert.equal(impactDelta({ before: 100, after: 60, unit: "% of baseline" }), "−40%");
  assert.equal(impactDelta({ before: 84, after: 97, unit: "%" }), "+13 pts");
  assert.equal(impactDelta({ before: 1, after: 2, unit: "x", delta: "2× faster" }), "2× faster");
});

test("formatMonth turns YYYY-MM into a short month and year", () => {
  assert.equal(formatMonth("2024-01"), "Jan 2024");
  assert.equal(formatMonth("2023-12"), "Dec 2023");
});

test("formatPeriod shows Present for open-ended ranges", () => {
  assert.equal(formatPeriod("2024-01", null), "Jan 2024 – Present");
  assert.equal(formatPeriod("2022-06", "2023-12"), "Jun 2022 – Dec 2023");
});

test("shortHash is stable, 7 hex characters, and input-sensitive", () => {
  assert.match(shortHash("Acme"), /^[0-9a-f]{7}$/);
  assert.equal(shortHash("Acme"), shortHash("Acme"));
  assert.notEqual(shortHash("Acme"), shortHash("Acme2"));
});
