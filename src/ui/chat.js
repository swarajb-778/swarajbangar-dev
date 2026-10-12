import { h, icon, prefersReducedMotion } from "../lib/dom.js";
import { answer } from "../lib/assistant.js";

const SUGGESTIONS = [
  "What's your agentic AI work?",
  "What impact have you had?",
  "Show me your projects",
  "What's your tech stack?",
  "Are you open to work?",
  "How can I contact you?",
];

const normalize = (text) => text.trim().toLowerCase();

export function createChat(app, root) {
  const log = h("div", { class: "chat-log", role: "log", "aria-live": "polite" });
  const input = h("input", { class: "input", placeholder: "Ask about my work…", "aria-label": "Ask a question", enterkeyhint: "send" });
  const suggestions = h("div", { class: "chat-suggest" });
  // ponytail: kept in memory on purpose, so a reload brings every suggestion back.
  const asked = new Set();

  function renderSuggestions() {
    const hadFocus = suggestions.contains(document.activeElement);
    const remaining = SUGGESTIONS.filter((s) => !asked.has(normalize(s)));
    suggestions.replaceChildren(...remaining.map((s) => h("button", { class: "chip-btn", type: "button", onclick: () => ask(s) }, s)));
    suggestions.hidden = remaining.length === 0;
    // The clicked chip is gone, so keep keyboard users inside the assistant.
    if (hadFocus) (suggestions.querySelector("button") ?? input).focus();
  }

  function bubble(kind, text, links = []) {
    const el = h(
      "div",
      { class: `bubble ${kind}` },
      h("p", {}, text),
      links.length > 0 && h("div", { class: "bubble-links" }, links.map((l) => h("button", { class: "chip-btn", type: "button", onclick: () => app.open(l.path) }, l.label))),
    );
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function ask(question) {
    const q = question.trim();
    if (!q) return;
    if (!asked.has(normalize(q))) {
      asked.add(normalize(q));
      renderSuggestions();
    }
    bubble("user", q);
    const typing = bubble("bot typing", "Thinking…");
    setTimeout(
      () => {
        typing.remove();
        const reply = answer(q, app.content);
        bubble("bot", reply.text, reply.links);
      },
      prefersReducedMotion() ? 0 : 420,
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
    input,
    h("button", { class: "btn primary icon-only", type: "submit", "aria-label": "Send" }, icon("send", { size: 16 })),
  );

  root.append(
    h(
      "div",
      { class: "sb-header" },
      h("h2", { class: "sb-title" }, app.content.ai?.agent?.name ? `${app.content.ai.agent.name} · assistant` : "Assistant"),
      h("div", { class: "sb-actions" }, h("button", { class: "icon-button", type: "button", "aria-label": "Close assistant", onclick: () => app.toggleChat(false) }, icon("close", { size: 16 }))),
    ),
    h("p", { class: "chat-note" }, "Answers come from this portfolio's content. No AI service, and nothing leaves your browser."),
    log,
    suggestions,
    form,
  );

  renderSuggestions();
  bubble("bot", answer("hello", app.content).text);

  const render = (state, prev) => {
    root.hidden = !state.chatOpen;
    if (state.chatOpen && prev && !prev.chatOpen) requestAnimationFrame(() => input.focus());
  };
  app.store.subscribe(render);
  render(app.store.get());

  return { ask };
}
