// Turns src/content.js into the files shown in the explorer. Each file has
// syntax-colored source plus plain text so search can find the prose too.
import { jsonLines, tsLines, yamlLines, lineText } from "./lib/highlight.js";
import { formatMetric, formatPeriod, impactDelta } from "./lib/format.js";

const socialKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "");

function file(path, spec) {
  const { language, icon, view, lines = [], extraText = [] } = spec;
  const parts = path.split("/");
  return {
    path,
    name: parts.at(-1),
    folder: parts.length > 1 ? parts[0] : null,
    language,
    icon,
    view,
    lines,
    text: [...lines.map(lineText), ...extraText],
    agentId: spec.agentId ?? null,
  };
}

function readmeLines({ profile }) {
  const frontmatter = {
    name: profile.name,
    role: profile.role,
    location: profile.location,
    status: profile.openToWork ? "open to work" : "not looking",
  };
  return [[["punct", "---"]], ...yamlLines(frontmatter), [["punct", "---"]]];
}

function readmeText({ profile, highlights, focus, projects }) {
  return [
    `# ${profile.name}`,
    (profile.roles ?? [profile.role]).join(" · "),
    profile.tagline,
    profile.bio,
    highlights.join(" · "),
    "## What I do",
    ...focus.map((f) => `- ${f.title}: ${f.text}`),
    "## Featured projects",
    ...projects.filter((p) => p.featured).map((p) => `- ${p.name} — ${p.description}`),
    "## Get in touch",
    profile.email,
  ];
}

function agentLines(agent) {
  const kw = (t) => ["keyword", t];
  const fn = (t) => ["fn", t];
  const str = (t) => ["string", JSON.stringify(t)];
  const p = (t) => ["punct", t];
  const plain = (t) => ["plain", t];
  const call = (method, ...args) => [plain("graph."), fn(method), p("("), ...args.flatMap((a, i) => (i ? [p(", "), a] : [a])), p(")")];
  return [
    [kw("from "), plain("langgraph.graph "), kw("import "), plain("StateGraph, END")],
    [kw("from "), plain("nodes "), kw("import "), plain(agent.nodes.map((n) => n.fn).join(", "))],
    [],
    [["comment", `# ${agent.name}: ${agent.summary}`]],
    [plain("graph "), p("= "), fn("StateGraph"), p("("), ["type", "AgentState"], p(")")],
    ...agent.nodes.map((n) => call("add_node", str(n.id), plain(n.fn))),
    [],
    call("set_entry_point", str(agent.nodes[0].id)),
    ...agent.edges.map(([from, to, note]) => [
      ...call("add_edge", str(from), to === "END" ? plain("END") : str(to)),
      ...(note ? [["comment", `  # ${note}`]] : []),
    ]),
    [],
    [plain("agent "), p("= "), plain("graph."), fn("compile"), p("()")],
  ];
}

const impactJson = (impact) =>
  impact.map((m) => ({
    metric: m.label,
    before: formatMetric(m.before, m.unit),
    after: formatMetric(m.after, m.unit),
    change: impactDelta(m),
    where: m.company,
  }));

function profileJson({ profile, socials }) {
  return {
    name: profile.name,
    roles: profile.roles ?? [profile.role],
    location: profile.location,
    email: profile.email,
    availability: profile.availability,
    openToWork: profile.openToWork,
    links: Object.fromEntries(socials.map((s) => [socialKey(s.label), s.url])),
  };
}

function projectLines(projects) {
  const summary = projects.map((p) => ({ name: p.name, year: p.year, tags: p.tags, ...(p.live || p.repo ? { url: p.live || p.repo } : {}) }));
  return [
    [["keyword", "import type "], ["punct", "{ "], ["type", "Project"], ["punct", " }"], ["keyword", " from "], ["string", '"./types"'], ["punct", ";"]],
    [],
    ...tsLines(summary, { name: "projects", type: "Project[]" }),
  ];
}

function experienceYaml(experience, education = []) {
  return {
    experience: experience.map((e) => ({
      role: e.role,
      company: e.company,
      ...(e.location ? { location: e.location } : {}),
      period: formatPeriod(e.start, e.end),
      stack: e.stack,
      highlights: e.highlights,
    })),
    education: education.map((e) => ({ degree: e.degree, school: e.school, period: formatPeriod(e.start, e.end), notes: e.notes })),
  };
}

