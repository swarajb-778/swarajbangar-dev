import { h, icon } from "../lib/dom.js";

const VIEWS = [
  { id: "explorer", icon: "files", label: "Explorer" },
  { id: "search", icon: "search", label: "Search" },
  { id: "git", icon: "branch", label: "Source Control · Experience" },
  { id: "run", icon: "debug", label: "Run and Debug · Demos" },
  { id: "extensions", icon: "extensions", label: "Extensions · Skills" },
];

export function createActivityBar(app, root) {
  const buttons = VIEWS.map((view) =>
    h(
      "button",
      { class: "activity-button", type: "button", "aria-label": view.label, title: view.label, dataset: { view: view.id }, onclick: () => app.showView(view.id) },
      icon(view.icon, { size: 22 }),
    ),
  );

  root.append(
    h("div", { class: "activity-group" }, buttons),
    h(
      "div",
      { class: "activity-group" },
      h("button", { class: "activity-button", type: "button", "aria-label": "Contact", title: "Contact", onclick: () => app.open("contact/contact.ts") }, icon("account", { size: 22 })),
      h("button", { class: "activity-button", type: "button", "aria-label": "Color theme", title: "Color theme", onclick: () => app.palette.open("themes") }, icon("gear", { size: 22 })),
    ),
  );

  const render = ({ sidebarOpen, sidebarView }) => {
    for (const button of buttons) {
      const active = sidebarOpen && button.dataset.view === sidebarView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  };
  app.store.subscribe(render);
  render(app.store.get());
}
