import { test } from "node:test";
import assert from "node:assert/strict";
import { searchDocuments } from "../src/lib/search.js";

const docs = [
  { path: "a.md", lines: ["Hello world", "Second line", "world again"] },
  { path: "b.json", lines: ['"world": true'] },
  { path: "c.txt", lines: ["nothing here"] },
];

test("finds case-insensitive matches with 1-based line and column", () => {
  assert.deepEqual(searchDocuments(docs, "WORLD"), [
    {
      path: "a.md",
      matches: [
        { line: 1, column: 7, text: "Hello world" },
        { line: 3, column: 1, text: "world again" },
      ],
    },
    { path: "b.json", matches: [{ line: 1, column: 2, text: '"world": true' }] },
  ]);
});

test("ignores queries shorter than two characters after trimming", () => {
  assert.deepEqual(searchDocuments(docs, " w "), []);
});

test("caps the number of matches per file", () => {
  const [first] = searchDocuments(docs, "world", { perFile: 1 });
  assert.equal(first.matches.length, 1);
});
