// App state, kept in localStorage (no backend, no login).
const KEY = 'astroself.v1';

export const state = {
  lang: 'en',
  env: 'iss',
  mode: 'demo',     // 'demo' = simulated astronaut, 'mine' = self-entered check-ins
  scenario: null,   // demo scenario: null | 'spe' | 'sleep' | 'fluid'
  entries: [],      // self-entered daily check-ins, sorted by date
  tasks: {},        // last done date of weekly / monthly routine tasks
};

const subs = new Set();

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!state.tasks || typeof state.tasks !== 'object') state.tasks = {};
}

export function setState(patch) {
  Object.assign(state, patch);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
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
