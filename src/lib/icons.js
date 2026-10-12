// Pure icon lookups (no DOM), so tests can check them in Node.
// File and folder art comes from the VS Code Material Icon Theme; UI glyphs are
// VS Code Codicons. Credits and versions: assets/icons/NOTICE.md.
import { CODICONS } from "./codicons.js";

const FILE_DIR = "assets/icons/files";
const FOLDER_DIR = "assets/icons/folders";

// Mirrors Material Icon Theme's manifest: exact file names win (matched
// case-insensitively, like VS Code), then the file kind from src/files.js.
const FILE_NAMES = { "readme.md": "readme", license: "license", ".gitignore": "git" };
const FILE_KINDS = { md: "markdown", json: "json", py: "python", ts: "typescript", tsx: "react_ts", yml: "yaml", pdf: "pdf", git: "git", txt: "document" };

// Folder names the theme matches exactly (github, projects, skills), plus the
// closest named icon for the rest. Unknown folders get the generic folder.
const FOLDERS = {
  about: "folder-docs",
  ai: "folder-robot",
  systems: "folder-server",
  metrics: "folder-benchmark",
  github: "folder-github",
  projects: "folder-project",
  experience: "folder-job",
  skills: "folder-skills",
  contact: "folder-mail",
};

/** URL of the Material file icon for a file `kind` (and optional file name). */
export function fileIconSrc(kind, name = "") {
  const icon = FILE_NAMES[name.toLowerCase()] ?? FILE_KINDS[kind] ?? "file";
  return `${FILE_DIR}/${icon}.svg`;
}

/** URL of the Material folder icon, closed or open. */
export function folderIconSrc(name = "", open = false) {
  const icon = FOLDERS[name.toLowerCase()] ?? "folder";
  return `${FOLDER_DIR}/${icon}${open ? "-open" : ""}.svg`;
}

// The app's icon names -> codicon names. `run` is the codicon alias of `play`;
// `debug` is the Run and Debug view icon from VS Code's activity bar.
const GLYPHS = {
  files: "files",
  search: "search",
  branch: "source-control",
  run: "play",
  debug: "debug-alt",
  extensions: "extensions",
  account: "account",
  gear: "settings-gear",
  chat: "comment-discussion",
  sparkle: "sparkle",
  sidebarLeft: "layout-sidebar-left",
  panelBottom: "layout-panel",
  sidebarRight: "layout-sidebar-right",
  close: "close",
  chevronRight: "chevron-right",
  chevronDown: "chevron-down",
  bell: "bell",
  trash: "trash",
  external: "link-external",
  menu: "menu",
  copy: "copy",
  send: "send",
  download: "cloud-download",
  check: "check",
  warning: "warning",
  error: "error",
  collapse: "collapse-all",
  lock: "lock",
  mail: "mail",
  maximize: "screen-full",
  restore: "screen-normal",
  sync: "sync",
};

// Codicons has no brand marks, so LinkedIn keeps the site's own stroke drawing.
const CUSTOM = {
  linkedin: { grid: 24, stroke: true, paths: ["M4 4h16v16H4z", "M8 10.5v5.5", "M8 8v.01", "M11.5 16v-5.5", "M11.5 13a2.5 2.5 0 0 1 5 0v3"] },
};

/** Every icon name icon() accepts. */
export const GLYPH_NAMES = [...Object.keys(GLYPHS), ...Object.keys(CUSTOM)];

/** The drawing for an icon name: { grid, paths, stroke? }, or null if unknown. */
export const glyphFor = (name) => CUSTOM[name] ?? CODICONS[GLYPHS[name]] ?? null;
