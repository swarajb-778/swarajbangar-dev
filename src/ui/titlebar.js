import { h, icon } from "../lib/dom.js";
import { kbd, keyLabel } from "../lib/keys.js";

const MENUS = [
  { label: "File", items: ["quickOpen", "-", "requestResume", "-", "closeEditor", "closeAll"] },
  { label: "Edit", items: ["copyEmail", "-", "search"] },
  { label: "View", items: ["commandPalette", "-", "explorer", "search", "git", "run", "extensions", "-", "toggleSidebar", "toggleTerminal", "toggleChat", "-", "theme"] },
  { label: "Go", items: ["quickOpen", "-", "goReadme", "goAgents", "goImpact", "goProjects", "goExperience", "goSkills", "goContact"] },
  { label: "Terminal", items: ["newTerminal", "clearTerminal"] },
  { label: "Help", items: ["shortcuts", "askAssistant", "-", "about"] },
];

export function createTitlebar(app, root) {
  const byId = new Map(app.commands.map((c) => [c.id, c]));
  let openMenu = null;

  function closeMenus() {
    openMenu = null;
    root.querySelectorAll(".menu").forEach((m) => {
      m.classList.remove("is-open");
      m.querySelector(".menu-button").setAttribute("aria-expanded", "false");
      m.querySelector(".menu-list").hidden = true;
    });
  }

  function showMenu(menuEl) {
    closeMenus();
    openMenu = menuEl;
    menuEl.classList.add("is-open");
    menuEl.querySelector(".menu-button").setAttribute("aria-expanded", "true");
    menuEl.querySelector(".menu-list").hidden = false;
  }

  const menubar = h(
    "nav",
    { class: "menubar", "aria-label": "Application menu" },
    MENUS.map((menu) => {
      const list = h(
        "ul",
        { class: "menu-list", role: "menu", hidden: true },
        menu.items.map((id) => {
          if (id === "-") return h("li", { class: "menu-sep", role: "separator" });
          const command = byId.get(id);
          return h(
            "li",
            { role: "none" },
            h(
              "button",
              {
                class: "menu-item",
                type: "button",
                role: "menuitem",
                onclick: () => {
                  closeMenus();
                  command.run();
                },
              },
              h("span", {}, command.title),
              command.keys && h("span", { class: "menu-keys" }, keyLabel(command.keys)),
            ),
          );
        }),
      );
      const el = h(
        "div",
        { class: "menu", onmouseenter: () => openMenu && openMenu !== el && showMenu(el) },
        h(
          "button",
          { class: "menu-button", type: "button", "aria-haspopup": "true", "aria-expanded": "false", onclick: () => (openMenu === el ? closeMenus() : showMenu(el)) },
          menu.label,
        ),
        list,
      );
      return el;
    }),
  );

  document.addEventListener("pointerdown", (e) => {
    if (openMenu && !menubar.contains(e.target)) closeMenus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openMenu) {
      const button = openMenu.querySelector(".menu-button");
      closeMenus();
      button.focus();
    }
  });

  const toggle = (iconName, label, key, run, extraClass = "") =>
    h("button", { class: `icon-button ${extraClass}`, type: "button", "aria-label": label, title: label, "aria-pressed": "false", dataset: { key }, onclick: run }, icon(iconName, { size: 16 }));

  const toggles = [
    toggle("sidebarLeft", "Toggle primary sidebar", "sidebarOpen", () => app.toggleSidebar()),
    toggle("panelBottom", "Toggle terminal", "panelOpen", () => app.togglePanel()),
    toggle("sidebarRight", "Toggle assistant", "chatOpen", () => app.toggleChat()),
  ];

  root.append(
    h("div", { class: "window-dots", "aria-hidden": "true" }, h("span"), h("span"), h("span")),
    h("button", { class: "icon-button mobile-only", type: "button", "aria-label": "Toggle file explorer", onclick: () => app.toggleSidebar() }, icon("menu", { size: 18 })),
    h(
      "button",
      { class: "app-logo", type: "button", title: app.content.profile.name, "aria-label": "Open README", onclick: () => app.open("about/README.md") },
      h("img", { src: "assets/logo-128.png", alt: "", width: 18, height: 18 }),
    ),
    menubar,
    h(
      "button",
      { class: "title-search", type: "button", onclick: () => app.palette.open("files"), "aria-label": "Search files" },
      icon("search", { size: 14 }),
      h("span", { class: "title-search-label" }, app.content.profile.handle),
      kbd("mod+p"),
    ),
    h("div", { class: "title-actions" }, toggles),
  );

  const render = (state) => toggles.forEach((button) => button.setAttribute("aria-pressed", String(Boolean(state[button.dataset.key]))));
  app.store.subscribe(render);
  render(app.store.get());
}
