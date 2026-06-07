// Vitest global setup.
//
// Node 22+ exposes an experimental global `localStorage` that throws unless the
// process is started with `--localstorage-file`. Under the jsdom environment it
// shadows jsdom's own implementation, so any code touching `window.localStorage`
// (the whole storage layer in utils.js) blows up in tests. Install a small,
// deterministic in-memory store on both `window` and `globalThis` so storage
// behaves like a real browser without relying on Node flags.

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key) {
    const k = String(key);
    return this.store.has(k) ? this.store.get(k) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const storage = new MemoryStorage();
const descriptor = { value: storage, configurable: true, writable: false };

Object.defineProperty(globalThis, "localStorage", descriptor);
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", descriptor);
}
