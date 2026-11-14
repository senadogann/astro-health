// Tiny i18n helper. All UI strings live in data/i18n.json (flat keys per language).
let dict = { en: {} };
let lang = 'en';

export async function loadI18n() {
  dict = await (await fetch('data/i18n.json')).json();
}

export function setLang(l) {
  lang = dict[l] ? l : 'en';
  document.documentElement.lang = lang;
}

export function getLang() { return lang; }

export function t(key, vars) {
  let s = (dict[lang] && dict[lang][key]) ?? dict.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// Pick the current language from a { en, tr } content object.
export function L(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string' || Array.isArray(obj)) return obj;
  return obj[lang] ?? obj.en ?? '';
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

export function fmt(n, digits = 0) {
  if (n == null || !Number.isFinite(Number(n))) return '–';
  return Number(n).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
