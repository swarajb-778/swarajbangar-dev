export function mailtoUrl(email, subject, body) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Formats a Feedback or Bug Report submission into a clean email subject & body. */
export function buildFeedbackMessage({ kind = "feedback", name = "", email = "", message = "", context = null }) {
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim();
  const cleanMessage = String(message).trim();
  const isBug = kind === "bug";
  const tag = isBug ? "Portfolio Bug Report" : "Portfolio Feedback";
  const subject = `[${tag}] from ${cleanName || "Visitor"}`;

  const lines = [cleanMessage, "", `— ${cleanName || "Anonymous"}${cleanEmail ? ` (${cleanEmail})` : ""}`];

  if (context && typeof context === "object") {
    const entries = [
      ["Type", isBug ? "Bug report" : "Feedback"],
      context.page && ["Page", context.page],
      context.theme && ["Theme", context.theme],
      context.font && ["Font", context.font],
      context.viewport && ["Viewport", context.viewport],
    ].filter(Boolean);
    if (entries.length) {
      lines.push("", "---", ...entries.map(([k, v]) => `${k}: ${v}`));
    }
  }

  return { subject, body: lines.join("\n") };
}

/**
 * Delivers feedback either directly to a configured JSON form endpoint
 * (e.g. Formspree / Web3Forms / FormSubmit) or returns a pre-filled `mailto:` URL.
 */
export async function sendFeedback({ endpoint = "", to, kind = "feedback", name, email = "", message, context = null, fetchImpl = globalThis.fetch }) {
  const { subject, body } = buildFeedbackMessage({ kind, name, email, message, context });
  const mailto = mailtoUrl(to, subject, body);
  const url = String(endpoint || "").trim();

  if (!url || typeof fetchImpl !== "function") {
    return { ok: true, mode: "mailto", subject, body, mailto };
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(name || "").trim(),
        email: String(email || "").trim(),
        type: kind === "bug" ? "Bug Report" : "Feedback",
        message: body,
        _subject: subject,
        ...(email && String(email).trim() ? { _replyto: String(email).trim() } : {}),
      }),
    });
    if (!response.ok) {
      return { ok: false, mode: "mailto-fallback", subject, body, mailto, status: response.status };
    }
    return { ok: true, mode: "direct", subject, body, mailto };
  } catch (error) {
    return { ok: false, mode: "mailto-fallback", subject, body, mailto, error: error?.message || "Network error" };
  }
}
