import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFiles, buildTree } from "../src/files.js";
import { lineText } from "../src/lib/highlight.js";
import { content } from "./fixtures.js";

const files = buildFiles(content);

test("builds the expected virtual files in display order", () => {
  assert.deepEqual(
    files.map((f) => f.path),
    [
      "about/README.md",
      "about/profile.json",
      "ai/agents.py",
      "metrics/impact.json",
      "projects/projects.tsx",
      "experience/experience.yml",
      "skills/skills.json",
      "contact/contact.ts",
      "resume.pdf",
      "LICENSE",
    ],
  );
});

test("every file has a name, language, view, and plain-text lines", () => {
  for (const file of files) {
    assert.equal(file.name, file.path.split("/").pop());
    assert.ok(file.language, `${file.path} language`);
    assert.ok(file.view, `${file.path} view`);
    assert.ok(file.text.length > 0, `${file.path} text`);
    assert.ok(file.text.every((line) => typeof line === "string"));
  }
});

test("profile.json source parses back to the profile", () => {
  const profile = files.find((f) => f.path === "about/profile.json");
  assert.equal(JSON.parse(profile.lines.map(lineText).join("\n")).name, "Ada Example");
});

test("project descriptions are searchable even though cards render them", () => {
  const projects = files.find((f) => f.path === "projects/projects.tsx");
  assert.ok(projects.text.some((line) => line.includes("streams from the terminal")));
});

test("buildTree nests files under folders and keeps root files last", () => {
  const tree = buildTree(files);
  assert.deepEqual(
    tree.map((n) => `${n.type}:${n.name}`),
    [
      "folder:about",
      "folder:ai",
      "folder:metrics",
      "folder:projects",
      "folder:experience",
      "folder:skills",
      "folder:contact",
      "file:resume.pdf",
      "file:LICENSE",
    ],
  );
  assert.deepEqual(tree[0].children.map((f) => f.name), ["README.md", "profile.json"]);
});

test("agents.py declares every node and edge of the agent graph", () => {
  const source = files.find((f) => f.path === "ai/agents.py").lines.map(lineText).join("\n");
  assert.match(source, /from langgraph\.graph import StateGraph, END/);
  assert.match(source, /graph\.add_node\("retrieve", retrieve_docs\)/);
  assert.match(source, /graph\.add_edge\("generate", END\)/);
});

test("impact.json lists each metric with its computed change", () => {
  const impact = files.find((f) => f.path === "metrics/impact.json");
  const parsed = JSON.parse(impact.lines.map(lineText).join("\n"));
  assert.deepEqual(parsed[0], { metric: "Throughput", before: "780 req/min", after: "1,110 req/min", change: "+42%", where: "Acme" });
});

test("the résumé file only offers it on request by email", () => {
  const resume = files.find((f) => f.path === "resume.pdf");
  assert.ok(resume.text.some((line) => line.includes("ada@example.com")));
  assert.ok(resume.text.every((line) => !/download|\.pdf\b.*http|assets\//i.test(line)));
});

test("education is part of the experience file", () => {
  const experience = files.find((f) => f.path === "experience/experience.yml");
  assert.ok(experience.text.some((line) => line.includes("MS Computer Science")));
});
