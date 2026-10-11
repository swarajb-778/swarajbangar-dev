import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { buildFiles, buildTree } from "../src/files.js";
import { fileIconSrc, folderIconSrc, glyphFor, GLYPH_NAMES } from "../src/lib/icons.js";
import realContent from "../src/content.js";

const root = new URL("../", import.meta.url);
const onDisk = (src) => existsSync(new URL(src, root));

test("every file and folder maps to a Material icon that exists on disk", () => {
  const files = buildFiles(realContent);
  const folders = buildTree(files).filter((node) => node.type === "folder");
  const srcs = [...files.map((f) => fileIconSrc(f.icon, f.name)), ...folders.flatMap((f) => [folderIconSrc(f.name, false), folderIconSrc(f.name, true)])];
  for (const src of srcs) assert.ok(onDisk(src), `missing ${src}`);
  assert.equal(fileIconSrc("md", "README.md"), "assets/icons/files/readme.svg");
  assert.equal(fileIconSrc("txt", "LICENSE"), "assets/icons/files/license.svg");
  assert.equal(folderIconSrc("projects", true), "assets/icons/folders/folder-project-open.svg");
  assert.equal(folderIconSrc("unknown", false), "assets/icons/folders/folder.svg");
});

test("every UI icon name resolves to a drawing", () => {
  for (const name of GLYPH_NAMES) assert.ok(glyphFor(name)?.paths.length, name);
  assert.equal(glyphFor("nope"), null);
});
