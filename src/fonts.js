export const FONTS = [
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    note: "JetBrains Mono · Inter",
    stylesheet: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
  },
  {
    id: "vscode-default",
    label: "VS Code Default",
    note: "Menlo · SF Pro",
  },
  {
    id: "fira-code",
    label: "Fira Code",
    note: "Fira Code · Plus Jakarta Sans",
    stylesheet: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "ibm-plex",
    label: "IBM Plex Mono",
    note: "IBM Plex Mono · IBM Plex Sans",
    stylesheet: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  },
];

export const defaultFont = () => "jetbrains";

export function resolveFont(id) {
  return FONTS.some((f) => f.id === id) ? id : defaultFont();
}

export function loadFontStylesheet(id) {
  const font = FONTS.find((f) => f.id === id);
  if (!font?.stylesheet || typeof document === "undefined") return;
  if (document.head.querySelector(`link[data-font-sheet="${font.id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.stylesheet;
  link.dataset.fontSheet = font.id;
  document.head.append(link);
}

export function applyFont(id) {
  const resolved = resolveFont(id);
  loadFontStylesheet(resolved);
  document.documentElement.dataset.font = resolved;
}
