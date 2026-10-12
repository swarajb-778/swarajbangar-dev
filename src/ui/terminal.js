import { h, icon } from "../lib/dom.js";
import { createShell } from "../lib/shell.js";

const ERROR_LINE = /^(command not found|usage:|\w+: .*(No such|unknown))/;

// VS Code's panel tabs. Only the terminal is interactive; the others show what VS Code shows when idle.
const PANEL_TABS = [
  { id: "problems", label: "Problems", empty: "No problems have been detected in the workspace." },
  { id: "output", label: "Output", empty: "[info] Static site · plain HTML, CSS, and JavaScript · 0 dependencies, no build step." },
  { id: "debug", label: "Debug Console", empty: "No active debug session. Open ai/agents.py to replay an agent trace step by step." },
  { id: "terminal", label: "Terminal", badge: "1" },
  { id: "ports", label: "Ports", empty: "No forwarded ports. This portfolio has no server to forward." },
];

const commonPrefix = (values) =>
  values.reduce((prefix, value) => {
    let i = 0;
    while (i < prefix.length && prefix[i] === value[i]) i++;
    return prefix.slice(0, i);
  });

export function createTerminal(app, root) {
  const shell = createShell({ content: app.content, files: app.files, themes: app.themes.map((t) => t.id) });
  const user = app.content.profile.name.split(" ")[0].toLowerCase();
  const prompt = `${user}@portfolio ~ %`;
  let cursor = null;
  let greeted = false;
  let tabId = "terminal";

  const output = h("div", { class: "term-output", role: "log", "aria-live": "polite" });
  const input = h("input", {
    class: "term-input",
    "aria-label": "Terminal input",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    enterkeyhint: "send",
  });
  const body = h(
    "div",
    { class: "term-body", onclick: () => window.getSelection()?.isCollapsed && input.focus() },
    output,
    h("div", { class: "term-line term-prompt-line" }, h("span", { class: "term-prompt" }, prompt), input),
  );

  const placeholder = h("div", { class: "panel-empty", hidden: true });
  const tabs = PANEL_TABS.map((tab) =>
    h(
      "button",
      { class: "panel-tab", type: "button", role: "tab", onclick: () => showTab(tab.id) },
      tab.label,
      tab.badge && h("span", { class: "panel-badge", "aria-label": `${tab.badge} open` }, tab.badge),
    ),
  );
  const maximize = h("button", { class: "icon-button", type: "button", onclick: () => setMaximized(!root.classList.contains("is-maximized")) });

  function showTab(id) {
    tabId = id;
    const tab = PANEL_TABS.find((t) => t.id === id);
    tabs.forEach((el, i) => el.setAttribute("aria-selected", String(PANEL_TABS[i].id === id)));
    body.hidden = id !== "terminal";
    placeholder.hidden = id === "terminal";
    placeholder.textContent = tab.empty ?? "";
    if (id === "terminal") requestAnimationFrame(() => input.focus());
  }

  function setMaximized(on) {
    root.classList.toggle("is-maximized", on);
    const label = on ? "Restore panel size" : "Maximize panel size";
    maximize.replaceChildren(icon(on ? "restore" : "maximize", { size: 16 }));
    maximize.setAttribute("aria-label", label);
    maximize.title = label;
  }

  root.append(
    h(
      "div",
      { class: "panel-header" },
      h("div", { class: "panel-tabs", role: "tablist", "aria-label": "Panel" }, tabs),
      h(
        "div",
        { class: "panel-actions" },
        h("button", { class: "icon-button", type: "button", "aria-label": "Clear terminal", title: "Clear", onclick: () => clear() }, icon("trash", { size: 16 })),
        maximize,
        h("button", { class: "icon-button", type: "button", "aria-label": "Close panel", title: "Close", onclick: () => app.togglePanel(false) }, icon("close", { size: 16 })),
      ),
    ),
    body,
    placeholder,
  );
  showTab(tabId);
  setMaximized(false);

  function print(lines, kind) {
    if (tabId !== "terminal") showTab("terminal");
    output.append(
      ...lines.map((line) => {
        const cls = kind ?? (ERROR_LINE.test(line) ? "is-error" : "");
        return h("div", { class: `term-line ${cls}` }, line || "\u200b");
      }),
    );
    body.scrollTop = body.scrollHeight;
  }

  const echo = (command) => output.append(h("div", { class: "term-line" }, h("span", { class: "term-prompt" }, prompt), command));

  function clear() {
    output.replaceChildren();
  }

  function applyEffect(effect) {
    switch (effect.type) {
      case "open":
        return app.open(effect.path);
      case "theme":
        return app.setTheme(effect.name);
      case "clear":
        return clear();
      case "closePanel":
        return app.togglePanel(false);
      case "requestResume":
        return app.requestResume();
      case "ask":
        app.toggleChat(true);
        return app.chat.ask(effect.question);
    }
  }

  function execute(command) {
    echo(command);
    const { output: lines, effects } = shell.run(command);
    print(lines);
    effects.forEach(applyEffect);
    body.scrollTop = body.scrollHeight;
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = input.value;
      input.value = "";
      cursor = null;
      execute(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!shell.history.length) return;
      cursor = cursor === null ? shell.history.length - 1 : Math.max(0, cursor - 1);
      input.value = shell.history[cursor];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor === null) return;
      cursor += 1;
      input.value = cursor < shell.history.length ? shell.history[cursor] : "";
      if (cursor >= shell.history.length) cursor = null;
    } else if (e.key === "Tab") {
      e.preventDefault();
      const options = shell.complete(input.value);
      if (options.length === 1) input.value = `${options[0]} `;
      else if (options.length > 1) {
        echo(input.value);
        print([options.map((o) => o.split(" ").pop()).join("   ")], "is-muted");
        input.value = commonPrefix(options);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      clear();
    } else if (e.key === "Escape") {
      input.blur();
    }
  });

  function greet() {
    if (greeted) return;
    greeted = true;
    // toUTCString() already reads like macOS: "Mon, 12 Oct 2026 22:12:30 GMT".
    print([`Last login: ${new Date().toUTCString()} on ttys001`]);
    print(['Type "help" to see commands, or try "projects", "skills", "contact".', ""], "is-muted");
  }

  const render = (state, prev) => {
    root.hidden = !state.panelOpen;
    if (!state.panelOpen) setMaximized(false);
    if (state.panelOpen && (!prev || !prev.panelOpen)) {
      greet();
      showTab("terminal");
    }
  };
  app.store.subscribe(render);
  render(app.store.get());

  return { print, clear, focus: () => showTab("terminal") };
}
