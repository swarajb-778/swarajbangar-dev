import { test } from "node:test";
import assert from "node:assert/strict";
import { createShell } from "../src/lib/shell.js";
import { buildFiles } from "../src/files.js";
import { content } from "./fixtures.js";

const files = buildFiles(content);
const newShell = () => createShell({ content, files, themes: ["midnight", "daylight"] });
const out = (shell, input) => shell.run(input).output;

test("help lists the core commands", () => {
  const text = out(newShell(), "help").join("\n");
  for (const cmd of ["ls", "cat", "open", "whoami", "theme", "clear", "ask"]) assert.match(text, new RegExp(`\\b${cmd}\\b`));
});

test("whoami prints name and role", () => {
  assert.deepEqual(out(newShell(), "whoami"), ["Ada Example — Software Engineer"]);
});

test("ls lists folders and root files, and the contents of a folder", () => {
  const shell = newShell();
  const root = out(shell, "ls");
  assert.ok(root.includes("about/"));
  assert.ok(root.includes("resume.pdf"));
  assert.deepEqual(out(shell, "ls projects"), ["projects.tsx"]);
  assert.deepEqual(out(shell, "ls nope"), ["ls: nope: No such directory"]);
});

test("cat prints a file by name or path and reports missing files", () => {
  const shell = newShell();
  const readme = files.find((f) => f.name === "README.md");
  assert.deepEqual(out(shell, "cat README.md"), readme.text);
  assert.deepEqual(out(shell, "cat about/README.md"), readme.text);
  assert.deepEqual(out(shell, "cat nope"), ["cat: nope: No such file"]);
  assert.deepEqual(out(shell, "cat"), ["usage: cat <file>"]);
});

test("open, theme, clear, exit, resume and ask emit effects for the UI", () => {
  const shell = newShell();
  assert.deepEqual(shell.run("open projects.tsx").effects, [{ type: "open", path: "projects/projects.tsx" }]);
  assert.deepEqual(shell.run("theme daylight").effects, [{ type: "theme", name: "daylight" }]);
  assert.deepEqual(shell.run("clear").effects, [{ type: "clear" }]);
  assert.deepEqual(shell.run("exit").effects, [{ type: "closePanel" }]);
  assert.deepEqual(shell.run("ask what are your skills").effects, [{ type: "ask", question: "what are your skills" }]);
});

test("resume asks visitors to email instead of downloading", () => {
  const { output, effects } = newShell().run("resume");
  assert.match(output.join(" "), /ada@example\.com/);
  assert.doesNotMatch(output.join(" "), /download/i);
  assert.deepEqual(effects, [{ type: "requestResume" }]);
});

test("theme without a name lists themes; an unknown theme is an error", () => {
  const shell = newShell();
  assert.match(out(shell, "theme").join("\n"), /midnight[\s\S]*daylight/);
  assert.deepEqual(out(shell, "theme neon"), ["theme: neon: unknown theme (try: midnight, daylight)"]);
});

test("contact prints email and social links", () => {
  const text = out(newShell(), "contact").join("\n");
  assert.match(text, /ada@example\.com/);
  assert.match(text, /github\.com\/ada/);
});

test("unknown commands, echo, and sudo", () => {
  const shell = newShell();
  assert.match(out(shell, "foo")[0], /command not found: foo/);
  assert.deepEqual(out(shell, "echo hi  there"), ["hi there"]);
  assert.match(out(shell, "sudo rm -rf /").join(" "), /permission/i);
});

test("neofetch, impact, and education summarize the profile", () => {
  const shell = newShell();
  const neofetch = out(shell, "neofetch").join("\n");
  assert.match(neofetch, /Ada Example/);
  assert.match(neofetch, /Pune, India/);
  assert.match(out(shell, "impact").join("\n"), /Throughput[\s\S]*\+42%/);
  assert.match(out(shell, "education").join("\n"), /MS Computer Science/);
});

test("sudo hire <first name> opens the contact file", () => {
  const { output, effects } = newShell().run("sudo hire ada");
  assert.match(output.join(" "), /granted/i);
  assert.deepEqual(effects, [{ type: "open", path: "contact/contact.ts" }]);
});

test("history records non-empty commands only", () => {
  const shell = newShell();
  shell.run("whoami");
  shell.run("   ");
  shell.run("ls");
  assert.deepEqual(shell.history, ["whoami", "ls"]);
  assert.deepEqual(out(shell, "history"), ["  1  whoami", "  2  ls", "  3  history"]);
});

test("complete suggests commands, file names, and theme names", () => {
  const shell = newShell();
  assert.deepEqual(shell.complete("th"), ["theme"]);
  assert.deepEqual(shell.complete("cat pro"), ["cat profile.json", "cat projects.tsx"]);
  assert.deepEqual(shell.complete("theme da"), ["theme daylight"]);
});
