import { h, icon } from "../lib/dom.js";

const LINE_HEIGHT = 20;

export function createStatusbar(app, root) {
  const { profile, projects, impact = [] } = app.content;
  const item = (props, ...children) => h(props.onclick ? "button" : "span", { type: props.onclick ? "button" : null, ...props, class: `status-item ${props.class ?? ""}` }, ...children);

  const language = item({ class: "status-optional", title: "Language mode" });
  const font = item({ class: "status-optional", title: "Font family", onclick: () => app.palette.open("fonts") });
  const theme = item({ title: "Color theme", onclick: () => app.palette.open("themes") });
  const cursor = item({ class: "status-optional", title: "Go to line" }, "Ln 1, Col 1");
  const askItem = item({ class: "status-ask", title: "Toggle Ask Me assistant", "aria-pressed": "false", onclick: () => app.toggleChat() }, icon("sparkle", { size: 14 }), h("span", { class: "status-optional-text" }, "Ask me"));

  root.append(
    h(
      "div",
      { class: "sb-group" },
      item({ class: "status-remote", title: "Open terminal", "aria-label": "Open terminal", onclick: () => app.togglePanel(true) }, h("span", { "aria-hidden": "true" }, "><")),
      item({ title: "Source control: experience", onclick: () => app.showView("git", true) }, icon("branch", { size: 14 }), "main"),
      item({ class: "status-optional", title: "Synchronize changes" }, icon("sync", { size: 14 }), "0↓ 0↑"),
      item({ title: "Open projects.tsx", onclick: () => app.open("projects/projects.tsx") }, icon("run", { size: 14 }), `${projects.length} projects`),
      impact.length > 0 && item({ class: "status-optional", title: "Open impact.json", onclick: () => app.open("metrics/impact.json") }, `${impact.length} measured results`),
    ),
    h(
      "div",
      { class: "sb-group" },
      cursor,
      item({ class: "status-optional" }, "Spaces: 2"),
      item({ class: "status-optional" }, "UTF-8"),
      item({ class: "status-optional" }, "LF"),
      language,
      font,
      theme,
      item({ class: "status-optional", title: "Copy email address", onclick: () => app.copy(profile.email, "Email address copied.") }, profile.email),
      askItem,
      item({ title: "Notifications", "aria-label": "Notifications", onclick: () => app.toast("No new notifications. Thanks for stopping by!") }, icon("bell", { size: 14 })),
    ),
  );

  // Like VS Code, Ln follows the top visible line of the editor.
  const scroller = document.getElementById("editor");
  scroller?.addEventListener("scroll", () => (cursor.textContent = `Ln ${Math.floor(scroller.scrollTop / LINE_HEIGHT) + 1}, Col 1`), { passive: true });

  const render = (state) => {
    language.textContent = state.active ? app.fileMap.get(state.active).language : "";
    language.hidden = !state.active;
    font.textContent = app.fonts?.find((f) => f.id === state.font)?.label ?? state.font;
    theme.textContent = app.themes.find((t) => t.id === state.theme)?.label ?? state.theme;
    askItem.setAttribute("aria-pressed", String(Boolean(state.chatOpen)));
  };
  app.store.subscribe(render);
  render(app.store.get());
}
