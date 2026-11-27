export const THEMES = [
  { id: "dark-2026", label: "2026 Dark", kind: "dark" },
  { id: "material-dark", label: "Material Dark", kind: "dark", note: "Super dark · Ocean" },
  { id: "min-dark", label: "Min Dark", kind: "dark", note: "Super dark · Minimal" },
  { id: "light-2026", label: "2026 Light", kind: "light", note: "Sorry, you're not a developer" },
  { id: "matcha", label: "Matcha", kind: "dark" },
  { id: "contrast", label: "High Contrast", kind: "dark" },
];

const LEGACY_THEME_MAP = {
  midnight: "dark-2026",
  daylight: "light-2026",
};

export function resolveTheme(id) {
  const mapped = LEGACY_THEME_MAP[id] ?? id;
  return THEMES.some((t) => t.id === mapped) ? mapped : defaultTheme();
}

export const defaultTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light-2026" : "dark-2026";

export function applyTheme(id) {
  const resolved = resolveTheme(id);
  document.documentElement.dataset.theme = resolved;
  const chrome = getComputedStyle(document.documentElement).getPropertyValue("--bg-chrome").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chrome);
}
