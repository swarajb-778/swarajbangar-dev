export const hashForPath = (path) => `#/${encodeURI(path)}`;

export function pathFromHash(hash, knownPaths) {
  if (!hash?.startsWith("#/")) return null;
  try {
    const path = decodeURIComponent(hash.slice(2));
    return knownPaths.includes(path) ? path : null;
  } catch {
    return null;
  }
}
