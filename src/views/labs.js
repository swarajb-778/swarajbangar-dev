// Interactive labs: retrieval, reconciliation, request waterfalls, and the MCP tool call.
// The numbers reconstruct published results. They are not live production traffic.
import { h, prefersReducedMotion } from "../lib/dom.js";
import { reconcile } from "../lib/reconcile.js";
import { retrieve } from "../lib/retrieve.js";
import { callImpactTool, impactToolSchema, openApiToMcp } from "../lib/mcp.js";
import { codeBlock, doc, heading } from "./parts.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 0 : ms));

function chunksFrom(files) {
  return files.flatMap((file) =>
    file.text
      .filter((line) => line.trim().length > 40)
      .slice(0, 6)
      .map((text, index) => ({ id: `${file.path}#${index}`, path: file.path, text })),
  );
}

export function renderRetrieve(file, ctx) {
  const chunks = chunksFrom(ctx.files);
  const presets = ["analyst research time", "voice agents", "what salary is he asking for"];
  const query = h("input", { class: "input", value: presets[0], "aria-label": "Retrieval query" });
  const threshold = h("input", { type: "range", min: "0", max: "0.04", step: "0.001", value: "0.012", "aria-label": "Abstain threshold" });
  const thresholdLabel = h("span", { class: "card-sub" });
  const columns = h("div", { class: "retrieve-columns" });
  const verdict = h("p", { class: "hint", role: "status" });

  const list = (title, rows, renderRow) =>
    h("section", { class: "card" }, h("h3", { class: "card-title" }, title), rows.length ? h("ol", { class: "retrieve-list" }, rows.slice(0, 4).map(renderRow)) : h("p", { class: "card-text" }, "No hits."));

  async function run() {
    const result = retrieve(chunks, query.value, { threshold: Number(threshold.value) });
    thresholdLabel.textContent = `abstain below ${Number(threshold.value).toFixed(3)}`;
    columns.replaceChildren(h("p", { class: "hint" }, "Scoring…"));
    await wait(180);
    const lexical = list("Lexical · BM25", result.lexical, (row) => h("li", {}, row.id.split("#")[0]));
    columns.replaceChildren(lexical, h("p", { class: "hint" }, "Dense leg next…"));
    await wait(220);
    const dense = list("Dense · trigram stand-in", result.dense, (row) => h("li", {}, row.id.split("#")[0]));
    columns.replaceChildren(lexical, dense);
    await wait(220);
    const fused = list(
      "Fused",
      result.hits,
      (hit) =>
        h(
          "li",
          {},
          h("button", { class: "chip-btn", type: "button", onclick: () => ctx.open(hit.path) }, hit.path),
          h("span", { class: "card-text" }, hit.text),
        ),
    );
    columns.replaceChildren(lexical, dense, fused);
    verdict.textContent = result.abstain ? "Below the line. The agent would abstain and write no answer." : "Above the line. A grounded answer is allowed.";
  }

  query.addEventListener("input", run);
  threshold.addEventListener("input", run);
  queueMicrotask(run);

  return doc(
    codeBlock(file.lines),
    heading("Hybrid retrieval", "retrieve"),
    h("p", { class: "prose" }, "Lexical search and a local trigram stand-in for embeddings, fused by reciprocal rank. The dense leg is not Pinecone; it shows the shape of the pipeline."),
    h("div", { class: "filters" }, presets.map((preset) => h("button", { class: "filter", type: "button", onclick: () => { query.value = preset; run(); } }, preset))),
    query,
    h("label", { class: "field" }, h("span", { class: "field-label" }, "Threshold ", thresholdLabel), threshold),
    verdict,
    columns,
  );
}

export function renderReconcile(file, ctx) {
  const ledger = ctx.content.labs.ledger;
  const rules = { tolerance: 0, dateWindow: 0, requireKey: false };
  const rate = h("p", { class: "kpi-delta", role: "status" }, "—");
  const table = h("div", { class: "ledger" });
  let ticket = 0;

  const toggle = (key, label) =>
    h("label", { class: "check" }, h("input", { type: "checkbox", onchange: (event) => { rules[key] = event.target.checked ? (key === "requireKey" ? true : key === "tolerance" ? 2 : 3) : key === "requireKey" ? false : 0; paint(); } }), label);

  async function paint() {
    const mine = ++ticket;
    rate.textContent = "…";
    rate.dataset.pending = "true";
    await wait(280);
    if (mine !== ticket) return;
    const result = reconcile(ledger, rules);
    rate.textContent = `${Math.round(result.rate * 100)}%`;
    delete rate.dataset.pending;
    const edges = result.rows.filter((row) => row.kind !== "exact");
    table.replaceChildren(
      h("p", { class: "card-text" }, `${result.matched} of ${result.total} rows matched. ${ledger.clean} exact rows stay matched either way.`),
      h(
        "table",
        { class: "ledger-table" },
        h("thead", {}, h("tr", {}, ["Row", "Case", "Result"].map((label) => h("th", {}, label)))),
        h("tbody", {}, edges.map((row) => h("tr", { dataset: { matched: String(row.matched) } }, h("td", {}, row.id), h("td", {}, row.kind), h("td", {}, row.matched ? "matched" : "exception")))),
      ),
    );
  }

  paint();
  return doc(
    codeBlock(file.lines),
    heading("First-pass matcher", "matcher"),
    h("p", { class: "prose" }, "Strict rules leave the fee, the date skew, and the duplicate in the exception queue: 84%. Allowing a small tolerance and requiring the idempotency key recovers those three and leaves the unrelated amount: 96%, next to the published 97%."),
    h("div", { class: "filters" }, toggle("tolerance", "Amount tolerance"), toggle("dateWindow", "Date window"), toggle("requireKey", "Require idempotency key")),
    rate,
    table,
  );
}

