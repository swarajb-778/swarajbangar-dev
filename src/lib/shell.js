import { formatMetric, formatPeriod, impactDelta } from "./format.js";

const result = (output = [], effects = []) => ({ output, effects });

/**
 * A tiny, side-effect-free command interpreter. Anything that needs the UI
 * (opening a file, switching theme) is returned as an effect for the caller.
 */
export function createShell({ content, files, themes }) {
  const { profile, projects, skills, experience, socials, impact = [], education = [] } = content;
  const firstName = profile.name.split(" ")[0].toLowerCase();
  const history = [];
  const folders = [...new Set(files.filter((f) => f.folder).map((f) => f.folder))];
  const rootFiles = files.filter((f) => !f.folder).map((f) => f.name);

  const findFile = (arg) =>
    files.find((f) => f.path === arg) ??
    files.find((f) => f.name === arg) ??
    files.find((f) => f.name.toLowerCase() === arg.toLowerCase());

  const withFile = (name, args, onFound) => {
    if (!args[0]) return result([`usage: ${name} <file>`]);
    const found = findFile(args[0]);
    return found ? onFound(found) : result([`${name}: ${args[0]}: No such file`]);
  };

  const commands = {
    help: ["help", "show this list", () => result(helpLines())],
    whoami: ["whoami", "who built this", () => result([`${profile.name} — ${profile.role}`])],
    about: ["about", "a short intro", () => result([profile.tagline, profile.bio])],
    ls: [
      "ls [folder]",
      "list files",
      (args) => {
        if (!args[0]) return result([...folders.map((f) => `${f}/`), ...rootFiles]);
        const folder = args[0].replace(/\/+$/, "");
        if (!folders.includes(folder)) return result([`ls: ${args[0]}: No such directory`]);
        return result(files.filter((f) => f.folder === folder).map((f) => f.name));
      },
    ],
    cat: ["cat <file>", "print a file", (args) => withFile("cat", args, (f) => result([...f.text]))],
    open: [
      "open <file>",
      "open a file in the editor",
      (args) => withFile("open", args, (f) => result([`Opening ${f.path}…`], [{ type: "open", path: f.path }])),
    ],
    projects: [
      "projects",
      "list projects",
      () => result([...projects.map((p) => `${p.name.padEnd(18)} ${p.description}`), "", 'Run "open projects.tsx" for details.']),
    ],
    skills: ["skills", "list skills", () => result(skills.map((g) => `${g.group}: ${g.items.map((i) => i.name).join(", ")}`))],
    experience: [
      "experience",
      "work history",
      () => result(experience.map((e) => `${formatPeriod(e.start, e.end).padEnd(22)} ${e.role} @ ${e.company}`)),
    ],
    education: [
      "education",
      "degrees",
      () => result(education.map((e) => `${formatPeriod(e.start, e.end).padEnd(22)} ${e.degree}, ${e.school}`)),
    ],
    impact: [
      "impact",
      "measured results",
      () =>
        result([
          ...impact.map((m) => `${m.label.padEnd(32)} ${`${formatMetric(m.before, m.unit)} → ${formatMetric(m.after, m.unit)}`.padEnd(28)} ${impactDelta(m)}`),
          "",
          'Run "open impact.json" for the dashboard.',
        ]),
    ],
    neofetch: [
      "neofetch",
      "system info, but it's me",
      () =>
        result([
          `${firstName}@${profile.handle}`,
          "─".repeat(firstName.length + profile.handle.length + 1),
          `Name      ${profile.name}`,
          `Roles     ${(profile.roles ?? [profile.role]).join(" · ")}`,
          `Location  ${profile.location}`,
          `Stack     ${skills.map((g) => g.items[0]?.name).filter(Boolean).join(", ")}`,
          `Status    ${profile.availability}`,
          `Contact   ${profile.email}`,
        ]),
    ],
    contact: [
      "contact",
      "how to reach me",
      () => result([`${"email".padEnd(10)} ${profile.email}`, ...socials.map((s) => `${s.label.toLowerCase().padEnd(10)} ${s.url}`)]),
    ],
    resume: [
      "resume",
      "request my résumé",
      () => result(["I share my résumé on request.", `Email me at ${profile.email} and I'll send you the latest version.`], [{ type: "requestResume" }]),
    ],
    ask: [
      "ask <question>",
      "ask the portfolio assistant",
      (args) => (args.length ? result([], [{ type: "ask", question: args.join(" ") }]) : result(["usage: ask <question>"])),
    ],
    theme: [
      "theme [name]",
      "list or switch color themes",
      (args) => {
        if (!args[0]) return result(["Available themes:", ...themes.map((t) => `  ${t}`), 'Use "theme <name>" to switch.']);
        const name = args[0].toLowerCase();
        if (!themes.includes(name)) return result([`theme: ${args[0]}: unknown theme (try: ${themes.join(", ")})`]);
        return result([`Theme set to ${name}.`], [{ type: "theme", name }]);
      },
    ],
    history: ["history", "show previous commands", () => result(history.map((cmd, i) => `${String(i + 1).padStart(3)}  ${cmd}`))],
    echo: ["echo <text>", "print text", (args) => result([args.join(" ")])],
    date: ["date", "print the date", () => result([new Date().toString()])],
    pwd: ["pwd", "print working directory", () => result([`~/${profile.handle}`])],
    sudo: [
      "sudo <cmd>",
      `try "sudo hire ${firstName}"`,
      (args) =>
        args[0] === "hire" && args[1]?.toLowerCase() === firstName
          ? result(["Permission granted ✓ Opening contact.ts…"], [{ type: "open", path: "contact/contact.ts" }])
          : result(["Permission denied: root access is granted after an interview. Try \"contact\"."]),
    ],
    clear: ["clear", "clear the terminal", () => result([], [{ type: "clear" }])],
    exit: ["exit", "close the terminal", () => result([], [{ type: "closePanel" }])],
  };

  function helpLines() {
    return [
      "Available commands:",
      ...Object.values(commands).map(([usage, about]) => `  ${usage.padEnd(18)} ${about}`),
      "",
      "Tip: Tab completes, ↑/↓ walks history.",
    ];
  }

  function run(input) {
    const trimmed = input.trim();
    if (!trimmed) return result();
    history.push(trimmed);
    const [name, ...args] = trimmed.split(/\s+/);
    const command = commands[name.toLowerCase()];
    if (!command) return result([`command not found: ${name}. Type "help" to see what I can do.`]);
    return command[2](args);
  }

  function complete(partial) {
    const parts = partial.trimStart().split(/\s+/);
    if (parts.length <= 1) {
      const prefix = (parts[0] ?? "").toLowerCase();
      return Object.keys(commands).filter((c) => c.startsWith(prefix));
    }
    const [cmd, arg = ""] = parts;
    const pools = { theme: themes, cat: files.map((f) => f.name), open: files.map((f) => f.name), ls: folders };
    return (pools[cmd.toLowerCase()] ?? [])
      .filter((option) => option.toLowerCase().startsWith(arg.toLowerCase()))
      .map((option) => `${cmd} ${option}`);
  }

  return { run, complete, history, commandNames: Object.keys(commands) };
}
