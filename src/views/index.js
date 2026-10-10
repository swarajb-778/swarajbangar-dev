import { renderReadme } from "./readme.js";
import { renderProjects } from "./projects.js";
import { renderExperience } from "./experience.js";
import { renderSkills } from "./skills.js";
import { renderContact } from "./contact.js";
import { renderResume } from "./resume.js";
import { renderAgents } from "./agents.js";
import { renderImpact } from "./impact.js";
import { renderActivity } from "./activity.js";
import { renderMcp, renderReconcile, renderRetrieve, renderWaterfall } from "./labs.js";
import { codeBlock, doc } from "./parts.js";

const renderCode = (file) => doc(codeBlock(file.lines));

const VIEWS = {
  readme: renderReadme,
  code: renderCode,
  projects: renderProjects,
  experience: renderExperience,
  skills: renderSkills,
  contact: renderContact,
  resume: renderResume,
  agents: renderAgents,
  impact: renderImpact,
  activity: renderActivity,
  retrieve: renderRetrieve,
  reconcile: renderReconcile,
  waterfall: renderWaterfall,
  mcp: renderMcp,
};

export const renderView = (file, ctx) => (VIEWS[file.view] ?? renderCode)(file, ctx);
