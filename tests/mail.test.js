import { test } from "node:test";
import assert from "node:assert/strict";
import { mailtoUrl, buildFeedbackMessage, sendFeedback } from "../src/lib/mail.js";

test("mailtoUrl encodes subject and body cleanly", () => {
  const url = mailtoUrl("dev@example.com", "Hello & hi", "Line 1\nLine 2");
  assert.equal(url, "mailto:dev@example.com?subject=Hello%20%26%20hi&body=Line%201%0ALine%202");
});

test("buildFeedbackMessage formats feedback and bug reports with optional context", () => {
  const fb = buildFeedbackMessage({ kind: "feedback", name: "Alex", email: "alex@example.com", message: "Love the editor!" });
  assert.equal(fb.subject, "[Portfolio Feedback] from Alex");
  assert.match(fb.body, /^Love the editor!/);
  assert.match(fb.body, /— Alex \(alex@example\.com\)$/);

  const bug = buildFeedbackMessage({
    kind: "bug",
    name: "Sam",
    message: "Tab close button clipped",
    context: { page: "ai/agents.py", theme: "material-dark", font: "jetbrains", viewport: "1440×900" },
  });
  assert.equal(bug.subject, "[Portfolio Bug Report] from Sam");
  assert.match(bug.body, /Type: Bug report/);
  assert.match(bug.body, /Page: ai\/agents\.py/);
  assert.match(bug.body, /Theme: material-dark/);
});

test("sendFeedback returns mailto mode when no endpoint is configured", async () => {
  const res = await sendFeedback({
    endpoint: "",
    to: "owner@example.com",
    kind: "feedback",
    name: "Maya",
    message: "Great portfolio",
  });
  assert.equal(res.ok, true);
  assert.equal(res.mode, "mailto");
  assert.ok(res.mailto.startsWith("mailto:owner@example.com?subject="));
});

test("sendFeedback posts JSON directly when an endpoint is configured and falls back on error", async () => {
  let received = null;
  const okFetch = async (url, init) => {
    received = { url, method: init.method, body: JSON.parse(init.body) };
    return { ok: true, status: 200 };
  };
  const direct = await sendFeedback({
    endpoint: "https://formspree.io/f/example",
    to: "owner@example.com",
    kind: "bug",
    name: "Riya",
    email: "riya@example.com",
    message: "Minor layout glitch",
    fetchImpl: okFetch,
  });
  assert.equal(direct.ok, true);
  assert.equal(direct.mode, "direct");
  assert.equal(received.url, "https://formspree.io/f/example");
  assert.equal(received.method, "POST");
  assert.equal(received.body.type, "Bug Report");
  assert.equal(received.body._replyto, "riya@example.com");

  const failFetch = async () => ({ ok: false, status: 503 });
  const fallback = await sendFeedback({
    endpoint: "https://formspree.io/f/example",
    to: "owner@example.com",
    kind: "feedback",
    name: "Riya",
    message: "Hello",
    fetchImpl: failFetch,
  });
  assert.equal(fallback.ok, false);
  assert.equal(fallback.mode, "mailto-fallback");
  assert.ok(fallback.mailto.startsWith("mailto:owner@example.com"));
});
