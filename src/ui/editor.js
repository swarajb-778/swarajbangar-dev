import { h, icon, fileIcon } from "../lib/dom.js";
import { kbd } from "../lib/keys.js";
import { renderView } from "../views/index.js";

const LINE_HEIGHT = 20;

export function createEditor(app, { tabs, breadcrumbs, scroller, gutter, content }) {
  const scrollPositions = new Map();
  let renderedPath;
  let lineCount = 0;

  const ctx = {
    content: app.content,
    files: app.files,
    open: (path) => app.open(path),
    hasFile: (path) => app.fileMap.has(path),
    copy: (text, message) => app.copy(text, message),
    requestResume: () => app.requestResume(),
  };

  function renderTabs({ openTabs, active }) {
    tabs.replaceChildren(
      ...openTabs.map((path) => {
        const file = app.fileMap.get(path);
        const isActive = path === active;
        const tab = h(
          "div",
          {
            class: isActive ? "tab is-active" : "tab",
            role: "tab",
            tabindex: isActive ? 0 : -1,
            "aria-selected": String(isActive),
            title: path,
            onclick: () => app.open(path),
            onauxclick: (e) => e.button === 1 && app.close(path),
            onkeydown: (e) => {
              if (e.key === "Enter" || e.key === " ") app.open(path);
              if (e.key === "Delete" || e.key === "Backspace") app.close(path);
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const i = openTabs.indexOf(path) + (e.key === "ArrowRight" ? 1 : -1);
                const next = openTabs[(i + openTabs.length) % openTabs.length];
                app.open(next);
                requestAnimationFrame(() => tabs.querySelector(".tab.is-active")?.focus());
              }
            },
          },
          fileIcon(file.icon, file.name),
          h("span", { class: "tab-label" }, file.name),
          h(
            "button",
            {
              class: "tab-close",
              type: "button",
              "aria-label": `Close ${file.name}`,
              tabindex: -1,
              onclick: (e) => {
                e.stopPropagation();
                app.close(path);
              },
            },
            icon("close", { size: 14 }),
          ),
        );
        return tab;
      }),
    );
    tabs.querySelector(".tab.is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderBreadcrumbs({ active }) {
    if (!active) return breadcrumbs.replaceChildren();
    const parts = [app.content.profile.handle, ...active.split("/")];
    breadcrumbs.replaceChildren(
      ...parts.flatMap((part, i) => [
        ...(i > 0 ? [icon("chevronRight", { size: 12 })] : []),
        h("span", { class: i === parts.length - 1 ? "crumb is-current" : "crumb" }, part),
      ]),
    );
  }

  function welcome() {
    const { profile } = app.content;
    const row = (label, combo) => h("div", { class: "welcome-row" }, h("dt", {}, label), h("dd", {}, kbd(combo)));
    return h(
      "div",
      { class: "welcome" },
      h("img", { class: "welcome-logo", src: "assets/logo-transparent.png", alt: "", width: 96, height: 96 }),
      h("h2", { class: "welcome-title" }, profile.name),
      h("p", { class: "hint" }, profile.role),
      h(
        "dl",
        { class: "welcome-keys" },
        row("Show all commands", "mod+shift+p"),
        row("Go to file", "mod+p"),
        row("Toggle terminal", "ctrl+`"),
        row("Toggle sidebar", "mod+b"),
      ),
      h("button", { class: "btn primary", type: "button", onclick: () => app.open("about/README.md") }, "Open README.md"),
    );
  }

  function updateGutter() {
    const count = Math.max(Math.ceil(content.offsetHeight / LINE_HEIGHT), Math.floor(scroller.clientHeight / LINE_HEIGHT));
    if (count === lineCount) return;
    lineCount = count;
    gutter.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
  }

  function renderContent({ active }) {
    if (active === renderedPath) return;
    if (renderedPath) scrollPositions.set(renderedPath, scroller.scrollTop);
    renderedPath = active;
    const file = active ? app.fileMap.get(active) : null;
    scroller.classList.toggle("is-empty", !file);
    content.replaceChildren(file ? renderView(file, ctx) : welcome());
    scroller.scrollTop = scrollPositions.get(active) ?? 0;
    updateGutter();
    document.title = file ? `${file.name} — ${app.content.profile.handle}` : `${app.content.profile.name} — Portfolio`;
  }

  const observer = new ResizeObserver(updateGutter);
  observer.observe(content);
  observer.observe(scroller);

  function render(state, prev) {
    if (!prev || state.openTabs !== prev.openTabs || state.active !== prev.active) {
      renderTabs(state);
      renderBreadcrumbs(state);
    }
    renderContent(state);
  }

  app.store.subscribe(render);
  render(app.store.get());

  return {
    outline: () =>
      [...content.querySelectorAll("[data-outline]")].map((el) => ({ label: el.dataset.outline, level: el.tagName === "H1" ? 1 : 2, el })),
  };
}
