const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function utcDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Columns of 7 days, Sunday first, padded so the first date lands on its weekday. */
export function contributionGrid(days) {
  if (!days.length) return [];
  const pad = utcDate(days[0].date).getUTCDay();
  const cells = [...Array(pad).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Month captions spaced so short labels don't collide. */
export function monthLabels(weeks) {
  const labels = [];
  let previous = "";
  let lastAt = -4;
  weeks.forEach((week, index) => {
    const day = week.find(Boolean);
    const month = day ? MONTHS[utcDate(day.date).getUTCMonth()] : "";
    if (month && month !== previous && index - lastAt >= 3) {
      labels.push(month);
      lastAt = index;
    } else labels.push("");
    if (month) previous = month;
  });
  return labels;
}

export function contributionTotal(payload) {
  if (typeof payload?.total?.lastYear === "number") return payload.total.lastYear;
  return (payload?.contributions ?? []).reduce((sum, day) => sum + day.count, 0);
}

export const contributionsUrl = (user) => `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`;
