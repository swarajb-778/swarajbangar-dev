export const THEMES = [
  { id: "midnight", label: "Midnight", kind: "dark" },
];

export const defaultTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "daylight" : "midnight";

export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  const chrome = getComputedStyle(document.documentElement).getPropertyValue("--bg-chrome").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chrome);
}
