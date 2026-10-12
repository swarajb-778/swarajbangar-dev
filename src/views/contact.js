import { h, icon } from "../lib/dom.js";
import { mailtoUrl } from "../lib/mail.js";
import { codeBlock, doc, heading } from "./parts.js";

function field(label, name, type, placeholder, required) {
  const id = `contact-${name}`;
  const control =
    type === "textarea"
      ? h("textarea", { class: "input", id, name, rows: 5, placeholder, required })
      : h("input", { class: "input", id, name, type, placeholder, required, autocomplete: name });
  return h("label", { class: "field", for: id }, h("span", { class: "field-label" }, label, required ? "" : " (optional)"), control);
}

export function renderContact(file, ctx) {
  const { profile, socials } = ctx.content;
  const status = h("p", { class: "form-status", role: "status" });

  const form = h(
    "form",
    {
      class: "card contact-form",
      novalidate: true,
      onsubmit: (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const name = String(data.get("name")).trim();
        const from = String(data.get("email")).trim();
        const message = String(data.get("message")).trim();
        if (!name || !message) {
          status.textContent = "Please add your name and a message.";
          status.dataset.tone = "error";
          return;
        }
        const body = `${message}\n\n— ${name}${from ? ` (${from})` : ""}`;
        window.location.href = mailtoUrl(profile.email, `Hello from ${name}`, body);
        status.textContent = "Opening your email app…";
        status.dataset.tone = "ok";
      },
    },
    field("Name", "name", "text", "Your name", true),
    field("Email", "email", "email", "you@example.com", false),
    field("Message", "message", "textarea", "What would you like to build together?", true),
    h(
      "div",
      { class: "form-actions" },
      h("button", { class: "btn primary", type: "submit" }, icon("send", { size: 14 }), "Send message"),
      h("button", { class: "btn", type: "button", onclick: () => ctx.copy(profile.email, "Email address copied.") }, icon("copy", { size: 14 }), "Copy email"),
    ),
    status,
  );

  const elsewhere = h(
    "div",
    { class: "card" },
    h("h3", { class: "card-title" }, "Elsewhere"),
    h(
      "ul",
      { class: "link-list" },
      h("li", {}, h("a", { href: `mailto:${profile.email}` }, icon("chat", { size: 14 }), profile.email)),
      socials.map((s) =>
        h("li", {}, h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer" }, icon("external", { size: 14 }), `${s.label} · ${s.handle}`)),
      ),
    ),
    h("button", { class: "btn", type: "button", onclick: () => ctx.requestResume() }, icon("lock", { size: 14 }), "Request résumé"),
  );

  return doc(codeBlock(file.lines), heading("Say hello", "say-hello"), h("div", { class: "contact-layout" }, form, elsewhere));
}
