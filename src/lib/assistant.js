import { formatMetric, formatPeriod, impactDelta } from "./format.js";

// Order matters: earlier intents win ties ("available for work" is contact, not experience).
const INTENTS = [
  ["contact", ["contact", "email", "reach", "mail", "message", "touch", "connect", "social", "linkedin", "github", "available", "hire", "hiring", "freelance", "opportunit"]],
  ["resume", ["resume", "cv"]],
  ["education", ["study", "degree", "education", "university", "college", "school", "masters", "bachelor", "graduat"]],
  ["ai", ["ai", "agent", "agentic", "llm", "rag", "langgraph", "langchain", "genai", "ml", "machine", "model", "mcp", "voice", "eval", "pinecone"]],
  ["impact", ["impact", "metric", "result", "achieve", "number", "measur", "throughput", "latency"]],
  ["projects", ["project", "built", "build", "made", "portfolio", "side"]],
  ["skills", ["skill", "stack", "tech", "language", "tool", "know", "framework"]],
  ["experience", ["work", "job", "experience", "company", "career", "role", "employ", "mckinsey", "amazon", "thoughtworks"]],
  ["location", ["where", "based", "located", "location", "live", "city", "country", "from"]],
  ["greeting", ["hi", "hello", "hey", "yo", "namaste", "sup"]],
];

const LINKS = {
  projects: { label: "projects.tsx", path: "projects/projects.tsx" },
  skills: { label: "skills.json", path: "skills/skills.json" },
  experience: { label: "experience.yml", path: "experience/experience.yml" },
  contact: { label: "contact.ts", path: "contact/contact.ts" },
  profile: { label: "profile.json", path: "about/profile.json" },
  agents: { label: "agents.py", path: "ai/agents.py" },
  oncall: { label: "oncall.py", path: "ai/oncall.py" },
  impact: { label: "impact.json", path: "metrics/impact.json" },
};

export const STARTER_PROMPTS = [
  {
    id: "ai",
    icon: "sparkle",
    title: "Agentic AI & LangGraph",
    prompt: "What's your agentic AI work?",
    source: "agents.py",
  },
  {
    id: "impact",
    icon: "check",
    title: "Measured production impact",
    prompt: "What impact have you had?",
    source: "impact.json",
  },
  {
    id: "projects",
    icon: "run",
    title: "Featured AI & MCP builds",
    prompt: "Show me your projects",
    source: "projects.tsx",
  },
  {
    id: "skills",
    icon: "extensions",
    title: "Core AI & full-stack stack",
    prompt: "What's your tech stack?",
    source: "skills.json",
  },
  {
    id: "experience",
    icon: "branch",
    title: "Work history & roles",
    prompt: "Where have you worked?",
    source: "experience.yml",
  },
];

