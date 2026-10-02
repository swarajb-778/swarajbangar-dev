export function createStore(initial, { storage, key, persist = [] } = {}) {
  const canPersist = Boolean(storage && key && persist.length);
  let state = { ...initial, ...load() };
  const listeners = new Set();

  function load() {
    if (!canPersist) return {};
    try {
      const saved = JSON.parse(storage.getItem(key) ?? "{}");
      return Object.fromEntries(persist.filter((k) => k in saved).map((k) => [k, saved[k]]));
    } catch {
      return {};
    }
  }

  function save() {
    if (!canPersist) return;
    try {
      storage.setItem(key, JSON.stringify(Object.fromEntries(persist.map((k) => [k, state[k]]))));
    } catch {
      // Private browsing or a full quota: keep working without persistence.
    }
  }

  return {
    get: () => state,
    set(update) {
      const patch = typeof update === "function" ? update(state) : update;
      if (Object.keys(patch).every((k) => Object.is(state[k], patch[k]))) return;
      const prev = state;
      state = { ...state, ...patch };
      save();
      listeners.forEach((listener) => listener(state, prev));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
