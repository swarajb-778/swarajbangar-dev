function matches(row, rules) {
  if (row.duplicate) return Boolean(rules.requireKey && row.key);
  return Math.abs(row.amountDelta) <= rules.tolerance && row.daySkew <= rules.dateWindow;
}

/** Clean rows plus the hand-written edge cases. Rate is matched / total. */
export function reconcile(ledger, rules) {
  const clean = Array.from({ length: ledger.clean }, (_, i) => ({
    id: `TX-${String(i + 1).padStart(3, "0")}`,
    kind: "exact",
    amountDelta: 0,
    daySkew: 0,
    duplicate: false,
    key: true,
  }));
  const rows = [...clean, ...ledger.edges].map((row) => ({ ...row, matched: matches(row, rules) }));
  const matched = rows.filter((row) => row.matched).length;
  return { rows, matched, total: rows.length, rate: matched / rows.length };
}
