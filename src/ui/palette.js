import { h, icon, fileIcon, highlighted } from "../lib/dom.js";
import { keyLabel } from "../lib/keys.js";
import { fuzzyFilter } from "../lib/fuzzy.js";
import { applyTheme } from "../themes.js";

const PLACEHOLDERS = {
  files: "Search files by name (type > for commands)",
  commands: "Type a command",
  themes: "Select a color theme (↑/↓ to preview)",
};

export function createPalette(app) {
  let session = null;
  let results = [];

  const input = h("input", { class: "palette-input", "aria-label": "Command palette input", "aria-controls": "palette-list", autocomplete: "off", spellcheck: "false" });
  const list = h("ul", { class: "palette-list", id: "palette-list", role: "listbox" });
  const message = h("p", { class: "palette-message", hidden: true });
  const overlay = h(
    "div",
    { class: "overlay", hidden: true, onmousedown: (e) => e.target === overlay && close() },
    h("div", { class: "palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, input, message, list),
  );
  document.body.append(overlay);

  const mode = () => (session.mode === "themes" || session.mode === "pick" ? session.mode : input.value.startsWith(">") ? "commands" : "files");

  function sourceItems(current) {
    if (current === "pick") return session.pick.items;
    if (current === "files") {
      return app.files.map((f) => ({ label: f.name, detail: f.folder ?? "", match: `${f.name} ${f.path}`, icon: f.icon, run: () => app.open(f.path) }));
    }
    if (current === "commands") {
      return app.commands.map((c) => ({ label: `${c.category}: ${c.title}`, detail: c.keys ? keyLabel(c.keys) : "", run: c.run }));
    }
    return app.themes.map((t) => ({
      label: t.note ? `${t.label} (${t.note})` : t.label,
      detail: t.id === session.originalTheme ? "current" : t.kind,
      run: () => app.setTheme(t.id),
      preview: () => applyTheme(t.id),
    }));
  }

  function refresh() {
    const current = mode();
    const query = current === "commands" ? input.value.slice(1) : input.value;
    results = fuzzyFilter(sourceItems(current), query, (item) => item.match ?? item.label).slice(0, 60);
    session.selected = Math.min(session.selected, Math.max(results.length - 1, 0));
    input.placeholder = current === "pick" ? session.pick.placeholder : PLACEHOLDERS[current];
    renderList();
  }

  function renderList() {
    if (!results.length) {
      list.replaceChildren(h("li", { class: "palette-empty" }, "No matching results"));
      input.removeAttribute("aria-activedescendant");
      return;
    }
    list.replaceChildren(
      ...results.map(({ item, indices }, i) =>
        h(
          "li",
          {
            class: "palette-item",
            id: `palette-option-${i}`,
            role: "option",
            "aria-selected": String(i === session.selected),
            onmousemove: () => i !== session.selected && select(i),
            onclick: () => choose(i),
          },
          item.icon && fileIcon(item.icon, item.label),
          item.glyph && icon(item.glyph, { size: 16 }),
          h("span", { class: "palette-label" }, highlighted(item.label, indices.filter((x) => x < item.label.length))),
          item.detail && h("span", { class: "palette-detail" }, item.detail),
        ),
      ),
    );
    input.setAttribute("aria-activedescendant", `palette-option-${session.selected}`);
    list.children[session.selected]?.scrollIntoView({ block: "nearest" });
    results[session.selected]?.item.preview?.();
  }

  function select(i) {
    session.selected = (i + results.length) % results.length;
    renderList();
  }

  function choose(i) {
    const chosen = results[i]?.item;
    if (!chosen) return;
    close({ restoreTheme: false, restoreFocus: false });
    chosen.run();
  }

  function open(initialMode = "files", pick = null) {
    if (session) close();
    session = { mode: initialMode, pick, selected: 0, originalTheme: app.store.get().theme, returnFocus: document.activeElement };
    input.value = initialMode === "commands" ? ">" : "";
    message.textContent = pick?.message ?? "";
    message.hidden = !pick?.message;
    overlay.hidden = false;
    refresh();
    if (initialMode === "themes") {
      session.selected = Math.max(0, results.findIndex((r) => r.item.detail === "current"));
      renderList();
    }
    input.focus();
  }

  function close({ restoreTheme = true, restoreFocus = true } = {}) {
    if (!session) return;
    if (restoreTheme) applyTheme(app.store.get().theme);
    overlay.hidden = true;
    if (restoreFocus) session.returnFocus?.focus?.();
    session = null;
  }

  input.addEventListener("input", () => {
    session.selected = 0;
    refresh();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") select(session.selected + 1);
    else if (e.key === "ArrowUp") select(session.selected - 1);
    else if (e.key === "Enter") choose(session.selected);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") {
      /* keep focus inside the dialog */
    } else return;
    e.preventDefault();
  });

  /** A VS Code-style quick pick: { placeholder, message, items: [{ label, detail, glyph, run }] }. */
  const pick = (options) => open("pick", options);

  return { open, pick, close, isOpen: () => Boolean(session) };
}
