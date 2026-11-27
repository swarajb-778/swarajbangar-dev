// Help -> Feedback & Report Bug modal built on native <dialog> + HTML5 validation.
import { h, icon } from "../lib/dom.js";
import { sendFeedback } from "../lib/mail.js";

let supportsDisplayTransition;

// Probes actual discrete display transition support (Firefox 129+ parses the property
// without transitioning display on exit).
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return Boolean(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay());
}

async function closeTopLayer(dialog) {
  if (!dialog.open || dialog.hasAttribute("data-closing")) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute("data-closing", "");
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
    }
    if (!dialog.hasAttribute("data-closing")) return;
    dialog.removeAttribute("data-closing");
  }
  dialog.close();
}

function spokenText(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => n.replaceWith(`${n.getAttribute("aria-label")}: `));
  return copy.textContent.replace(/\s+/g, " ").trim();
}

function linkError(el, shown) {
  const errorId = el.dataset.error;
  if (!errorId) return;
  const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== errorId);
  if (shown) ids.push(errorId);
  if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
  else el.removeAttribute("aria-describedby");
}

function attachValidation(form, announcer) {
  const nativeUserInvalid = Boolean(window.CSS?.supports?.("selector(:user-invalid)"));
  const dirtyState = new WeakMap();
  const flagged = new WeakSet();
  const announced = new WeakSet();
  let announceTimer;
  let announcedField;

  const announceError = (el) => {
    const errorEl = form.querySelector(`#${CSS.escape(el.dataset.error)}`);
    if (!errorEl) return;
    const labelText = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : "";
    clearTimeout(announceTimer);
    announcer.textContent = "";
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = labelText + spokenText(errorEl);
    }, 500);
  };

  const syncAria = (el, announce = false) => {
    if (!el?.matches?.("input, select, textarea") || el.type === "radio" || el.type === "checkbox" || el.name === "_gotcha") return;
    const invalid = nativeUserInvalid ? el.matches(":user-invalid") : el.classList.contains("user-invalid-fallback");
    if (invalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute("aria-invalid", "true");
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute("aria-invalid") !== "true") {
      el.setAttribute("aria-invalid", "false");
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = "";
      }
    }
  };

  const updateFallback = (el, announce = false) => {
    const isValid = el.validity.valid;
    el.classList.toggle("user-invalid-fallback", !isValid);
    el.classList.toggle("user-valid-fallback", isValid);
    syncAria(el, announce);
  };

  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type !== "radio" && el.type !== "checkbox" && el.name !== "_gotcha") {
      el.setAttribute("aria-invalid", "false");
    }
  });

  form.addEventListener(
    "blur",
    (e) => {
      const el = e.target;
      if (!el?.checkValidity) return;
      if (!nativeUserInvalid) {
        const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(el, state);
        if (state.hasInteracted) updateFallback(el, true);
        return;
      }
      syncAria(el, true);
    },
    true,
  );

  form.addEventListener("input", (e) => {
    const el = e.target;
    if (!el?.checkValidity) return;
    if (!nativeUserInvalid) {
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(el, state);
      if (state.hasBlurred) updateFallback(el, false);
      return;
    }
    if (el.hasAttribute("aria-invalid")) syncAria(el);
  });

  form.addEventListener(
    "change",
    (e) => {
      const el = e.target;
      if (!el?.checkValidity) return;
      if (!nativeUserInvalid) {
        const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(el, state);
        if (state.hasBlurred) updateFallback(el, true);
        return;
      }
      syncAria(el, true);
    },
    true,
  );

  let focusingInvalid = false;
  form.addEventListener(
    "invalid",
    (e) => {
      // Suppress native browser bubble so our inline accessible errors stay primary,
      // while letting :user-invalid match and focusing the first invalid control.
      e.preventDefault();
      const el = e.target;
      announced.add(el);
      if (!nativeUserInvalid) {
        dirtyState.set(el, { hasInteracted: true, hasBlurred: true });
        updateFallback(el, false);
      } else {
        syncAria(el, false);
      }
      if (!focusingInvalid) {
        focusingInvalid = true;
        el.focus();
        queueMicrotask(() => {
          focusingInvalid = false;
        });
      }
    },
    true,
  );

  const resetStates = () => {
    clearTimeout(announceTimer);
    announcer.textContent = "";
    for (const el of form.elements) {
      dirtyState.delete(el);
      flagged.delete(el);
      announced.delete(el);
      el.classList.remove("user-invalid-fallback", "user-valid-fallback");
      if (el.matches?.("input, select, textarea") && el.type !== "radio" && el.type !== "checkbox" && el.name !== "_gotcha") {
        el.setAttribute("aria-invalid", "false");
        linkError(el, false);
      }
    }
  };

  form.addEventListener("reset", () => setTimeout(resetStates));
  return { resetStates };
}

