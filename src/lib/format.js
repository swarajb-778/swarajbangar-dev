const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(value) {
  const [year, month] = String(value).split("-").map(Number);
  return MONTHS[month - 1] ? `${MONTHS[month - 1]} ${year}` : String(value);
}

export function formatPeriod(start, end) {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}`;
}

const TIGHT_UNITS = new Set(["s", "ms", "x", "×"]);

export function formatMetric(value, unit) {
  const number = Number.isInteger(value) ? value.toLocaleString("en-US") : String(value);
  if (unit.startsWith("%")) return `${number}%`;
  return TIGHT_UNITS.has(unit) ? `${number}${unit}` : `${number} ${unit}`;
}

const sign = (x) => (x > 0 ? "+" : x < 0 ? "−" : "±");
// (1.7 - 4) / 4 * 100 is -57.4999…; trim float noise so it rounds like 57.5.
const roundAbs = (x) => Math.round(Number(Math.abs(x).toFixed(6)));

/** Relative change, except plain percentages, which change by points. */
export function impactDelta({ before, after, unit, delta }) {
  if (delta) return delta;
  if (unit === "%") return `${sign(after - before)}${roundAbs(after - before)} pts`;
  const change = ((after - before) / before) * 100;
  return `${sign(change)}${roundAbs(change)}%`;
}

// Each English locale only knows its own region's zone names (en-US has PDT, en-IN has IST),
// so try a few and keep the first real abbreviation; otherwise fall back to "GMT+9" style.
const ZONE_LOCALES = ["en-US", "en-GB", "en-IN", "en-AU"];

/** "Mon, 12 Oct 2026 3:33:44 PM PDT" in the viewer's time zone (or `timeZone`), like a shell's last-login line. */
export function loginStamp(date, { timeZone, locale } = {}) {
  const parts = (loc, opts) => Object.fromEntries(new Intl.DateTimeFormat(loc, { timeZone, ...opts }).formatToParts(date).map((p) => [p.type, p.value]));
  const p = parts("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  const zones = [locale, ...ZONE_LOCALES].filter(Boolean).map((loc) => parts(loc, { timeZoneName: "short" }).timeZoneName);
  const zone = zones.find((z) => !/^(GMT|UTC)[+-]/.test(z)) ?? zones[0];
  return `${p.weekday}, ${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}:${p.second} ${p.dayPeriod} ${zone}`;
}

/** FNV-1a, shortened to look like a git commit hash. */
export function shortHash(input) {
  let hash = 0x811c9dc5;
  for (const ch of input) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}