function bars(spans, total) {
  return h(
    "ol",
    { class: "waterfall" },
    spans.map(([name, ms]) =>
      h(
        "li",
        {},
        h("span", { class: "waterfall-name" }, name),
        h("span", { class: "meter" }, h("span", { class: "meter-fill", style: { width: `${(ms / total) * 100}%` } })),
        h("span", { class: "waterfall-ms" }, `${ms}ms`),
      ),
    ),
  );
}

export function renderWaterfall(file, ctx) {
  const cases = ctx.content.labs.waterfalls;
  let current = 0;
  let side = "before";
  let ticket = 0;
  const board = h("div");
  const note = h("p", { class: "hint" });
  const filters = h("div", { class: "filters" });
  const widest = Math.max(...cases.flatMap((item) => [...item.before, ...item.after].map(([, ms]) => ms)));

  async function paint() {
    const mine = ++ticket;
    const item = cases[current];
    const spans = item[side];
    const total = spans.reduce((sum, [, ms]) => sum + ms, 0);
    note.textContent = `${item.note} This side sums to ${(total / 1000).toFixed(1)}s.`;
    filters.replaceChildren(
      ...cases.map((entry, index) => h("button", { class: "filter", type: "button", "aria-pressed": String(index === current), onclick: () => { current = index; paint(); } }, entry.name)),
      h("button", { class: "filter", type: "button", "aria-pressed": String(side === "before"), onclick: () => { side = "before"; paint(); } }, "Before"),
      h("button", { class: "filter", type: "button", "aria-pressed": String(side === "after"), onclick: () => { side = "after"; paint(); } }, "After"),
    );
    board.replaceChildren();
    for (const span of spans) {
      if (mine !== ticket) return;
      board.append(bars([span], widest));
      await wait(120);
    }
  }

  paint();
  return doc(codeBlock(file.lines), heading("Round trips", "waterfall"), note, filters, board);
}

export function renderMcp(file, ctx) {
  const { impact, labs } = ctx.content;
  const tool = impactToolSchema(impact);
  const adapted = openApiToMcp(labs.openapi);
  const select = h("select", { class: "input", "aria-label": "Metric" }, impact.map((metric) => h("option", { value: metric.label }, metric.label)));
  const result = h("pre", { class: "mcp-result" }, "Waiting for tools/call.");

  return doc(
    codeBlock(file.lines),
    heading("MCP contract", "mcp"),
    h("p", { class: "prose" }, "One local tool. tools/list advertises it, tools/call runs it against the impact metrics on this page. The OpenAPI snippet below is rewritten into the same shape."),
    h("h3", { class: "card-title" }, "tools/list"),
    h("pre", { class: "mcp-result" }, JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [tool] } }, null, 2)),
    h(
      "form",
      {
        class: "card contact-form",
        onsubmit: async (event) => {
          event.preventDefault();
          result.textContent = "";
          const payload = { jsonrpc: "2.0", id: 2, result: callImpactTool(impact, { metric: select.value }) };
          const text = JSON.stringify(payload, null, 2);
          for (let i = 1; i <= text.length; i += prefersReducedMotion() ? text.length : 24) {
            result.textContent = text.slice(0, i);
            await wait(16);
          }
        },
      },
      h("label", { class: "field" }, h("span", { class: "field-label" }, "impact.lookup · metric"), select),
      h("button", { class: "btn primary", type: "submit" }, "tools/call"),
    ),
    h("h3", { class: "card-title" }, "tools/call"),
    result,
    h("h3", { class: "card-title" }, "OpenAPI → MCP"),
    h("pre", { class: "mcp-result" }, JSON.stringify(adapted, null, 2)),
  );
}
