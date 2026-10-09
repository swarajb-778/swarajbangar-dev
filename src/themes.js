export const THEMES = [
  { id: "midnight", label: "Midnight", kind: "dark" },
  { id: "daylight", label: "Daylight", kind: "light" },
  { id: "matcha", label: "Matcha", kind: "dark" },
  { id: "contrast", label: "High Contrast", kind: "dark" },
];

export const defaultTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "daylight" : "midnight";

export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  const chrome = getComputedStyle(document.documentElement).getPropertyValue("--bg-chrome").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chrome);
}
