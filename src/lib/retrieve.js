const tokenize = (text) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

// Filler words carry no evidence; without this, "what salary are you asking for" matches every chunk.
const STOPWORDS = new Set("a an and are be did do does for from how i in is it me my of on or the this to was what when where which who why with you your".split(" "));
const keywords = (text) => tokenize(text).filter((t) => !STOPWORDS.has(t));

function trigrams(text) {
  const padded = `  ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const grams = new Set();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

function cosine(left, right) {
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared++;
  return shared / Math.sqrt(left.size * right.size || 1);
}

function ranks(chunks, scoreOf) {
  return chunks
    .map((chunk) => ({ id: chunk.id, score: scoreOf(chunk) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Reciprocal rank fusion of a lexical score and a character-trigram score. */
export function retrieve(chunks, query, { k = 60, threshold = 0.012 } = {}) {
  const tokens = keywords(query);
  const queryGrams = trigrams(query);
  const lexical = ranks(chunks, (chunk) => {
    const words = tokenize(chunk.text);
    const hits = tokens.reduce((n, token) => n + words.filter((word) => word === token).length, 0);
    return hits / Math.sqrt(words.length || 1);
  });
  const dense = ranks(chunks, (chunk) => cosine(queryGrams, trigrams(chunk.text)));
  // No keyword appears anywhere in the corpus, so nothing can ground an answer.
  const grounded = lexical.length > 0;
  const fused = new Map();
  for (const list of [lexical, dense]) {
    list.forEach((row, rank) => fused.set(row.id, (fused.get(row.id) ?? 0) + 1 / (k + rank + 1)));
  }
  const hits = [...fused.entries()]
    .map(([id, score]) => ({ id, score, path: chunks.find((chunk) => chunk.id === id).path, text: chunks.find((chunk) => chunk.id === id).text }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { lexical, dense, hits, abstain: !grounded || hits.length === 0 || hits[0].score < threshold };
}
