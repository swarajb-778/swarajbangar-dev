import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonLines, tsLines, yamlLines, lineText } from "../src/lib/highlight.js";

const sample = {
  name: "Ada",
  year: 2026,
  open: true,
  nothing: null,
  tags: ["a", "b"],
  nested: { deep: [1, 2, { x: "y" }] },
  empty: [],
  emptyObj: {},
};

const text = (lines) => lines.map(lineText).join("\n");

test("jsonLines round-trips through JSON.parse", () => {
  assert.deepEqual(JSON.parse(text(jsonLines(sample))), sample);
});

test("jsonLines tags tokens by kind", () => {
  const kinds = Object.fromEntries(jsonLines({ a: "x", n: 1, b: false }).flat().map(([kind, t]) => [t, kind]));
  assert.equal(kinds['"a"'], "key");
  assert.equal(kinds['"x"'], "string");
  assert.equal(kinds["1"], "number");
  assert.equal(kinds["false"], "keyword");
});

test("jsonLines keeps short scalar arrays on one line", () => {
  assert.deepEqual(jsonLines({ tags: ["a", "b"] }).map(lineText), ["{", '  "tags": ["a", "b"]', "}"]);
});

test("tsLines produces an evaluable typed export", () => {
  const src = text(tsLines(sample, { name: "data", type: "Profile" }));
  assert.match(src, /^export const data: Profile = /);
  const literal = src.replace(/^export const data: Profile = /, "").replace(/;$/, "");
  assert.deepEqual(new Function(`return (${literal});`)(), sample);
});

test("tsLines leaves identifier keys unquoted and quotes the rest", () => {
  const src = text(tsLines({ ok: 1, "needs-quote": 2 }, { name: "x" }));
  assert.match(src, /\bok: 1/);
  assert.match(src, /"needs-quote": 2/);
});

test("yamlLines renders lists of objects with flow and block sequences", () => {
  const out = text(yamlLines([{ role: "Engineer", stack: ["js", "go"], notes: ["Shipped it", "true"] }]));
  assert.equal(
    out,
    ["- role: Engineer", "  stack: [js, go]", "  notes:", "    - Shipped it", '    - "true"'].join("\n"),
  );
});

test("yamlLines quotes strings that would change meaning", () => {
  const out = text(yamlLines({ a: "yes: no", b: "42", c: "", d: "plain words", e: null, f: 3 }));
  assert.equal(out, ['a: "yes: no"', 'b: "42"', 'c: ""', "d: plain words", "e: null", "f: 3"].join("\n"));
});
