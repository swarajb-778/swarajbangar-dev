import { formatMetric, formatPeriod, impactDelta } from "./format.js";

// Order matters: earlier intents win ties ("open to work" is availability, not experience).
const INTENTS = [
  ["availability", ["open", "available", "availability", "hire", "hiring", "freelance", "opportunit"]],
  ["contact", ["contact", "email", "reach", "mail", "message", "touch", "connect", "social", "linkedin", "github"]],
  ["resume", ["resume", "cv"]],
  ["education", ["study", "degree", "education", "university", "college", "school", "masters", "bachelor", "graduat"]],
  ["ai", ["ai", "agent", "agentic", "llm", "rag", "langgraph", "langchain", "genai", "ml", "machine", "model"]],
  ["impact", ["impact", "metric", "result", "achieve", "number", "measur"]],
  ["projects", ["project", "built", "build", "made", "portfolio", "side"]],
  ["skills", ["skill", "stack", "tech", "language", "tool", "know", "framework"]],
  ["experience", ["work", "job", "experience", "company", "career", "role", "employ"]],
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
  impact: { label: "impact.json", path: "metrics/impact.json" },
};

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

export function answer(question, { profile, projects, skills, experience, socials, ai, impact = [], education = [] }) {
  const first = profile.name.split(" ")[0];
  const socialNames = socials.map((s) => s.label).join(", ");

  switch (detectIntent(question)) {
    case "education": {
      const degrees = education.map((e) => `${e.degree} at ${e.school} (${formatPeriod(e.start, e.end)}${e.notes ? `; ${e.notes}` : ""})`).join("; ");
      return { text: degrees ? `${first} studied: ${degrees}.` : `${first} hasn't listed education yet.`, links: [LINKS.experience] };
    }
    case "ai": {
      if (!ai) break;
      const pipeline = ai.agent ? ` ${ai.agent.name} in agents.py shows the pattern: ${ai.agent.nodes.map((n) => n.label.toLowerCase()).join(" → ")}.` : "";
      return { text: `${ai.summary}${pipeline}`, links: [LINKS.agents, LINKS.projects] };
    }
    case "impact": {
      if (!impact.length) break;
      const top = impact
        .slice(0, 3)
        .map((m) => `${m.label}: ${formatMetric(m.before, m.unit)} → ${formatMetric(m.after, m.unit)} (${impactDelta(m)})`)
        .join("; ");
      return { text: `Measured results: ${top}.`, links: [LINKS.impact] };
    }
    case "availability":
      return { text: `${profile.availability}. The quickest way to reach ${first} is ${profile.email}.`, links: [LINKS.contact] };
    case "contact":
      return {
        text: `Email ${first} at ${profile.email}${socialNames ? `, or find ${first} on ${socialNames}` : ""}.`,
        links: [LINKS.contact],
      };
    case "resume":
      return {
        text: `${first} shares the résumé on request so it's always current. Email ${profile.email} and you'll get the latest version.`,
        links: [LINKS.contact],
      };
    case "projects": {
      const picks = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
      const list = picks.map((p) => `${p.name} (${p.description.replace(/\.$/, "")})`).join("; ");
      return { text: `A few things ${first} has built: ${list}.`, links: [LINKS.projects] };
    }
    case "skills":
      return {
        text: skills.map((g) => `${g.group}: ${g.items.slice(0, 5).map((i) => i.name).join(", ")}${g.items.length > 5 ? ", and more" : ""}`).join(". ") + ".",
        links: [LINKS.skills],
      };
    case "experience": {
      const roles = experience
        .slice(0, 3)
        .map((e) => `${e.role} at ${e.company} (${formatPeriod(e.start, e.end)})`)
        .join("; ");
      return { text: `${first}'s recent experience: ${roles}.`, links: [LINKS.experience] };
    }
    case "location":
      return { text: `${first} is based in ${profile.location}.`, links: [LINKS.profile] };
    case "greeting":
      return {
        text: `Hi! This is ${profile.name}'s portfolio. ${profile.tagline} Ask about projects, skills, experience, or how to get in touch.`,
        links: [LINKS.projects, LINKS.contact],
      };
  }
  return {
    text: `I can only answer questions about ${first}'s work. Try asking about projects, skills, experience, location, or how to get in touch.`,
    links: [LINKS.projects, LINKS.skills, LINKS.contact],
  };
}
