export function searchDocuments(docs, query, { perFile = 50 } = {}) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const results = [];
  for (const { path, lines } of docs) {
    const matches = [];
    for (let i = 0; i < lines.length && matches.length < perFile; i++) {
      const index = lines[i].toLowerCase().indexOf(needle);
      if (index !== -1) matches.push({ line: i + 1, column: index + 1, text: lines[i] });
    }
    if (matches.length) results.push({ path, matches });
  }
  return results;
}
