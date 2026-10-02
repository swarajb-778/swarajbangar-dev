// A token is [kind, text]; a line is an array of tokens. Views turn kinds into
// CSS classes, so nothing here touches the DOM.

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const INLINE_WIDTH = 80;
const YAML_PLAIN = /^[A-Za-z][\w .,'()/@+&—–-]*$/;
const YAML_RESERVED = /^(true|false|null|yes|no|on|off|~)$/i;

export const lineText = (line) => line.map(([, text]) => text).join("");

const isContainer = (value) => value !== null && typeof value === "object";
const isScalarArray = (value) => Array.isArray(value) && value.every((v) => !isContainer(v));
const widthOf = (tokens) => tokens.reduce((n, [, text]) => n + text.length, 0);
const joinTokens = (parts) => parts.flatMap((part, i) => (i ? [["punct", ", "], ...part] : part));

function scalar(value) {
  if (typeof value === "string") return ["string", JSON.stringify(value)];
  if (typeof value === "number") return ["number", String(value)];
  return ["keyword", String(value)];
}

function keyToken(key, opts) {
  if (opts.quoteKeys) return ["key", JSON.stringify(key)];
  return ["property", IDENTIFIER.test(key) ? key : JSON.stringify(key)];
}

function inlineTokens(value, opts) {
  if (Array.isArray(value)) {
    if (!isScalarArray(value)) return null;
    return [["punct", "["], ...joinTokens(value.map((v) => [scalar(v)])), ["punct", "]"]];
  }
  if (!opts.inlineObjects) return null;
  const entries = Object.entries(value);
  if (!entries.every(([, v]) => !isContainer(v) || isScalarArray(v))) return null;
  const parts = entries.map(([k, v]) => [keyToken(k, opts), ["punct", ": "], ...(isContainer(v) ? inlineTokens(v, opts) : [scalar(v)])]);
  return [["punct", "{ "], ...joinTokens(parts), ["punct", " }"]];
}

function literalLines(value, opts, depth = 0, prefix = [], suffix = []) {
  const pad = opts.indent.repeat(depth);
  const start = pad ? [["plain", pad]] : [];
  if (!isContainer(value)) return [[...start, ...prefix, scalar(value), ...suffix]];

  const isArray = Array.isArray(value);
  const [open, close] = isArray ? ["[", "]"] : ["{", "}"];
  const entries = isArray ? value.map((v) => [null, v]) : Object.entries(value);
  if (entries.length === 0) return [[...start, ...prefix, ["punct", open + close], ...suffix]];

  const inline = inlineTokens(value, opts);
  if (inline && pad.length + widthOf(prefix) + widthOf(inline) + widthOf(suffix) <= INLINE_WIDTH) {
    return [[...start, ...prefix, ...inline, ...suffix]];
  }

  const lines = [[...start, ...prefix, ["punct", open]]];
  entries.forEach(([key, child], i) => {
    const childPrefix = key === null ? [] : [keyToken(key, opts), ["punct", ": "]];
    const isLast = i === entries.length - 1;
    const childSuffix = !isLast || opts.trailingComma ? [["punct", ","]] : [];
    lines.push(...literalLines(child, opts, depth + 1, childPrefix, childSuffix));
  });
  lines.push([...start, ["punct", close], ...suffix]);
  return lines;
}

export function jsonLines(value) {
  return literalLines(value, { indent: "  ", quoteKeys: true, trailingComma: false, inlineObjects: false });
}

export function tsLines(value, { name, type } = {}) {
  const head = [["keyword", "export const "], ["fn", name], ...(type ? [["punct", ": "], ["type", type]] : []), ["punct", " = "]];
  const opts = { indent: "  ", quoteKeys: false, trailingComma: true, inlineObjects: true };
  return literalLines(value, opts, 0, head, [["punct", ";"]]);
}

function yamlScalar(value) {
  if (typeof value !== "string") return scalar(value);
  const plain = YAML_PLAIN.test(value) && !/\s$/.test(value) && !YAML_RESERVED.test(value);
  return ["string", plain ? value : JSON.stringify(value)];
}

function yamlFlow(items) {
  const tokens = items.map(yamlScalar);
  const plain = tokens.every(([, text], i) => typeof items[i] !== "string" || (text === items[i] && !/\s/.test(text)));
  if (!plain || widthOf(tokens) > 60) return null;
  return [["punct", "["], ...joinTokens(tokens.map((t) => [t])), ["punct", "]"]];
}

export function yamlLines(value, depth = 0) {
  const pad = "  ".repeat(depth);
  const indent = pad ? [["plain", pad]] : [];
  const dash = ["punct", "- "];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!isContainer(item)) return [[...indent, dash, yamlScalar(item)]];
      if (Array.isArray(item)) return [[...indent, dash, ["string", JSON.stringify(item)]]];
      const [first, ...rest] = yamlLines(item, depth + 1);
      return [[...indent, dash, ...first.slice(1)], ...rest];
    });
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const head = [...indent, ["key", key], ["punct", ":"]];
    const space = ["plain", " "];
    if (!isContainer(child)) return [[...head, space, yamlScalar(child)]];
    if (Array.isArray(child)) {
      if (child.length === 0) return [[...head, space, ["punct", "[]"]]];
      const flow = isScalarArray(child) ? yamlFlow(child) : null;
      return flow ? [[...head, space, ...flow]] : [head, ...yamlLines(child, depth + 1)];
    }
    if (Object.keys(child).length === 0) return [[...head, space, ["punct", "{}"]]];
    return [head, ...yamlLines(child, depth + 1)];
  });
}
