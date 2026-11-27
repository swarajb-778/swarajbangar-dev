import { h, icon, fileIcon, prefersReducedMotion } from "../lib/dom.js";
import { answer, STARTER_PROMPTS } from "../lib/assistant.js";

const normalize = (text) => text.trim().toLowerCase();

export function createChat(app, root) {
  const log = h("div", { class: "chat-log", role: "log", "aria-live": "polite" });
  const input = h("input", {
    class: "chat-input",
    placeholder: "Ask about LangGraph, impact, stack…",
    "aria-label": "Ask a question",
    enterkeyhint: "send",
  });
  const suggestions = h("div", { class: "chat-suggest", hidden: true });
  const contextFile = h("button", {
    class: "chat-context-pill",
    type: "button",
    title: "Active workspace file in context",
  });
  // Kept in memory on purpose, so a reload or "New chat" restores every prompt.
  const asked = new Set();
  let welcomeEl = null;

  function fileForPath(path) {
    return app.fileMap.get(path) ?? null;
  }

  function renderWelcome() {
    const agentName = app.content.ai?.agent?.name ?? "SwarajOS";
    const cards = STARTER_PROMPTS.map((item) =>
      h(
        "button",
        { class: "starter-card", type: "button", onclick: () => ask(item.prompt) },
        h("span", { class: "starter-icon", "aria-hidden": "true" }, icon(item.icon, { size: 15 })),
        h(
          "span",
          { class: "starter-body" },
          h("span", { class: "starter-title" }, item.title),
          h("span", { class: "starter-prompt" }, item.prompt),
        ),
        h("span", { class: "starter-source" }, item.source),
      ),
    );

    welcomeEl = h(
      "section",
      { class: "chat-welcome", "aria-label": "Suggested questions" },
      h(
        "div",
        { class: "chat-welcome-hero" },
        h("span", { class: "chat-emblem", "aria-hidden": "true" }, icon("sparkle", { size: 18 })),
        h(
          "div",
          { class: "chat-welcome-copy" },
          h("h3", { class: "chat-welcome-title" }, `Ask ${agentName}`),
          h("p", { class: "chat-welcome-sub" }, "Grounded in this portfolio's files — cited answers, zero external calls."),
        ),
      ),
      h("div", { class: "starter-list" }, cards),
    );
    log.replaceChildren(welcomeEl);
  }

  function renderSuggestions() {
    const hadFocus = suggestions.contains(document.activeElement);
    const remaining = STARTER_PROMPTS.filter((item) => !asked.has(normalize(item.prompt)));
    const showCompact = asked.size > 0 && remaining.length > 0;
    suggestions.replaceChildren(
      ...remaining.map((item) =>
        h("button", { class: "chip-btn", type: "button", onclick: () => ask(item.prompt) }, item.title),
      ),
    );
    suggestions.hidden = !showCompact;
    if (hadFocus && showCompact) (suggestions.querySelector("button") ?? input).focus();
  }

  function renderUserBubble(text) {
    const el = h("div", { class: "chat-user" }, h("p", {}, text));
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function renderThinking() {
    const el = h(
      "div",
      { class: "answer-card is-thinking" },
      h("span", { class: "answer-dot", "aria-hidden": "true" }),
      h("span", {}, "Retrieving portfolio sources…"),
    );
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function renderAnswerCard(reply) {
    const card = reply.card;
    const status = card?.status ?? "grounded";
    const links = reply.links ?? [];

    const sourceChips = links.map((link) => {
      const file = fileForPath(link.path);
      return h(
        "button",
        { class: "source-chip", type: "button", onclick: () => app.open(link.path), title: `Open ${link.path}` },
        file ? fileIcon(file.icon, file.name) : icon("files", { size: 13 }),
        h("span", {}, link.label),
      );
    });

    const el = h(
      "article",
      { class: `answer-card is-${status}` },
      card &&
        h(
          "header",
          { class: "answer-head" },
          h("span", { class: "answer-title" }, card.title),
          h("span", { class: `answer-badge is-${status}` }, card.badge),
        ),
      card?.trace?.length > 0 &&
        h(
          "ol",
          { class: "answer-trace", "aria-label": "Retrieval trace" },
          card.trace.map((step) => h("li", { class: "answer-trace-step" }, step)),
        ),
      h("p", { class: "answer-summary" }, reply.text),
      card?.facts?.length > 0 &&
        h(
          "dl",
          { class: "answer-facts" },
          card.facts.map((fact) =>
            h(
              "div",
              { class: "answer-fact" },
              h(
                "div",
                { class: "answer-fact-row" },
                h("dt", { class: "answer-fact-label" }, fact.label),
                fact.value && h("dd", { class: `answer-fact-val${fact.tone ? ` is-${fact.tone}` : ""}` }, fact.value),
              ),
              fact.detail && h("dd", { class: "answer-fact-detail" }, fact.detail),
            ),
          ),
        ),
      sourceChips.length > 0 &&
        h(
          "footer",
          { class: "answer-sources" },
          h("span", { class: "answer-sources-label" }, "Sources"),
          h("div", { class: "answer-sources-list" }, sourceChips),
        ),
    );
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function resetChat() {
    asked.clear();
    renderWelcome();
    renderSuggestions();
    input.focus();
  }

  function ask(question) {
    const q = question.trim();
    if (!q) return;
    if (welcomeEl?.isConnected) {
      welcomeEl.remove();
      welcomeEl = null;
    }
    if (!asked.has(normalize(q))) {
      asked.add(normalize(q));
      renderSuggestions();
    }
    renderUserBubble(q);
    const typing = renderThinking();
    setTimeout(
      () => {
        typing.remove();
        const reply = answer(q, app.content);
        renderAnswerCard(reply);
      },
      prefersReducedMotion() ? 0 : 280,
    );
  }

  const form = h(
    "form",
    {
      class: "chat-form",
      onsubmit: (e) => {
        e.preventDefault();
        ask(input.value);
        input.value = "";
      },
    },
    h(
      "div",
      { class: "chat-context", "aria-label": "Attached context" },
      contextFile,
      app.fileMap.has("ai/agents.py") &&
        h(
          "button",
          {
            class: "chat-context-pill is-agent",
            type: "button",
            title: "Inspect SwarajOS agent architecture",
            onclick: () => app.open("ai/agents.py"),
          },
          icon("sparkle", { size: 12 }),
          h("span", {}, "agents.py"),
        ),
    ),
    h(
      "div",
      { class: "chat-box" },
      input,
      h(
        "div",
        { class: "chat-box-foot" },
        h("span", { class: "chat-mode-tag" }, "Local RAG · Cited"),
        h(
          "button",
          { class: "chat-send", type: "submit", "aria-label": "Send", title: "Send (Enter)" },
          icon("send", { size: 15 }),
        ),
      ),
    ),
  );

  const agentName = app.content.ai?.agent?.name ?? "Assistant";

  root.append(
    h(
      "div",
      { class: "sb-header chat-header" },
      h(
        "div",
        { class: "chat-title-group" },
        h("span", { class: "chat-title-icon", "aria-hidden": "true" }, icon("sparkle", { size: 14 })),
        h("h2", { class: "sb-title" }, "Ask Me"),
        h("span", { class: "chat-agent-pill" }, agentName),
      ),
      h(
        "div",
        { class: "sb-actions" },
        h(
          "button",
          { class: "icon-button", type: "button", "aria-label": "New chat", title: "New chat", onclick: resetChat },
          icon("plus", { size: 15 }),
        ),
        app.fileMap.has("ai/agents.py") &&
          h(
            "button",
            {
              class: "icon-button",
              type: "button",
              "aria-label": "Open SwarajOS agent lab",
              title: "Inspect SwarajOS graph (agents.py)",
              onclick: () => app.open("ai/agents.py"),
            },
            icon("external", { size: 14 }),
          ),
        h(
          "button",
          { class: "icon-button", type: "button", "aria-label": "Close Ask Me", title: "Close Ask Me", onclick: () => app.toggleChat(false) },
          icon("close", { size: 15 }),
        ),
      ),
    ),
    log,
    suggestions,
    form,
  );

  renderWelcome();

  function syncContext(activePath) {
    const file = activePath ? fileForPath(activePath) : null;
    if (!file) {
      contextFile.hidden = true;
      return;
    }
    contextFile.hidden = false;
    contextFile.onclick = () => app.open(file.path);
    contextFile.replaceChildren(fileIcon(file.icon, file.name), h("span", {}, file.name));
  }

  const render = (state, prev) => {
    root.hidden = !state.chatOpen;
    if (!prev || state.active !== prev.active) syncContext(state.active);
    if (state.chatOpen && prev && !prev.chatOpen) requestAnimationFrame(() => input.focus());
  };
  app.store.subscribe(render);
  render(app.store.get());

  return { ask, reset: resetChat };
}
