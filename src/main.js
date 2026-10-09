// Boots the editor: builds the virtual files, restores saved UI state, and
// connects the sidebar, terminal, assistant, and keyboard shortcuts.
import content from "./content.js";
import { buildFiles, buildTree } from "./files.js";
import { createStore } from "./lib/store.js";
import { hashForPath, pathFromHash } from "./lib/router.js";
import { mailtoUrl } from "./lib/mail.js";
import { THEMES, applyTheme, defaultTheme } from "./themes.js";
import { createCommands } from "./commands.js";
import { createToaster } from "./ui/toast.js";
import { createPalette } from "./ui/palette.js";
import { createTitlebar } from "./ui/titlebar.js";
import { createActivityBar } from "./ui/activitybar.js";
import { createEditor } from "./ui/editor.js";
import { createSidebar } from "./ui/sidebar.js";
import { createTerminal } from "./ui/terminal.js";
import { createChat } from "./ui/chat.js";
import { createStatusbar } from "./ui/statusbar.js";

const STORAGE_KEY = "swaraj-portfolio:v1";
const SIDEBAR_VIEWS = ["explorer", "search", "git", "run", "extensions"];
const $ = (selector) => document.querySelector(selector);

const files = buildFiles(content);
const fileMap = new Map(files.map((f) => [f.path, f]));
const paths = files.map((f) => f.path);
const mobile = window.matchMedia("(max-width: 900px)");
const isMobile = () => mobile.matches;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const store = createStore(
  {
    theme: defaultTheme(),
    openTabs: ["about/README.md"],
    active: "about/README.md",
    sidebarView: "explorer",
    sidebarOpen: !isMobile(),
    panelOpen: false,
    chatOpen: false,
    expanded: {},
  },
  { storage: safeStorage(), key: STORAGE_KEY, persist: ["theme", "openTabs", "active", "sidebarView", "expanded"] },
);

// Persisted state comes from an older visit (or a hand-edited localStorage), so validate it.
{
  const s = store.get();
  const openTabs = Array.isArray(s.openTabs) ? s.openTabs.filter((p) => fileMap.has(p)) : [];
  const active = pathFromHash(location.hash, paths) ?? (fileMap.has(s.active) ? s.active : (openTabs[0] ?? null));
  store.set({
    theme: THEMES.some((t) => t.id === s.theme) ? s.theme : defaultTheme(),
    openTabs: active && !openTabs.includes(active) ? [...openTabs, active] : openTabs,
    active,
    sidebarView: SIDEBAR_VIEWS.includes(s.sidebarView) ? s.sidebarView : "explorer",
    expanded: s.expanded && typeof s.expanded === "object" ? s.expanded : {},
  });
}

const app = {
  content,
  files,
  fileMap,
  tree: buildTree(files),
  store,
  themes: THEMES,
  toast: createToaster(),

  open(path) {
    if (!fileMap.has(path)) return;
    store.set((s) => ({
      openTabs: s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path],
      active: path,
      ...(isMobile() ? { sidebarOpen: false, chatOpen: false } : {}),
    }));
  },

  close(path) {
    store.set((s) => {
      const index = s.openTabs.indexOf(path);
      if (index === -1) return {};
      const openTabs = s.openTabs.filter((p) => p !== path);
      const active = s.active === path ? (openTabs[Math.min(index, openTabs.length - 1)] ?? null) : s.active;
      return { openTabs, active };
    });
  },

  closeAll: () => store.set({ openTabs: [], active: null }),

  showView(view, forceOpen = false) {
    const s = store.get();
    if (!forceOpen && s.sidebarOpen && s.sidebarView === view) return store.set({ sidebarOpen: false });
    store.set({ sidebarView: view, sidebarOpen: true, ...(isMobile() ? { chatOpen: false } : {}) });
  },

  toggleSidebar: (force) => store.set((s) => ({ sidebarOpen: force ?? !s.sidebarOpen, ...(isMobile() ? { chatOpen: false } : {}) })),
  togglePanel: (force) => store.set((s) => ({ panelOpen: force ?? !s.panelOpen })),
  toggleChat: (force) => store.set((s) => ({ chatOpen: force ?? !s.chatOpen, ...(isMobile() ? { sidebarOpen: false } : {}) })),

  setTheme(id) {
    if (THEMES.some((t) => t.id === id)) store.set({ theme: id });
  },

  async copy(text, message = "Copied.") {
    try {
      await navigator.clipboard.writeText(text);
      app.toast(message);
    } catch {
      app.toast(text);
    }
  },

  // The résumé is never served as a file: visitors are asked to get in touch first.
  requestResume() {
    const { name, email } = content.profile;
    const first = name.split(" ")[0];
    const linkedin = content.socials.find((s) => /linkedin/i.test(s.label));
    const body = `Hi ${first},\n\nI came across your portfolio and would love to see your latest résumé.\n\nA bit about me / the role:\n\n`;
    app.palette.pick({
      placeholder: "Résumé · shared on request",
      message: `${first} shares the résumé personally so it's always current. Reach out and you'll get the latest version.`,
      items: [
        { label: `Email ${email}`, detail: "opens your mail app", glyph: "mail", run: () => (window.location.href = mailtoUrl(email, "Résumé request", body)) },
        { label: "Copy email address", detail: email, glyph: "copy", run: () => app.copy(email, "Email address copied.") },
        linkedin && { label: "Message on LinkedIn", detail: linkedin.handle, glyph: "linkedin", run: () => window.open(linkedin.url, "_blank", "noopener") },
        { label: "Open the contact form", detail: "contact.ts", glyph: "chat", run: () => app.open("contact/contact.ts") },
      ].filter(Boolean),
    });
  },
};

