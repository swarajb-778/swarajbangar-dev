const BOUNDARIES = new Set([" ", "/", "-", "_", ".", "@"]);

function score(indices, text) {
  let total = 0;
  indices.forEach((index, i) => {
    total += 1;
    if (i > 0 && index === indices[i - 1] + 1) total += 5;
    if (index === 0) total += 8;
    else if (BOUNDARIES.has(text[index - 1])) total += 4;
  });
  const gaps = indices.at(-1) - indices[0] + 1 - indices.length;
  return total - gaps * 0.2 - text.length * 0.01;
}

/** Subsequence match. Tries every start position and keeps the best-scoring one. */
export function fuzzyMatch(query, text) {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();

  let best = null;
  for (let start = t.indexOf(q[0]); start !== -1; start = t.indexOf(q[0], start + 1)) {
    const indices = [start];
    for (let i = 1, pos = start; i < q.length; i++) {
      pos = t.indexOf(q[i], pos + 1);
      if (pos === -1) break;
      indices.push(pos);
    }
    // A later start can only see fewer characters, so it cannot succeed either.
    if (indices.length < q.length) break;
    const s = score(indices, text);
    if (!best || s > best.score) best = { score: s, indices };
  }
  return best;
}

export function fuzzyFilter(items, query, getText = String) {
  return items
    .map((item, order) => ({ item, order, match: fuzzyMatch(query, getText(item)) }))
    .filter((r) => r.match)
    .sort((a, b) => b.match.score - a.match.score || a.order - b.order)
    .map(({ item, match }) => ({ item, score: match.score, indices: match.indices }));
}
