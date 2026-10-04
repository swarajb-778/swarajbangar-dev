import { keyLabel } from "./lib/keys.js";

export const SHORTCUTS = [
  ["mod+shift+p", "Show all commands"],
  ["mod+p", "Go to file"],
  ["mod+b", "Toggle sidebar"],
  ["ctrl+`", "Toggle terminal"],
  ["mod+shift+f", "Search in files"],
  ["mod+shift+e", "Show explorer"],
  ["mod+k", "Show all commands (alternative)"],
];

export function createCommands(app) {
  const command = (id, category, title, run, keys = null) => ({ id, category, title, run, keys });
  const goto = (id, path) => command(id, "Go", `Open ${path.split("/").pop()}`, () => app.open(path));

  return [
    command("quickOpen", "Go", "Go to File…", () => app.palette.open("files"), "mod+p"),
    command("commandPalette", "View", "Command Palette…", () => app.palette.open("commands"), "mod+shift+p"),
    command("theme", "Preferences", "Color Theme…", () => app.palette.open("themes")),
    command("explorer", "View", "Explorer", () => app.showView("explorer", true), "mod+shift+e"),
    command("search", "View", "Search in Files", () => app.showView("search", true), "mod+shift+f"),
    command("git", "View", "Source Control (experience)", () => app.showView("git", true)),
    command("run", "View", "Run and Debug (demos)", () => app.showView("run", true)),
    command("extensions", "View", "Extensions (skills)", () => app.showView("extensions", true)),
    command("toggleSidebar", "View", "Toggle Primary Sidebar", () => app.toggleSidebar(), "mod+b"),
    command("toggleTerminal", "View", "Toggle Terminal", () => app.togglePanel(), "ctrl+`"),
    command("toggleChat", "View", "Toggle Assistant", () => app.toggleChat()),
    goto("goReadme", "about/README.md"),
    goto("goAgents", "ai/agents.py"),
    goto("goImpact", "metrics/impact.json"),
    goto("goProjects", "projects/projects.tsx"),
    goto("goExperience", "experience/experience.yml"),
    goto("goSkills", "skills/skills.json"),
    goto("goContact", "contact/contact.ts"),
    command("newTerminal", "Terminal", "New Terminal", () => app.togglePanel(true)),
    command("clearTerminal", "Terminal", "Clear Terminal", () => app.terminal.clear()),
    command("copyEmail", "Edit", "Copy Email Address", () => app.copy(app.content.profile.email, "Email address copied.")),
    command("requestResume", "File", "Request Résumé…", () => app.requestResume()),
    command("closeEditor", "File", "Close Editor", () => app.store.get().active && app.close(app.store.get().active)),
    command("closeAll", "File", "Close All Editors", () => app.closeAll()),
    command("askAssistant", "Help", "Ask the Assistant", () => app.toggleChat(true)),
    command("shortcuts", "Help", "Keyboard Shortcuts", () => {
      app.togglePanel(true);
      app.terminal.print(["Keyboard shortcuts:", ...SHORTCUTS.map(([keys, label]) => `  ${keyLabel(keys).padEnd(14)} ${label}`), ""], "is-muted");
    }),
    command("about", "Help", "About This Portfolio", () =>
      app.toast("Hand-built with plain HTML, CSS, and JavaScript. No frameworks, no build step."),
    ),
    ...app.content.socials.map((s) => command(`social:${s.label}`, "Open", s.label, () => window.open(s.url, "_blank", "noopener"))),
  ];
}
