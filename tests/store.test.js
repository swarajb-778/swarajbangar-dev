import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/lib/store.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    data,
  };
}

test("set merges patches and notifies subscribers with the previous state", () => {
  const store = createStore({ a: 1, b: 2 });
  const calls = [];
  store.subscribe((state, prev) => calls.push([state, prev]));
  store.set({ a: 3 });
  assert.deepEqual(store.get(), { a: 3, b: 2 });
  assert.deepEqual(calls, [[{ a: 3, b: 2 }, { a: 1, b: 2 }]]);
});

test("set accepts an updater function", () => {
  const store = createStore({ n: 1 });
  store.set((s) => ({ n: s.n + 1 }));
  assert.equal(store.get().n, 2);
});

test("set skips notification when nothing changed", () => {
  const store = createStore({ a: 1 });
  let count = 0;
  store.subscribe(() => count++);
  store.set({ a: 1 });
  assert.equal(count, 0);
});

test("unsubscribe stops notifications", () => {
  const store = createStore({ a: 1 });
  let count = 0;
  const off = store.subscribe(() => count++);
  off();
  store.set({ a: 2 });
  assert.equal(count, 0);
});

test("persists only the chosen keys and restores them on creation", () => {
  const storage = memoryStorage();
  const store = createStore({ theme: "dark", tabs: [] }, { storage, key: "k", persist: ["theme"] });
  store.set({ theme: "light", tabs: ["x"] });
  assert.deepEqual(JSON.parse(storage.data.k), { theme: "light" });
  const restored = createStore({ theme: "dark", tabs: [] }, { storage, key: "k", persist: ["theme"] });
  assert.deepEqual(restored.get(), { theme: "light", tabs: [] });
});

test("ignores corrupt persisted data", () => {
  const storage = memoryStorage({ k: "{not json" });
  const store = createStore({ theme: "dark" }, { storage, key: "k", persist: ["theme"] });
  assert.equal(store.get().theme, "dark");
});