function skillsJson(skills) {
  return Object.fromEntries(skills.map((g) => [socialKey(g.group), g.items.map((i) => i.name)]));
}

function contactObject({ profile, socials }) {
  return {
    email: profile.email,
    location: profile.location,
    availability: profile.availability,
    ...Object.fromEntries(socials.map((s) => [socialKey(s.label), s.url])),
  };
}

const GITIGNORE = [
  "# ─────────────────────────────────────────────",
  "#  also ignored (life edition)",
  "# ─────────────────────────────────────────────",
  "",
  "# Ignore the noise.",
  "noise/",
  "hot-takes/",
  "twitter-fights/",
  "comparison-with-strangers/",
  "",
  "# Ignore the drama.",
  "drama/",
  "group-chats/*.gossip",
  "subtweets-about-you/",
  "imaginary-arguments-in-the-shower/",
  "",
  "# Focus on work.",
  "!work/",
  "!projects/**/*.committed",
  "!ship/this-week/*",
  "",
  "# If you cannot focus on work:",
  "!gym/",
  "!games/",
  "",
  "# That's it. Touch grass. Then push code.",
  "",
  "",
  "# ─────────────────────────────────────────────",
  "#  .gitignore — what does NOT make the commit",
  "# ─────────────────────────────────────────────",
  "",
  "# dependencies",
  "node_modules/",
  ".pnpm-store/",
  "vendor/",
  "",
  "# build artefacts",
  "dist/",
  "build/",
  ".next/",
  ".turbo/",
  "",
  "# secrets — please.",
  ".env",
  ".env.*",
  "*.pem",
  "",
  "# OS noise",
  ".DS_Store",
  "Thumbs.db",
  "",
  "# editor",
  ".vscode/*",
  "!.vscode/settings.json",
  ".idea/",
  "",
  "# EOF",
  '#       git add . && git commit -m "living"',
];

function gitignoreLines() {
  return GITIGNORE.map((line) => {
    if (!line) return [];
    if (line.startsWith("#")) return [["comment", line]];
    if (line.startsWith("!")) return [["keyword", "!"], ["plain", line.slice(1)]];
    return [["plain", line]];
  });
}

function licenseText(name) {
  return [
    "MIT License",
    "",
    `Copyright (c) ${new Date().getFullYear()} ${name}`,
    "",
    "Permission is hereby granted, free of charge, to any person obtaining a copy",
    'of this software and associated documentation files (the "Software"), to deal',
    "in the Software without restriction, including without limitation the rights",
    "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
    "copies of the Software, and to permit persons to whom the Software is",
    "furnished to do so, subject to the following conditions:",
    "",
    "The above copyright notice and this permission notice shall be included in all",
    "copies or substantial portions of the Software.",
    "",
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
    "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
    "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
    "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
    "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
    "SOFTWARE.",
  ];
}

