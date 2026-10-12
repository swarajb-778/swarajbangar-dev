// Explorer, search, source control, pinned launches, and the skills list.
import { h, icon, fileIcon, folderIcon, initials } from "../lib/dom.js";
import { keyLabel } from "../lib/keys.js";
import { searchDocuments } from "../lib/search.js";
import { formatPeriod, shortHash } from "../lib/format.js";
import { mailtoUrl } from "../lib/mail.js";

const hueFor = (text) => [...text].reduce((n, ch) => (n * 31 + ch.codePointAt(0)) % 360, 7);

export function createSidebar(app, root) {
  const { content } = app;
  const { profile } = content;
  let searchQuery = "";
  let skillQuery = "";

  const header = (title, actions = []) => h("div", { class: "sb-header" }, h("h2", { class: "sb-title" }, title), h("div", { class: "sb-actions" }, actions));
  const action = (iconName, label, onclick) => h("button", { class: "icon-button", type: "button", "aria-label": label, title: label, onclick }, icon(iconName, { size: 16 }));

  function section(label, key, state, body) {
    const open = state.expanded[key] !== false;
    return h(
      "section",
      { class: "sb-section" },
      h(
        "button",
        {
          class: "sb-section-toggle",
          type: "button",
          "aria-expanded": String(open),
          onclick: () => app.store.set((s) => ({ expanded: { ...s.expanded, [key]: !open } })),
        },
        icon(open ? "chevronDown" : "chevronRight", { size: 14 }),
        label,
      ),
      open && body,
    );
  }

  function fileRow(node, state, depth) {
    const file = app.fileMap.get(node.path);
    const isActive = state.active === node.path;
    return h(
      "li",
      { role: "treeitem", "aria-selected": String(isActive) },
      h(
        "button",
        { class: isActive ? "tree-row is-active" : "tree-row", type: "button", style: { "--depth": depth }, onclick: () => app.open(node.path) },
        h("span", { class: "chev-space" }),
        fileIcon(file.icon, file.name),
        h("span", { class: "tree-label" }, node.name),
      ),
    );
  }

  function folderRow(node, state) {
    const open = state.expanded[node.path] !== false;
    return h(
      "li",
      { role: "treeitem", "aria-expanded": String(open) },
      h(
        "button",
        {
          class: "tree-row",
          type: "button",
          style: { "--depth": 0 },
          onclick: () => app.store.set((s) => ({ expanded: { ...s.expanded, [node.path]: !open } })),
        },
        icon(open ? "chevronDown" : "chevronRight", { size: 14 }),
        folderIcon(node.name, open),
        h("span", { class: "tree-label" }, node.name),
      ),
      open && h("ul", { role: "group" }, node.children.map((child) => fileRow(child, state, 1))),
    );
  }

  function outline() {
    const items = app.editor?.outline() ?? [];
    if (!items.length) return h("p", { class: "sb-note" }, "No symbols in this file.");
    return h(
      "ul",
      { class: "outline" },
      items.map((item) =>
        h(
          "li",
          {},
          h(
            "button",
            { class: "tree-row", type: "button", style: { "--depth": item.level - 1 }, onclick: () => item.el.scrollIntoView({ behavior: "smooth", block: "start" }) },
            h("span", { class: "symbol", "aria-hidden": "true" }, "#"),
            h("span", { class: "tree-label" }, item.label),
          ),
        ),
      ),
    );
  }

  function profileCard() {
    const avatar = profile.avatarUrl
      ? h("img", { class: "avatar", src: profile.avatarUrl, alt: "" })
      : h("span", { class: "avatar", "aria-hidden": "true" }, initials(profile.name));
    return h(
      "button",
      { class: "profile-card", type: "button", onclick: () => app.open("about/README.md") },
      avatar,
      h(
        "span",
        { class: "profile-text" },
        h("span", { class: "profile-name" }, profile.name),
        h("span", { class: "profile-role" }, profile.role),
      ),
    );
  }

  const views = {
    explorer(state) {
      const collapseAll = () => app.store.set((s) => ({ expanded: Object.fromEntries(app.tree.filter((n) => n.type === "folder").map((n) => [n.path, false]).concat([["__root", s.expanded.__root !== false]])) }));
      return h(
        "div",
        { class: "sb-view" },
        header("Explorer", [action("collapse", "Collapse folders", collapseAll)]),
        h(
          "div",
          { class: "sb-scroll" },
          section(
            profile.handle.toUpperCase(),
            "__root",
            state,
            h("ul", { class: "tree", role: "tree", "aria-label": "Files" }, app.tree.map((node) => (node.type === "folder" ? folderRow(node, state) : fileRow(node, state, 0)))),
          ),
          section("Outline", "__outline", state, outline()),
        ),
        profileCard(),
      );
    },

    search() {
      const summary = h("p", { class: "sb-note", role: "status" });
      const list = h("div", { class: "search-results" });
      const input = h("input", {
        class: "input",
        type: "search",
        placeholder: "Search",
        value: searchQuery,
        "aria-label": "Search in files",
        oninput: () => {
          searchQuery = input.value;
          renderResults();
        },
      });

      const snippet = (text, column, length) => {
        const start = Math.max(0, column - 1 - 24);
        const before = (start > 0 ? "…" : "") + text.slice(start, column - 1);
        return [before, h("mark", {}, text.slice(column - 1, column - 1 + length)), text.slice(column - 1 + length)];
      };

      function renderResults() {
        const query = searchQuery.trim();
        const results = searchDocuments(app.files.map((f) => ({ path: f.path, lines: f.text })), query, { perFile: 20 });
        const total = results.reduce((n, r) => n + r.matches.length, 0);
        summary.textContent =
          query.length < 2 ? "Type at least two characters." : total ? `${total} result${total === 1 ? "" : "s"} in ${results.length} file${results.length === 1 ? "" : "s"}` : "No results found.";
        list.replaceChildren(
          ...results.map((r) => {
            const file = app.fileMap.get(r.path);
            return h(
              "div",
              { class: "search-file" },
              h(
                "button",
                { class: "tree-row", type: "button", onclick: () => app.open(r.path) },
                fileIcon(file.icon, file.name),
                h("span", { class: "tree-label" }, file.name),
                file.folder && h("span", { class: "sb-dim" }, file.folder),
                h("span", { class: "count" }, String(r.matches.length)),
              ),
              r.matches.map((m) => h("button", { class: "tree-row search-match", type: "button", onclick: () => app.open(r.path) }, h("span", { class: "tree-label" }, snippet(m.text, m.column, query.length)))),
            );
          }),
        );
      }

      renderResults();
      requestAnimationFrame(() => input.focus());
      return h("div", { class: "sb-view" }, header("Search"), h("div", { class: "sb-pad" }, input, summary), h("div", { class: "sb-scroll" }, list));
    },

    git() {
      const box = h("textarea", {
        class: "input",
        rows: 3,
        placeholder: `Message (${keyLabel("mod+enter")} to email me)`,
        "aria-label": "Your message to me",
        onkeydown: (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
        },
      });
      const send = () => {
        const message = box.value.trim();
        if (!message) return app.toast("Write a message first.");
        window.location.href = mailtoUrl(profile.email, "Hello from your portfolio", message);
      };
      return h(
        "div",
        { class: "sb-view" },
        header("Source Control", [
          app.fileMap.has("github/activity.json") && action("branch", "Open contribution graph", () => app.open("github/activity.json")),
        ]),
        h("div", { class: "sb-pad" }, box, h("button", { class: "btn primary block", type: "button", onclick: send }, icon("check", { size: 14 }), "Commit & email")),
        h("h3", { class: "sb-subtitle" }, "History · experience"),
        h(
          "ul",
          { class: "commits sb-scroll" },
          content.experience.map((e, i) =>
            h(
              "li",
              {},
              h(
                "button",
                { class: "commit", type: "button", onclick: () => app.open("experience/experience.yml") },
                h("span", { class: "commit-dot", "aria-hidden": "true" }),
                h(
                  "span",
                  { class: "commit-body" },
                  h("span", { class: "commit-msg" }, `${e.role} @ ${e.company}`, i === 0 && h("span", { class: "badge" }, "HEAD")),
                  h("span", { class: "commit-meta" }, `${shortHash(`${e.company}${e.start}${e.role}`)} · ${formatPeriod(e.start, e.end)}`),
                ),
              ),
            ),
          ),
        ),
      );
    },

    run() {
      const launches = content.projects.filter((p) => p.pinned).sort((a, b) => a.pinned - b.pinned);
      return h(
        "div",
        { class: "sb-view" },
        header("Run and Debug"),
        h(
          "div",
          { class: "sb-pad" },
          h("button", { class: "btn primary block", type: "button", onclick: () => app.togglePanel(true) }, icon("run", { size: 14 }), "Run portfolio terminal"),
          h("p", { class: "sb-note" }, "Pinned on GitHub. Everything else stays in projects.tsx."),
        ),
        h(
          "ul",
          { class: "launch-list sb-scroll" },
          launches.map((p) =>
            h(
              "li",
              {},
              h(
                "a",
                { class: "launch", href: p.live || p.repo, target: "_blank", rel: "noopener noreferrer" },
                h("span", { class: "launch-name" }, p.name, h("span", { class: "badge" }, "Public")),
                h("span", { class: "launch-desc" }, p.description),
                h("span", { class: "launch-meta" }, p.tags[0], p.live ? " · live demo" : " · source"),
              ),
            ),
          ),
        ),
      );
    },

    extensions() {
      const items = content.skills.flatMap((g) => g.items.map((item) => ({ ...item, group: g.group })));
      const list = h("ul", { class: "ext-list" });
      const input = h("input", {
        class: "input",
        type: "search",
        placeholder: "Search skills",
        value: skillQuery,
        "aria-label": "Search skills",
        oninput: () => {
          skillQuery = input.value;
          renderList();
        },
      });
      function renderList() {
        const q = skillQuery.trim().toLowerCase();
        const matches = items.filter((i) => !q || `${i.name} ${i.note} ${i.group}`.toLowerCase().includes(q));
        list.replaceChildren(
          ...matches.map((item) =>
            h(
              "li",
              {},
              h(
                "button",
                { class: "ext", type: "button", onclick: () => app.open("skills/skills.json") },
                item.logo
                  ? h("span", { class: "ext-icon has-logo", "aria-hidden": "true" }, h("img", { src: item.logo, alt: "", loading: "lazy", width: 24, height: 24 }))
                  : h("span", { class: "ext-icon", style: { background: `hsl(${hueFor(item.group)} 45% 42%)` }, "aria-hidden": "true" }, item.name.slice(0, 2)),
                h(
                  "span",
                  { class: "ext-body" },
                  h("span", { class: "ext-name" }, item.name),
                  h("span", { class: "ext-desc" }, item.note),
                  h("span", { class: "ext-pub" }, item.group),
                ),
              ),
            ),
          ),
        );
        if (!matches.length) list.append(h("li", { class: "sb-note" }, "No matching skills."));
      }
      renderList();
      return h("div", { class: "sb-view" }, header("Extensions · Skills"), h("div", { class: "sb-pad" }, input), h("h3", { class: "sb-subtitle" }, `Installed · ${items.length}`), h("div", { class: "sb-scroll" }, list));
    },
  };

  function render(state) {
    root.hidden = !state.sidebarOpen;
    if (state.sidebarOpen) root.replaceChildren((views[state.sidebarView] ?? views.explorer)(state));
  }

  app.store.subscribe((state, prev) => {
    const layoutChanged = state.sidebarOpen !== prev.sidebarOpen || state.sidebarView !== prev.sidebarView;
    const explorerChanged = state.sidebarView === "explorer" && (state.active !== prev.active || state.expanded !== prev.expanded);
    if (layoutChanged || explorerChanged) render(state);
  });
  render(app.store.get());
}
