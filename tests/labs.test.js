import { test } from "node:test";
import assert from "node:assert/strict";
import { layerGraph } from "../src/lib/graph.js";
import { reconcile } from "../src/lib/reconcile.js";
import { retrieve } from "../src/lib/retrieve.js";
import { callImpactTool, openApiToMcp } from "../src/lib/mcp.js";

const ledger = {
  clean: 21,
  edges: [
    { id: "FEE-1", kind: "fee", amountDelta: 1.2, daySkew: 0, duplicate: false, key: true },
    { id: "DATE-1", kind: "date", amountDelta: 0, daySkew: 2, duplicate: false, key: true },
    { id: "DUP-1", kind: "duplicate", amountDelta: 0, daySkew: 0, duplicate: true, key: true },
    { id: "BAD-1", kind: "unmatched", amountDelta: 40, daySkew: 0, duplicate: false, key: true },
  ],
};

test("strict rules reproduce the 84% first pass and the key recovers the rest", () => {
  const strict = reconcile(ledger, { tolerance: 0, dateWindow: 0, requireKey: false });
  assert.equal(strict.matched, 21);
  assert.equal(strict.total, 25);
  const loose = reconcile(ledger, { tolerance: 2, dateWindow: 3, requireKey: true });
  assert.equal(loose.matched, 24);
  assert.equal(loose.rows.find((row) => row.id === "BAD-1").matched, false);
  assert.equal(loose.rows.find((row) => row.id === "DUP-1").matched, true);
});

test("retrieval ranks the chunk that shares the query words and abstains below the threshold", () => {
  const chunks = [
    { id: "a", path: "experience.yml", text: "Analyst research time dropped after the agentic platform shipped" },
    { id: "b", path: "projects.tsx", text: "Voice agents book appointments over WebRTC" },
  ];
  const found = retrieve(chunks, "analyst research time", { threshold: 0.01 });
  assert.equal(found.abstain, false);
  assert.equal(found.hits[0].id, "a");
  assert.equal(retrieve(chunks, "salary expectations", { threshold: 0.05 }).abstain, true);
});

test("an OpenAPI operation becomes an MCP tool schema", () => {
  const tool = openApiToMcp({
    operationId: "getImpact",
    summary: "Look up a metric",
    parameters: [{ name: "metric", required: true, description: "Label", schema: { type: "string" } }],
  });
  assert.equal(tool.name, "getImpact");
  assert.deepEqual(tool.inputSchema.required, ["metric"]);
  assert.equal(tool.inputSchema.properties.metric.type, "string");
});

test("impact.lookup returns the metric or an error", () => {
  const impact = [{ label: "Throughput", before: 1, after: 2, unit: "req/min", company: "Acme" }];
  assert.equal(callImpactTool(impact, { metric: "throughput" }).content.change, "+100%");
  assert.equal(callImpactTool(impact, { metric: "nope" }).isError, true);
});

test("the on-call evidence nodes share one column", () => {
  const nodes = ["page", "hypothesize", "metrics", "broker", "changes", "judge", "gate", "act", "escalate", "confirm"].map((id) => ({ id }));
  const edges = [
    ["page", "hypothesize"],
    ["hypothesize", "metrics"],
    ["hypothesize", "broker"],
    ["hypothesize", "changes"],
    ["metrics", "judge"],
    ["broker", "judge"],
    ["changes", "judge"],
    ["judge", "gate"],
    ["gate", "act"],
    ["gate", "escalate"],
    ["act", "confirm"],
    ["confirm", "judge"],
    ["confirm", "END"],
    ["escalate", "END"],
  ];
  assert.deepEqual(layerGraph(nodes, edges)[2], ["metrics", "broker", "changes"]);
});

test("retrieval abstains when no keyword appears anywhere, even at the default threshold", () => {
  const chunks = [
    { id: "a#0", path: "a", text: "I cut median analyst research time by 40% with an agentic research platform" },
    { id: "b#0", path: "b", text: "Voice agents over WebRTC book appointments through tool calling" },
  ];
  assert.equal(retrieve(chunks, "what salary are you asking for").abstain, true);
  assert.equal(retrieve(chunks, "analyst research time").abstain, false);
});