function tokenize(question) {
  return question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function detectIntent(question) {
  const tokens = tokenize(question);
  const hits = (word) => tokens.some((t) => t === word || (word.length >= 4 && t.startsWith(word)));
  let best = null;
  for (const [intent, words] of INTENTS) {
    const score = words.filter(hits).length;
    if (score > (best?.score ?? 0)) best = { intent, score };
  }
  return best?.intent ?? null;
}

const sourceBadge = (links) => `Grounded · ${links.length} ${links.length === 1 ? "source" : "sources"}`;
const makeTrace = (intent, links) => [
  `classify → ${intent}`,
  `retrieve → ${links.map((l) => l.label).join(", ")}`,
  "verify → cited ✓",
];

// Replies speak as the portfolio owner, in the first person.
export function answer(question, { profile, projects, skills, experience, socials, ai, impact = [], education = [] }) {
  const socialNames = socials.map((s) => s.label).join(", ");
  const intent = detectIntent(question);

  switch (intent) {
    case "education": {
      const degrees = education.map((e) => `${e.degree} at ${e.school} (${formatPeriod(e.start, e.end)}${e.notes ? `; ${e.notes}` : ""})`).join("; ");
      const links = [LINKS.experience];
      return {
        text: degrees ? `Here's where I studied: ${degrees}.` : "I haven't listed my education yet.",
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Education & Research",
          trace: makeTrace("education_query", links),
          facts: education.map((e) => ({
            label: e.degree,
            value: formatPeriod(e.start, e.end),
            detail: [e.school, e.notes].filter(Boolean).join(" · "),
          })),
        },
      };
    }

    case "ai": {
      if (!ai) break;
      const pipeline = ai.agent ? ` ${ai.agent.name} in agents.py shows the pattern: ${ai.agent.nodes.map((n) => n.label.toLowerCase()).join(" → ")}.` : "";
      const links = [LINKS.agents, ...(ai.oncall ? [LINKS.oncall] : []), LINKS.projects];
      const aiProjects = projects.filter((p) => p.tags.some((t) => /ai|voice|mcp/i.test(t))).slice(0, 3);
      const topEval = ai.agent?.evals?.[0];
      const facts = [
        ...(ai.agent
          ? [{
              label: `${ai.agent.name} graph`,
              value: `${ai.agent.nodes.length} nodes`,
              tone: "accent",
              detail: ai.agent.nodes.map((n) => n.label).join(" → "),
            }]
          : []),
        ...(topEval
          ? [{
              label: "Eval discipline",
              value: `${Math.round(topEval.score * 100)}% ${topEval.metric.toLowerCase()}`,
              tone: "success",
              detail: ai.agent.evalNote ?? "Evidence-linked citations with abstention controls",
            }]
          : []),
        ...(aiProjects.length
          ? [{
              label: "Shipped AI builds",
              value: `${aiProjects.length} featured`,
              detail: aiProjects.map((p) => p.name).join(" · "),
            }]
          : []),
      ];
      return {
        text: `${ai.summary}${pipeline}`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Agentic AI Systems",
          trace: makeTrace("ai_architecture", links),
          facts,
        },
      };
    }

    case "impact": {
      if (!impact.length) break;
      const top = impact
        .slice(0, 3)
        .map((m) => `${m.label}: ${formatMetric(m.before, m.unit)} → ${formatMetric(m.after, m.unit)} (${impactDelta(m)})`)
        .join("; ");
      const links = [LINKS.impact, LINKS.experience];
      return {
        text: `Measured results from my work: ${top}.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Production Impact",
          trace: makeTrace("impact_metrics", links),
          facts: impact.slice(0, 4).map((m) => ({
            label: m.label,
            value: impactDelta(m),
            tone: "success",
            detail: `${formatMetric(m.before, m.unit)} → ${formatMetric(m.after, m.unit)}${m.company ? ` · ${m.company}` : ""}`,
          })),
        },
      };
    }

    case "contact": {
      const links = [LINKS.contact];
      return {
        text: `Email me at ${profile.email}${socialNames ? `, or find me on ${socialNames}` : ""}.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Direct Contact",
          trace: makeTrace("contact_query", links),
          facts: [
            { label: "Email", value: profile.email, tone: "accent", detail: "Best for roles, AI engineering, or collaborations" },
            ...socials.slice(0, 2).map((s) => ({ label: s.label, value: s.handle, detail: s.url.replace(/^https?:\/\//, "") })),
          ],
        },
      };
    }

    case "resume": {
      const links = [LINKS.contact];
      return {
        text: `I share my résumé on request so it's always current. Email me at ${profile.email} and I'll send you the latest version.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Résumé Policy",
          trace: makeTrace("resume_policy", links),
          facts: [
            { label: "Sharing model", value: "On request", tone: "accent", detail: "Shared personally so every role and metric stays current" },
            { label: "Request via", value: profile.email, detail: "Open contact.ts or trigger Request Résumé from File menu" },
          ],
        },
      };
    }

    case "projects": {
      const picks = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
      const list = picks.map((p) => `${p.name} (${p.description.replace(/\.$/, "")})`).join("; ");
      const links = [LINKS.projects];
      return {
        text: `A few things I've built: ${list}.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Featured Projects",
          trace: makeTrace("project_lookup", links),
          facts: picks.map((p) => ({
            label: p.name,
            value: String(p.year),
            tone: p.featured ? "accent" : undefined,
            detail: p.tags.slice(0, 3).join(" · "),
          })),
        },
      };
    }

    case "skills": {
      const links = [LINKS.skills];
      return {
        text: `Here's what I work with. ${skills.map((g) => `${g.group}: ${g.items.slice(0, 5).map((i) => i.name).join(", ")}${g.items.length > 5 ? ", and more" : ""}`).join(". ")}.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Engineering Stack",
          trace: makeTrace("skills_lookup", links),
          facts: skills.slice(0, 4).map((g) => ({
            label: g.group,
            value: `${g.items.length} tools`,
            detail: g.items.slice(0, 4).map((i) => i.name).join(", "),
          })),
        },
      };
    }

    case "experience": {
      const roles = experience
        .slice(0, 3)
        .map((e) => `${e.role} at ${e.company} (${formatPeriod(e.start, e.end)})`)
        .join("; ");
      const links = [LINKS.experience, LINKS.impact];
      return {
        text: `My recent experience: ${roles}.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Experience Timeline",
          trace: makeTrace("experience_query", links),
          facts: experience.slice(0, 3).map((e) => ({
            label: e.company,
            value: formatPeriod(e.start, e.end),
            tone: !e.end ? "success" : undefined,
            detail: e.highlights?.[0] ?? e.summary,
          })),
        },
      };
    }

    case "location": {
      const links = [LINKS.profile];
      return {
        text: `I'm based in ${profile.location}.`,
        links,
        card: {
          intent,
          status: "grounded",
          badge: sourceBadge(links),
          title: "Location",
          trace: makeTrace("profile_lookup", links),
          facts: [
            { label: "Base", value: profile.location, tone: "accent", detail: profile.role },
          ],
        },
      };
    }

    case "greeting": {
      const links = [LINKS.agents, LINKS.projects, LINKS.contact];
      return {
        text: `Hi, I'm ${profile.name}. ${profile.tagline} Ask me about my projects, skills, experience, or how to get in touch.`,
        links,
        card: {
          intent,
          status: "welcome",
          badge: "Workspace indexed",
          title: profile.role,
          trace: ["index → portfolio files", "mode → grounded citations"],
          facts: [
            { label: "Focus", value: "AI + Full-Stack", tone: "accent", detail: "LangGraph, hybrid RAG, voice agents, MCP, distributed systems" },
          ],
        },
      };
    }
  }

  const fallbackLinks = [LINKS.agents, LINKS.projects, LINKS.skills, LINKS.contact];
  return {
    text: "I can only answer questions about my work. Try asking about my projects, skills, experience, location, or how to get in touch.",
    links: fallbackLinks,
    card: {
      intent: "fallback",
      status: "abstained",
      badge: "Abstained · out of scope",
      title: "Out of scope",
      trace: ["classify → out_of_scope", "retrieve → 0 sources above threshold", "verify → abstained"],
      facts: [
        { label: "Indexed topics", value: "6 domains", detail: "Agentic AI, measured impact, projects, experience, stack, and contact" },
      ],
    },
  };
}
