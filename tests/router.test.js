import { test } from "node:test";
import assert from "node:assert/strict";
import { hashForPath, pathFromHash } from "../src/lib/router.js";

const known = ["about/README.md", "projects/projects.tsx"];

test("hashForPath prefixes the path with #/", () => {
  assert.equal(hashForPath("about/README.md"), "#/about/README.md");
});

test("pathFromHash resolves known paths, including encoded ones", () => {
  assert.equal(pathFromHash("#/about/README.md", known), "about/README.md");
  assert.equal(pathFromHash("#/projects%2Fprojects.tsx", known), "projects/projects.tsx");
});

test("pathFromHash rejects unknown, empty, and malformed hashes", () => {
  assert.equal(pathFromHash("#/nope.md", known), null);
  assert.equal(pathFromHash("", known), null);
  assert.equal(pathFromHash("#/%E0%A4%A", known), null);
});
