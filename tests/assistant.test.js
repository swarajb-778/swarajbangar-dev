import { test } from "node:test";
import assert from "node:assert/strict";
import { answer } from "../src/lib/assistant.js";
import realContent from "../src/content.js";
import { content } from "./fixtures.js";

const linksTo = (reply, path) => reply.links.some((l) => l.path === path);

// One question per intent, plus the fallback, so the voice checks cover every reply.
const QUESTIONS = [
  "How can I contact you?",
  "Can I see your resume?",
  "Where did you study?",
  "Tell me about your agentic AI experience",
  "What impact have you had?",
  "show me what you've built — any projects?",
  "What are your skills?",
  "Where have you worked?",
  "where are you based",
  "hello",
  "qwerty",
];
const FIRST_PERSON = /\b(?:I|I'm|I've|I'll|me|my|My)\b/;
const THIRD_PERSON = /\b(?:he|him|his|she|her|hers)\b|\b\w+ \w+'s portfolio\b/i;
const firstName = (c) => c.profile.name.split(" ")[0];

test("skills questions list skills and link to the skills file", () => {
  const reply = answer("What are your skills?", content);
  assert.match(reply.text, /TypeScript/);
  assert.ok(linksTo(reply, "skills/skills.json"));
});

test("contact questions include the email", () => {
  const reply = answer("How can I contact you?", content);
  assert.match(reply.text, /ada@example\.com/);
  assert.ok(linksTo(reply, "contact/contact.ts"));
});

test("project questions name projects", () => {
  const reply = answer("show me what you've built — any projects?", content);
  assert.match(reply.text, /Lantern/);
  assert.ok(linksTo(reply, "projects/projects.tsx"));
});

test("experience beats location when both words appear", () => {
  assert.match(answer("Where have you worked?", content).text, /Acme/);
});

test("location questions mention the location", () => {
  assert.match(answer("where are you based", content).text, /Pune/);
});

test("hiring questions point to contact, not experience", () => {
  const reply = answer("Are you available for work?", content);
  assert.match(reply.text, /ada@example\.com/);
  assert.ok(linksTo(reply, "contact/contact.ts"));
});

test("AI and agent questions describe the AI work and link to the agent lab", () => {
  const reply = answer("Tell me about your agentic AI experience", content);
  assert.match(reply.text, /retrieval-grounded agents/);
  assert.ok(linksTo(reply, "ai/agents.py"));
});

test("education beats location for 'where did you study'", () => {
  assert.match(answer("Where did you study?", content).text, /MS Computer Science/);
});

test("impact questions quote measured results", () => {
  const reply = answer("What impact have you had?", content);
  assert.match(reply.text, /\+42%/);
  assert.ok(linksTo(reply, "metrics/impact.json"));
});

test("résumé questions point to email, not a download", () => {
  const reply = answer("Can I see your resume?", content);
  assert.match(reply.text, /ada@example\.com/);
  assert.doesNotMatch(reply.text, /download/i);
  assert.ok(linksTo(reply, "contact/contact.ts"));
});

test("greetings introduce the person in the first person", () => {
  const { text } = answer("hello", content);
  assert.match(text, /\bI'm Ada Example\b/);
  assert.doesNotMatch(text, /Ada Example's/);
});

test("every reply speaks as the owner, in the first person", () => {
  for (const question of QUESTIONS) {
    const { text } = answer(question, content);
    assert.match(text, FIRST_PERSON, `${question} → ${text}`);
    assert.doesNotMatch(text, THIRD_PERSON, `${question} → ${text}`);
  }
});

test("only the greeting names the owner; no reply refers to them by first name", () => {
  for (const c of [content, realContent]) {
    const name = new RegExp(`\\b${firstName(c)}\\b`);
    for (const question of QUESTIONS.filter((q) => q !== "hello")) {
      const { text } = answer(question, c);
      assert.doesNotMatch(text, name, `${question} → ${text}`);
      assert.doesNotMatch(text, THIRD_PERSON, `${question} → ${text}`);
    }
  }
});

test("unknown questions fall back to suggested topics", () => {
  const reply = answer("qwerty", content);
  assert.match(reply.text, /projects/);
  assert.ok(reply.links.length > 0);
});
