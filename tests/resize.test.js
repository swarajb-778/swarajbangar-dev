import { test } from "node:test";
import assert from "node:assert/strict";
import { fitPanels, keySize } from "../src/lib/resize.js";

const DEFAULTS = { sidebarW: 264, chatW: 330, panelH: 250 };
const roomy = { width: 1440, height: 860, sidebarOpen: true, chatOpen: true };

test("fitPanels keeps sizes that fit and reports the limits it used", () => {
  assert.deepEqual(fitPanels(DEFAULTS, roomy), {
    sidebarW: { size: 264, min: 170, max: 600 },
    chatW: { size: 330, min: 260, max: 600 },
    panelH: { size: 250, min: 100, max: 602 },
  });
});

test("fitPanels clamps to each panel's minimum and maximum", () => {
  const small = fitPanels({ sidebarW: 20, chatW: 20, panelH: 20 }, roomy);
  assert.deepEqual([small.sidebarW.size, small.chatW.size, small.panelH.size], [170, 260, 100]);
  const big = fitPanels({ sidebarW: 9999, chatW: 9999, panelH: 9999 }, { ...roomy, width: 1000, chatOpen: false });
  assert.equal(big.sidebarW.size, 500, "half the viewport");
  assert.equal(big.panelH.size, 602, "70% of the editor group");
});

test("fitPanels never lets the sidebar and chat crowd out the editor", () => {
  for (const width of [901, 1024, 1280, 1920]) {
    const { sidebarW, chatW } = fitPanels({ sidebarW: 9999, chatW: 9999, panelH: 250 }, { ...roomy, width });
    assert.ok(sidebarW.size + chatW.size + 250 <= width, `overflows at ${width}px`);
    assert.ok(sidebarW.size >= 170 && chatW.size >= 260, `squeezed below a minimum at ${width}px`);
  }
  const chatOnly = fitPanels({ ...DEFAULTS, chatW: 9999 }, { ...roomy, width: 1000, sidebarOpen: false });
  assert.equal(chatOnly.chatW.size, 600);
});

test("fitPanels lets the upper bound win when there is no room for the minimum", () => {
  assert.deepEqual(fitPanels(DEFAULTS, { ...roomy, height: 100 }).panelH, { size: 70, min: 70, max: 70 });
});

test("keySize steps 10px, or 50px with Shift, in the direction the sash grows", () => {
  const limits = { size: 300, min: 170, max: 600 };
  const sidebar = { axis: "x", sign: 1 };
  const chat = { axis: "x", sign: -1 };
  const panel = { axis: "y", sign: -1 };
  assert.equal(keySize({ key: "ArrowRight" }, sidebar, limits), 310);
  assert.equal(keySize({ key: "ArrowLeft", shiftKey: true }, sidebar, limits), 250);
  assert.equal(keySize({ key: "ArrowLeft" }, chat, limits), 310);
  assert.equal(keySize({ key: "ArrowUp" }, panel, limits), 310);
  assert.equal(keySize({ key: "ArrowDown" }, panel, limits), 290);
});

test("keySize jumps with Home/End, clamps, and ignores other keys", () => {
  const sidebar = { axis: "x", sign: 1 };
  assert.equal(keySize({ key: "Home" }, sidebar, { size: 300, min: 170, max: 600 }), 170);
  assert.equal(keySize({ key: "End" }, sidebar, { size: 300, min: 170, max: 600 }), 600);
  assert.equal(keySize({ key: "ArrowRight", shiftKey: true }, sidebar, { size: 580, min: 170, max: 600 }), 600);
  assert.equal(keySize({ key: "ArrowUp" }, sidebar, { size: 300, min: 170, max: 600 }), null);
  assert.equal(keySize({ key: "a" }, sidebar, { size: 300, min: 170, max: 600 }), null);
});
