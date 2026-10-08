import { h, icon } from "../lib/dom.js";
import { createShell } from "../lib/shell.js";

const ERROR_LINE = /^(command not found|usage:|\w+: .*(No such|unknown))/;

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

  root.append(
    h(
      "div",
      { class: "panel-header" },
      h("span", { class: "panel-tab" }, "Terminal"),
      h(
        "div",
        { class: "panel-actions" },
        h("button", { class: "icon-button", type: "button", "aria-label": "Clear terminal", title: "Clear", onclick: () => clear() }, icon("trash", { size: 16 })),
        h("button", { class: "icon-button", type: "button", "aria-label": "Close panel", title: "Close", onclick: () => app.togglePanel(false) }, icon("close", { size: 16 })),
      ),
    ),
    body,
  );

  function print(lines, kind) {
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
    print([`Welcome to ${app.content.profile.name}'s portfolio shell.`, 'Type "help" to see commands, or try "projects", "skills", "contact".', ""], "is-muted");
  }

  const render = (state, prev) => {
    root.hidden = !state.panelOpen;
    if (state.panelOpen && (!prev || !prev.panelOpen)) {
      greet();
      requestAnimationFrame(() => input.focus());
    }
  };
  app.store.subscribe(render);
  render(app.store.get());

  return { print, clear, focus: () => input.focus() };
}
