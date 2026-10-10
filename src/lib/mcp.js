import { formatMetric, impactDelta } from "./format.js";

export function openApiToMcp(operation) {
  const parameters = operation.parameters ?? [];
  return {
    name: operation.operationId,
    description: operation.summary ?? "",
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(parameters.map((parameter) => [parameter.name, { type: parameter.schema?.type ?? "string", description: parameter.description ?? "" }])),
      required: parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name),
    },
  };
}

export function impactToolSchema(impact) {
  return {
    name: "impact.lookup",
    description: "Look up one published before/after metric",
    inputSchema: {
      type: "object",
      properties: { metric: { type: "string", enum: impact.map((metric) => metric.label) } },
      required: ["metric"],
    },
  };
}

export function callImpactTool(impact, { metric }) {
  const found = impact.find((item) => item.label.toLowerCase() === String(metric ?? "").toLowerCase());
  if (!found) return { isError: true, content: `Unknown metric: ${metric}` };
  return {
    isError: false,
    content: {
      metric: found.label,
      before: formatMetric(found.before, found.unit),
      after: formatMetric(found.after, found.unit),
      change: impactDelta(found),
      where: found.company,
    },
  };
}
