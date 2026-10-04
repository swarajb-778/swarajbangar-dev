import { test } from "node:test";
import assert from "node:assert/strict";
import { fuzzyMatch, fuzzyFilter } from "../src/lib/fuzzy.js";

test("matches a subsequence and reports matched indices", () => {
  assert.deepEqual(fuzzyMatch("prj", "projects.tsx").indices, [0, 1, 3]);
});

test("returns null when a character is missing", () => {
  assert.equal(fuzzyMatch("xyz", "readme.md"), null);
});

test("is case-insensitive", () => {
  assert.ok(fuzzyMatch("READ", "README.md"));
});

test("prefers the contiguous occurrence over the first scattered one", () => {
  assert.deepEqual(fuzzyMatch("pro", "p_r_pro").indices, [4, 5, 6]);
});

test("ranks contiguous prefix matches above scattered ones", () => {
  const ranked = fuzzyFilter(["src/p-r-o.txt", "projects.tsx"], "pro", (x) => x).map((r) => r.item);
  assert.deepEqual(ranked, ["projects.tsx", "src/p-r-o.txt"]);
});

test("an empty query keeps every item in its original order", () => {
  const ranked = fuzzyFilter(["b", "a"], "", (x) => x);
  assert.deepEqual(ranked.map((r) => r.item), ["b", "a"]);
  assert.deepEqual(ranked[0].indices, []);
});
