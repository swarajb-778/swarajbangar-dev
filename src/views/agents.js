import { h, prefersReducedMotion } from "../lib/dom.js";
import { layerGraph } from "../lib/graph.js";
import { codeBlock, doc, heading } from "./parts.js";

function stepShape(step) {
  if (Array.isArray(step)) return { ids: [step[0]], details: [step[1]], ms: step[2] };
  if (step.parallel) return { ids: step.parallel.map((part) => part[0]), details: step.parallel.map((part) => part[1]), ms: step.ms ?? 120 };
  return { gate: true, ids: [step.gate], details: [step.detail], ms: 0 };
}

export function renderAgents(file, ctx) {
  const { ai } = ctx.content;
  const agent = ai[file.agentId] ?? ai.agent;
  const byId = new Map(agent.nodes.map((n) => [n.id, n]));
  const layers = layerGraph(agent.nodes, agent.edges);
  const nodeEls = new Map();

  const arrow = () => h("span", { class: "agent-arrow", "aria-hidden": "true" }, "→");
  const graph = h(
    "div",
    {
      class: "agent-graph",
      role: "img",
      "aria-label": `${agent.name} graph: ${layers.map((layer) => layer.map((id) => byId.get(id).label).join(" or ")).join(", then ")}`,
    },
    layers.map((layer, i) => [
      i > 0 && arrow(),
      h(
        "div",
        { class: "agent-layer" },
        layer.map((id) => {
          const node = byId.get(id);
          const el = h("div", { class: "agent-node", title: node.detail }, h("span", { class: "agent-node-label" }, node.label), h("code", { class: "agent-node-fn" }, node.fn));
          nodeEls.set(id, el);
          return el;
        }),
      ),
    ]),
    arrow(),
    h("div", { class: "agent-layer" }, h("div", { class: "agent-node is-end" }, h("span", { class: "agent-node-label" }, "END"))),
  );

  const notes = agent.edges.filter(([, , note]) => note);
  const loopNotes =
    notes.length > 0 &&
    h(
      "ul",
      { class: "loop-notes" },
      notes.map(([from, to, note]) => h("li", {}, h("code", {}, `${from} → ${to}`), ` ${note}`)),
    );

  const log = h("ol", { class: "trace-log", "aria-live": "polite" });
  const summary = h("p", { class: "trace-summary" });
  const decision = h("div", { class: "form-actions" });
  let timers = [];
  let started = false;
  let elapsed = 0;
  let stepCount = 0;
  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  function paint(shape) {
    nodeEls.forEach((el) => el.classList.replace("is-active", "is-done"));
    shape.ids.forEach((id, index) => {
      nodeEls.get(id)?.classList.add("is-active");
      elapsed += index === 0 ? shape.ms : 0;
      stepCount += 1;
      log.append(
        h(
          "li",
          { class: "trace-step" },
          h("span", { class: "trace-node" }, byId.get(id)?.label ?? id),
          h("span", { class: "trace-detail" }, shape.details[index]),
          h("span", { class: "trace-ms" }, index === 0 ? `${shape.ms}ms` : ""),
        ),
      );
    });
  }

  function play(steps, onDone) {
    const instant = prefersReducedMotion();
    let delay = 0;
    steps.forEach((step, index) => {
      const shape = stepShape(step);
      delay += instant ? 0 : Math.min(Math.max(shape.ms, 280), 900);
      timers.push(
        setTimeout(() => {
          if (!log.isConnected) return stop();
          paint(shape);
          if (shape.gate) {
            summary.textContent = shape.details[0];
            decision.replaceChildren(
              ...Object.keys(traceChoices).map((choice) =>
                h("button", { class: choice === "Approve" ? "btn primary" : "btn", type: "button", onclick: () => choose(choice) }, choice),
              ),
            );
            return;
          }
          if (index === steps.length - 1) onDone();
        }, delay),
      );
    });
  }

  let traceChoices = {};
  function choose(choice) {
    decision.replaceChildren();
    play(traceChoices[choice] ?? [], finish);
  }
  function finish() {
    summary.textContent = `Finished in ${elapsed}ms across ${stepCount} steps (simulated replay).`;
  }

  function run(trace, button) {
    started = true;
    stop();
    log.replaceChildren();
    decision.replaceChildren();
    summary.textContent = "Running…";
    elapsed = 0;
    stepCount = 0;
    traceChoices = trace.choices ?? {};
    nodeEls.forEach((el) => el.classList.remove("is-active", "is-done"));
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    play(trace.steps, finish);
  }

  const buttons = agent.traces.map((trace) => {
    const button = h("button", { class: "filter", type: "button", "aria-pressed": "false", onclick: () => run(trace, button) }, trace.question);
    return button;
  });
  setTimeout(() => log.isConnected && !started && run(agent.traces[0], buttons[0]), 700);

  const evals = h(
    "section",
    { class: "card" },
    h("h3", { class: "card-title" }, "Eval scorecard"),
    agent.evalNote && h("p", { class: "card-sub" }, agent.evalNote),
    h(
      "ul",
      { class: "eval-list" },
      agent.evals.map((e) => {
        const pct = `${Math.round(e.score * 100)}%`;
        return h(
          "li",
          {},
          h("span", { class: "eval-metric" }, e.metric),
          h("span", { class: "meter", "aria-hidden": "true" }, h("span", { class: "meter-fill", style: { width: pct } })),
          h("span", { class: "eval-score" }, pct),
        );
      }),
    ),
  );

  return doc(
    codeBlock(file.lines),
    heading("Agent graph", "graph"),
    h("p", { class: "prose" }, agent.intro ?? ai.summary),
    graph,
    loopNotes,
    heading("Replay a trace", "trace"),
    h("div", { class: "filters", role: "toolbar", "aria-label": "Sample questions" }, buttons),
    h("div", { class: "card trace-panel" }, log, summary, decision),
    heading("Evals", "evals"),
    evals,
    heading("How each step works", "steps"),
    h(
      "div",
      { class: "card-grid" },
      agent.nodes.map((n) => h("div", { class: "card" }, h("h3", { class: "card-title" }, n.label), h("p", { class: "card-sub" }, `${n.fn}()`), h("p", { class: "card-text" }, n.detail))),
    ),
  );
}
