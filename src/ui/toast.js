import { h, icon } from "../lib/dom.js";

export function createToaster() {
  const region = h("div", { class: "toasts", role: "status", "aria-live": "polite" });
  document.body.append(region);

  return function toast(message) {
    const el = h("div", { class: "toast" }, icon("bell", { size: 16 }), h("span", {}, message));
    region.append(el);
    setTimeout(() => {
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 220);
    }, 3200);
  };
}
