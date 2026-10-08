/**
 * Places each node in a column by its shortest distance from the entry node
 * (the first node). Edges back to an already-placed node are ignored, so
 * retry loops still lay out left to right. Unreachable nodes are dropped.
 */
export function layerGraph(nodes, edges) {
  if (!nodes.length) return [];
  const ids = new Set(nodes.map((n) => n.id));
  const entry = nodes[0].id;
  const depth = new Map([[entry, 0]]);
  const queue = [entry];
  while (queue.length) {
    const id = queue.shift();
    for (const [from, to] of edges) {
      if (from !== id || !ids.has(to) || depth.has(to)) continue;
      depth.set(to, depth.get(id) + 1);
      queue.push(to);
    }
  }
  const layers = [];
  for (const { id } of nodes) {
    if (depth.has(id)) (layers[depth.get(id)] ??= []).push(id);
  }
  return layers;
}