export function createFeedbackDialog(app) {
  const { profile } = app.content;
  const endpoint = app.content.feedback?.endpoint || "";

  const status = h("p", { class: "form-status", role: "status" });
  const announcer = h("div", { class: "visually-hidden", "aria-live": "polite" });

  const kindFeedback = h("input", { type: "radio", name: "kind", value: "feedback", checked: true });
  const kindBug = h("input", { type: "radio", name: "kind", value: "bug" });

  const nameInput = h("input", {
    class: "input",
    id: "feedback-name",
    name: "name",
    type: "text",
    placeholder: "Your name",
    required: true,
    autocomplete: "name",
    autofocus: true,
    "aria-invalid": "false",
    dataset: { error: "feedback-name-error" },
  });

  const emailInput = h("input", {
    class: "input",
    id: "feedback-email",
    name: "email",
    type: "email",
    placeholder: "you@example.com",
    autocomplete: "email",
    "aria-invalid": "false",
    dataset: { error: "feedback-email-error" },
  });

  const messageInput = h("textarea", {
    class: "input",
    id: "feedback-message",
    name: "message",
    rows: 5,
    placeholder: "Share feedback, ideas, or suggestions about this portfolio…",
    required: true,
    "aria-invalid": "false",
    dataset: { error: "feedback-message-error" },
  });

  const includeContext = h("input", { type: "checkbox", name: "includeContext" });
  const honeypot = h("input", {
    type: "text",
    name: "_gotcha",
    class: "visually-hidden",
    tabindex: -1,
    "aria-hidden": "true",
    autocomplete: "off",
  });

  const submitLabel = h("span", {}, "Send feedback");
  const submitBtn = h("button", { class: "btn primary", type: "submit" }, icon("send", { size: 14 }), submitLabel);

  const errorText = (id, text) =>
    h(
      "span",
      { id, class: "field-error" },
      h("span", { class: "field-error-badge", role: "img", "aria-label": "Error" }, "!"),
      text,
    );

  const updateKindUI = (kind, { touchContext = false } = {}) => {
    const isBug = kind === "bug";
    messageInput.placeholder = isBug
      ? "What went wrong, and what steps reproduce it?"
      : "Share feedback, ideas, or suggestions about this portfolio…";
    submitLabel.textContent = isBug ? "Send bug report" : "Send feedback";
    if (touchContext) includeContext.checked = isBug;
  };

  kindFeedback.addEventListener("change", () => kindFeedback.checked && updateKindUI("feedback", { touchContext: true }));
  kindBug.addEventListener("change", () => kindBug.checked && updateKindUI("bug", { touchContext: true }));

  const form = h(
    "form",
    { class: "contact-form feedback-form" },
    honeypot,
    h(
      "fieldset",
      { class: "feedback-type" },
      h("legend", { class: "visually-hidden" }, "Submission type"),
      h("label", { class: "feedback-pill" }, kindFeedback, icon("chat", { size: 14 }), h("span", {}, "Feedback")),
      h("label", { class: "feedback-pill" }, kindBug, icon("debug", { size: 14 }), h("span", {}, "Report a Bug")),
    ),
    h(
      "div",
      { class: "field" },
      h("label", { class: "field-label", for: "feedback-name" }, "Name"),
      nameInput,
      errorText("feedback-name-error", "Please enter your name."),
    ),
    h(
      "div",
      { class: "field" },
      h("label", { class: "field-label", for: "feedback-email" }, "Email (optional)"),
      emailInput,
      errorText("feedback-email-error", "Enter an email address in the format you@example.com."),
    ),
    h(
      "div",
      { class: "field" },
      h("label", { class: "field-label", for: "feedback-message" }, "Message"),
      messageInput,
      errorText("feedback-message-error", "Please enter your feedback or bug details."),
    ),
    h(
      "label",
      { class: "check feedback-context" },
      includeContext,
      h("span", {}, "Include current file, theme, and viewport info"),
    ),
    h(
      "div",
      { class: "form-actions" },
      submitBtn,
      h(
        "button",
        {
          class: "btn",
          type: "button",
          onclick: () => app.copy(profile.email, "Email address copied."),
        },
        icon("copy", { size: 14 }),
        "Copy email",
      ),
    ),
    status,
  );

  const closeButton = h(
    "button",
    {
      class: "icon-button feedback-close",
      type: "button",
      "aria-label": "Close Feedback & Report Bug",
      title: "Close (Esc)",
      onclick: () => closeTopLayer(dialog),
    },
    icon("close", { size: 16 }),
  );

  // Native modal <dialog>: browser handles role="dialog", aria-modal, inert page, focus trap, Esc, and focus return.
  const dialog = h(
    "dialog",
    {
      id: "feedback-dialog",
      class: "feedback-dialog",
      closedby: "any",
      "aria-labelledby": "feedback-title",
    },
    h(
      "div",
      { class: "feedback-shell" },
      h(
        "header",
        { class: "feedback-header" },
        h(
          "div",
          { class: "feedback-heading" },
          h("h1", { id: "feedback-title", class: "feedback-title" }, "Feedback & Report Bug"),
          h("p", { class: "feedback-subtitle" }, endpoint ? `Sends directly to ${profile.email}` : `Addressed to ${profile.email}`),
        ),
        closeButton,
      ),
      form,
    ),
    announcer,
  );

  document.body.append(dialog);

  const { resetStates } = attachValidation(form, announcer);

  // Route native cancel (Esc / closedby) through exit animation fallback when overlay/discrete display isn't supported.
  dialog.addEventListener("cancel", (event) => {
    if (!supportsTopLayerExit()) {
      event.preventDefault();
      closeTopLayer(dialog);
    }
  });

  // Always reset returnValue so stale button values never leak across dismissals.
  dialog.addEventListener("close", () => {
    dialog.returnValue = "";
  });

  // Fallback light-dismiss for browsers without <dialog closedby> (e.g. Safari):
  // require both press and release outside the dialog's bounding box so text selection drags don't dismiss.
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener("pointerdown", (e) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener("pointerup", (e) => {
      if (pressedOutside && isOutside(e)) closeTopLayer(dialog);
      pressedOutside = false;
    });
  }

  let submitting = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (honeypot.value.trim()) {
      status.textContent = "Thanks for your note!";
      status.dataset.tone = "ok";
      return;
    }

    const data = new FormData(form);
    const kind = data.get("kind") === "bug" ? "bug" : "feedback";
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !message) {
      status.textContent = "Please add your name and a message.";
      status.dataset.tone = "error";
      (!name ? nameInput : messageInput).focus();
      return;
    }

    const state = app.store.get();
    const context = includeContext.checked
      ? {
          page: state.active || "welcome",
          theme: state.theme,
          font: state.font,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
        }
      : null;

    submitting = true;
    submitBtn.disabled = true;
    const prevLabel = submitLabel.textContent;
    if (endpoint) {
      submitLabel.textContent = "Sending…";
      status.textContent = "Sending to Swaraj…";
      status.dataset.tone = "";
    }

    try {
      const result = await sendFeedback({ endpoint, to: profile.email, kind, name, email, message, context });
      if (result.mode === "direct") {
        status.textContent = `Sent to ${profile.email}. Thanks for reaching out!`;
        status.dataset.tone = "ok";
        app.toast(kind === "bug" ? "Bug report sent — thank you!" : "Feedback sent — thank you!");
        form.reset();
        resetStates();
        updateKindUI(kind, { touchContext: true });
      } else {
        window.location.href = result.mailto;
        status.textContent =
          result.mode === "mailto-fallback"
            ? "Direct delivery unavailable — opening your email app…"
            : "Opening your email app…";
        status.dataset.tone = "ok";
      }
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      submitLabel.textContent = prevLabel;
    }
  });

  function open(initialKind = "feedback") {
    status.textContent = "";
    status.dataset.tone = "";
    const isBug = initialKind === "bug";
    kindFeedback.checked = !isBug;
    kindBug.checked = isBug;
    updateKindUI(isBug ? "bug" : "feedback", { touchContext: true });
    resetStates();
    if (!dialog.open) dialog.showModal();
  }

  return {
    open,
    close: () => closeTopLayer(dialog),
    isOpen: () => dialog.open,
  };
}