export function buildFiles(content) {
  const { profile, projects, experience, skills, impact = [], ai, education = [] } = content;
  const agent = ai?.agent;
  return [
    file("about/README.md", { language: "Markdown", icon: "md", view: "readme", lines: readmeLines(content), extraText: readmeText(content) }),
    file("about/profile.json", { language: "JSON", icon: "json", view: "code", lines: jsonLines(profileJson(content)) }),
    agent &&
      file("ai/agents.py", {
        language: "Python",
        icon: "py",
        view: "agents",
        agentId: "agent",
        lines: agentLines(agent),
        extraText: [
          ai.summary,
          ...agent.nodes.map((n) => `${n.label}: ${n.detail}`),
          ...agent.traces.map((t) => t.question),
          ...agent.evals.map((e) => `${e.metric}: ${Math.round(e.score * 100)}%`),
        ],
      }),
    ai?.oncall &&
      file("ai/oncall.py", {
        language: "Python",
        icon: "py",
        view: "agents",
        agentId: "oncall",
        lines: agentLines(ai.oncall),
        extraText: [ai.oncall.intro, ...ai.oncall.nodes.map((node) => `${node.label}: ${node.detail}`)],
      }),
    ai?.oncall &&
      file("ai/retrieve.py", {
        language: "Python",
        icon: "py",
        view: "retrieve",
        lines: [
          [["comment", "# Hybrid retrieval over this portfolio's own files."]],
          [["plain", "fused = reciprocal_rank_fusion(bm25(chunks, query), trigram_cosine(chunks, query))"]],
          [["plain", "abstain if fused[0].score < threshold"]],
        ],
        extraText: ["BM25", "trigram", "reciprocal rank fusion", "abstain"],
      }),
    ai?.oncall &&
      file("ai/mcp.ts", {
        language: "TypeScript",
        icon: "ts",
        view: "mcp",
        lines: tsLines({ jsonrpc: "2.0", method: "tools/list" }, { name: "request" }),
        extraText: ["tools/list", "tools/call", "impact.lookup"],
      }),
    content.labs &&
      file("systems/reconcile.ts", {
        language: "TypeScript",
        icon: "ts",
        view: "reconcile",
        lines: tsLines({ tolerance: 0, dateWindow: 0, requireKey: false }, { name: "rules" }),
        extraText: ["first-pass auto-reconciliation", "idempotency key", "84%", "96%"],
      }),
    content.labs &&
      file("systems/dashboard.json", {
        language: "JSON",
        icon: "json",
        view: "waterfall",
        lines: jsonLines({ dashboardReady: ["4.0s", "1.7s"], exceptionView: ["3.5s", "1.6s"] }),
        extraText: ["GraphQL BFF", "TanStack Query", "Next.js SSR"],
      }),
    impact.length > 0 &&
      file("metrics/impact.json", {
        language: "JSON",
        icon: "json",
        view: "impact",
        lines: jsonLines(impactJson(impact)),
        extraText: impact.filter((m) => m.note).map((m) => `${m.label}: ${m.note}`),
      }),
    content.github &&
      file("github/activity.json", {
        language: "JSON",
        icon: "json",
        view: "activity",
        lines: jsonLines({ user: content.github.user, range: "last 12 months", updates: "on each visit" }),
        extraText: [`GitHub contributions for ${content.github.user}`],
      }),
    file("projects/projects.tsx", {
      language: "TypeScript JSX",
      icon: "tsx",
      view: "projects",
      lines: projectLines(projects),
      extraText: projects.map((p) => `${p.name}: ${p.description}`),
    }),
    file("experience/experience.yml", {
      language: "YAML",
      icon: "yml",
      view: "experience",
      lines: yamlLines(experienceYaml(experience, education)),
      extraText: [...experience.map((e) => `${e.role} at ${e.company}: ${e.summary}`), ...education.map((e) => `${e.degree}, ${e.school}`)],
    }),
    file("skills/skills.json", {
      language: "JSON",
      icon: "json",
      view: "skills",
      lines: jsonLines(skillsJson(skills)),
      extraText: skills.flatMap((g) => g.items.map((i) => `${i.name} — ${i.note}`)),
    }),
    file("contact/contact.ts", { language: "TypeScript", icon: "ts", view: "contact", lines: tsLines(contactObject(content), { name: "contact" }) }),
    file("resume.pdf", { language: "PDF", icon: "pdf", view: "resume", extraText: [`${profile.name} — résumé`, `Available on request: ${profile.email}`] }),
    file(".gitignore", { language: "Ignore", icon: "git", view: "code", lines: gitignoreLines() }),
    file("LICENSE", { language: "Plain Text", icon: "txt", view: "code", lines: licenseText(profile.name).map((t) => [["plain", t]]) }),
  ].filter(Boolean);
}

export function buildTree(files) {
  const folders = new Map();
  const rootFiles = [];
  for (const f of files) {
    const node = { type: "file", name: f.name, path: f.path };
    if (!f.folder) {
      rootFiles.push(node);
      continue;
    }
    if (!folders.has(f.folder)) folders.set(f.folder, { type: "folder", name: f.folder, path: f.folder, children: [] });
    folders.get(f.folder).children.push(node);
  }
  return [...folders.values(), ...rootFiles];
}