app.commands = createCommands(app);
app.palette = createPalette(app);

applyTheme(store.get().theme);
store.subscribe((s, prev) => s.theme !== prev.theme && applyTheme(s.theme));

createTitlebar(app, $("#titlebar"));
createActivityBar(app, $("#activitybar"));
// The editor subscribes before the sidebar so the outline reads the freshly rendered file.
app.editor = createEditor(app, { tabs: $("#tabs"), breadcrumbs: $("#breadcrumbs"), scroller: $("#editor"), gutter: $("#gutter"), content: $("#editor-content") });
createSidebar(app, $("#sidebar"));
app.terminal = createTerminal(app, $("#panel"));
app.chat = createChat(app, $("#chat"));
createStatusbar(app, $("#statusbar"));

const scrim = $("#scrim");
const syncScrim = (s) => (scrim.hidden = !(isMobile() && (s.sidebarOpen || s.chatOpen)));
scrim.addEventListener("click", () => store.set({ sidebarOpen: false, chatOpen: false }));
store.subscribe(syncScrim);
mobile.addEventListener("change", () => syncScrim(store.get()));
syncScrim(store.get());

// Each opened file gets a shareable URL, and back/forward walk between files.
const syncFromLocation = () => {
  const path = pathFromHash(location.hash, paths);
  if (path && path !== store.get().active) app.open(path);
};
window.addEventListener("hashchange", syncFromLocation);
window.addEventListener("popstate", syncFromLocation);
store.subscribe((s, prev) => {
  if (s.active === prev.active) return;
  if (s.active && location.hash !== hashForPath(s.active)) history.pushState(null, "", hashForPath(s.active));
  if (!s.active && location.hash) history.pushState(null, "", location.pathname + location.search);
});
if (store.get().active) history.replaceState(null, "", hashForPath(store.get().active));

document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  let action = null;
  if ((mod && e.shiftKey && key === "p") || e.key === "F1" || (mod && !e.shiftKey && key === "k")) action = () => app.palette.open("commands");
  else if (mod && !e.shiftKey && key === "p") action = () => app.palette.open("files");
  else if (mod && !e.shiftKey && !e.altKey && key === "b") action = () => app.toggleSidebar();
  else if (e.ctrlKey && e.code === "Backquote") action = () => app.togglePanel();
  else if (mod && e.shiftKey && key === "f") action = () => app.showView("search", true);
  else if (mod && e.shiftKey && key === "e") action = () => app.showView("explorer", true);
  else if (e.key === "Escape" && isMobile() && (store.get().sidebarOpen || store.get().chatOpen)) action = () => store.set({ sidebarOpen: false, chatOpen: false });
  if (!action) return;
  e.preventDefault();
  action();
});
