import { h } from "../lib/dom.js";
import { fitPanels, keySize } from "../lib/resize.js";

// One sash per resizable edge, placed next to (never inside) its panel.
// `sign` turns pointer movement along `axis` into growth of the panel.
const SASHES = [
  { key: "sidebarW", open: "sidebarOpen", prop: "--sidebar-w", target: "sidebar", place: "after", label: "Resize sidebar", axis: "x", sign: 1 },
  { key: "panelH", open: "panelOpen", prop: "--panel-h", target: "panel", place: "before", label: "Resize terminal", axis: "y", sign: -1 },
  { key: "chatW", open: "chatOpen", prop: "--chat-w", target: "chat", place: "before", label: "Resize assistant", axis: "x", sign: -1 },
];
const WATCHED = SASHES.flatMap((s) => [s.key, s.open]);

export function createResizers(app, workbench) {
  // A null size in the store means the default declared in styles/themes.css.
  const rootStyle = getComputedStyle(document.documentElement);
  const defaults = Object.fromEntries(SASHES.map((s) => [s.key, parseFloat(rootStyle.getPropertyValue(s.prop))]));
  let box = { width: workbench.clientWidth, height: workbench.clientHeight };
  let live = {}; // the size being dragged; it reaches the store on release
  let frame = 0;
  let fitted;

  function layout() {
    const state = app.store.get();
    const want = Object.fromEntries(SASHES.map(({ key }) => [key, live[key] ?? state[key] ?? defaults[key]]));
    fitted = fitPanels(want, { ...box, sidebarOpen: state.sidebarOpen, chatOpen: state.chatOpen });
    for (const { key, open, prop, el } of sashes) {
      const { size, min, max } = fitted[key];
      workbench.style.setProperty(prop, `${size}px`);
      el.hidden = !state[open];
      el.setAttribute("aria-valuenow", size);
      el.setAttribute("aria-valuemin", min);
      el.setAttribute("aria-valuemax", max);
    }
  }

  function endDrag(sash) {
    document.body.classList.remove(`is-resizing-${sash.axis}`);
    if (!(sash.key in live)) return;
    cancelAnimationFrame(frame);
    frame = 0;
    layout();
    live = {};
    app.store.set({ [sash.key]: fitted[sash.key].size });
  }

  function createSash(sash) {
    let drag = null;
    const point = (e) => (sash.axis === "x" ? e.clientX : e.clientY);
    const el = h("div", {
      class: `sash sash-${sash.axis}`,
      role: "separator",
      tabindex: 0,
      "aria-orientation": sash.axis === "x" ? "vertical" : "horizontal",
      "aria-label": sash.label,
      "aria-controls": sash.target,
      onpointerdown: (e) => {
        if (!e.isPrimary || e.button !== 0) return;
        e.preventDefault();
        drag = { origin: point(e), start: fitted[sash.key].size };
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
        document.body.classList.add(`is-resizing-${sash.axis}`);
      },
      onpointermove: (e) => {
        if (!drag) return;
        live = { [sash.key]: drag.start + (point(e) - drag.origin) * sash.sign };
        frame ||= requestAnimationFrame(() => {
          frame = 0;
          layout();
        });
      },
      // Capture is released after pointerup and pointercancel alike.
      onlostpointercapture: () => {
        if (!drag) return;
        drag = null;
        el.classList.remove("is-dragging");
        endDrag(sash);
      },
      ondblclick: () => app.store.set({ [sash.key]: null }),
      onkeydown: (e) => {
        const size = keySize(e, sash, fitted[sash.key]);
        if (size === null) return;
        e.preventDefault();
        app.store.set({ [sash.key]: size });
      },
    });
    return el;
  }

  const sashes = SASHES.map((sash) => ({ ...sash, el: createSash(sash) }));
  for (const { target, place, el } of sashes) workbench.querySelector(`#${target}`)[place](el);

  // The workbench only changes size with the window, so this re-clamps on resize.
  new ResizeObserver(([entry]) => {
    box = { width: entry.contentRect.width, height: entry.contentRect.height };
    layout();
  }).observe(workbench);
  app.store.subscribe((state, prev) => WATCHED.some((k) => state[k] !== prev[k]) && layout());
  layout();
}
