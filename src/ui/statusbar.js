import { h, icon } from "../lib/dom.js";

export function createStatusbar(app, root) {
  const { profile } = app.content;
  const item = (props, ...children) => h(props.onclick ? "button" : "span", { type: props.onclick ? "button" : null, ...props, class: `status-item ${props.class ?? ""}` }, ...children);

  const language = item({ class: "status-optional", title: "Language mode" });
  const theme = item({ title: "Color theme", onclick: () => app.palette.open("themes") });

  root.append(
    h(
      "div",
      { class: "sb-group" },
      item({ class: "status-remote", title: "Open terminal", "aria-label": "Open terminal", onclick: () => app.togglePanel(true) }, h("span", { "aria-hidden": "true" }, "><")),
      item({ title: "Source control: experience", onclick: () => app.showView("git", true) }, icon("branch", { size: 14 }), "main"),
      item({ class: "status-optional", title: "No problems" }, icon("error", { size: 14 }), "0", icon("warning", { size: 14 }), "0"),
      profile.openToWork && item({ title: profile.availability, onclick: () => app.open("contact/contact.ts") }, h("span", { class: "status-dot" }), "Open to work"),
    ),
    h(
      "div",
      { class: "sb-group" },
      language,
      item({ class: "status-optional" }, "UTF-8"),
      theme,
      item({ title: "Ask the assistant", onclick: () => app.toggleChat() }, icon("sparkle", { size: 14 }), h("span", { class: "status-optional-text" }, "Ask me")),
      item({ title: "Notifications", "aria-label": "Notifications", onclick: () => app.toast("No new notifications. Thanks for stopping by!") }, icon("bell", { size: 14 })),
    ),
  );

  const render = (state) => {
    language.textContent = state.active ? app.fileMap.get(state.active).language : "";
    language.hidden = !state.active;
    theme.textContent = app.themes.find((t) => t.id === state.theme)?.label ?? state.theme;
  };
  app.store.subscribe(render);
  render(app.store.get());
}
