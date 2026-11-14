// App state in a local-first demo database (IndexedDB, with localStorage fallback).
import { readSnapshot, writeSnapshot } from './database.js';
const KEY = 'astroself.v1';

export const state = {
  lang: 'en',
  env: 'iss',
  mode: 'demo',     // 'demo' = simulated astronaut, 'mine' = self-entered check-ins
  scenario: null,   // demo scenario: null | 'spe' | 'sleep' | 'fluid'
  entries: [],      // self-entered daily check-ins, sorted by date
  tasks: {},        // last done date of weekly / monthly routine tasks
  model: 'detailed', // 3D figure: 'detailed' (anatomy models) or 'simple' (light fallback)
};

const subs = new Set();
let persistQueue = Promise.resolve();

export async function loadState() {
  let saved = await readSnapshot();
  if (!saved) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        saved = JSON.parse(raw);
        // One-time migration: preserve existing check-ins and preferences.
        writeSnapshot(saved);
      }
    } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
  }
  if (saved && typeof saved === 'object') Object.assign(state, saved);
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!state.tasks || typeof state.tasks !== 'object') state.tasks = {};
}

export function setState(patch) {
  Object.assign(state, patch);
  const snapshot = { ...state, entries: [...state.entries], tasks: { ...state.tasks } };
  persistQueue = persistQueue.then(() => writeSnapshot(snapshot)).catch(() => {});
  subs.forEach((fn) => fn(state));
}

export function subscribe(fn) { subs.add(fn); }

export function saveEntry(entry) {
  const list = state.entries.filter((e) => e.date !== entry.date);
  list.push(entry);
  list.sort((a, b) => (a.date < b.date ? -1 : 1));
  setState({ entries: list, mode: 'mine' });
}

// Local date as YYYY-MM-DD.
export function dateStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
