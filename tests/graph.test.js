import { test } from "node:test";
import assert from "node:assert/strict";
import { layerGraph } from "../src/lib/graph.js";

const nodes = ["classify", "route", "retrieve", "tools", "generate", "verify", "orphan"].map((id) => ({ id }));
const edges = [
  ["classify", "route"],
  ["route", "retrieve"],
  ["route", "tools"],
  ["retrieve", "generate"],
  ["tools", "generate"],
  ["generate", "verify"],
  ["verify", "generate"],
  ["verify", "END"],
];

test("layers nodes by distance from the entry, ignoring back edges and END", () => {
  assert.deepEqual(layerGraph(nodes, edges), [["classify"], ["route"], ["retrieve", "tools"], ["generate"], ["verify"]]);
});

test("returns an empty layout for an empty graph", () => {
  assert.deepEqual(layerGraph([], []), []);
});
