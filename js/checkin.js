// Daily check-in form. Renders into `root` and calls onSave(entry) with a validated entry.
import { t, L, esc } from './i18n.js';
import { dateStr } from './store.js';

const NUMERIC = ['hr', 'sys', 'dia', 'temp', 'glucose', 'sleepH'];
const MOOD_FACES = ['😞', '🙁', '😐', '🙂', '😄'];

let vals = null; // values being edited; survives re-renders (language switch etc.)

export function renderCheckin(root, { refs, content, entries, evalFn, onSave }) {
  const M = refs.metrics;
  if (!vals) vals = load(dateStr());

  function load(date) {
    const existing = entries.find((e) => e.date === date);
    return existing ? { ...existing } : { date, vision: 0 };
  }

  const how = (key) => {
    const text = L(content.metrics[key].how);
    return text ? `<details><summary>${t('checkin.how')}</summary><p>${esc(text)}</p></details>` : '';
  };
  const label = (key) => `<div class="flabel"><span>${esc(L(content.metrics[key].name))}</span><small>${esc(M[key]?.unit || '')}${key === 'exercise' ? ' · ' + t('checkin.optional') : ''}</small></div>`;
  const stepper = (key, aria) => `
    <button type="button" data-step="-1" data-key="${key}" aria-label="−">−</button>
    <input type="number" inputmode="decimal" data-key="${key}" aria-label="${esc(aria)}"
      min="${M[key].min}" max="${M[key].max}" step="${M[key].step}" placeholder="${M[key].start}" value="${vals[key] ?? ''}">
    <button type="button" data-step="1" data-key="${key}" aria-label="+">+</button>`;
  const numField = (key) => `
    <div class="field" data-field="${key}">
      ${label(key)}
      <div class="stepper">${stepper(key, L(content.metrics[key].name))}</div>
      <div class="live" data-live="${key}"></div>
      ${how(key)}
    </div>`;
  const scale = (key, n, from, text) => `
    <div class="scale">${Array.from({ length: n }, (_, i) => {
      const v = i + from;
      return `<button type="button" data-scale="${key}" data-v="${v}" class="${vals[key] === v ? 'active' : ''}">${text(v)}</button>`;
    }).join('')}</div>`;

  root.innerHTML = `
    <form class="checkin" novalidate>
      <h2>${t('checkin.title')}</h2>
      <p class="intro">${t('checkin.intro')}</p>
      <div class="fields">
        <div class="field wide">
          <div class="flabel"><span>${t('checkin.date')}</span></div>
          <input type="date" id="ciDate" value="${vals.date}" max="${dateStr()}">
        </div>
        ${numField('hr')}
        <div class="field" data-field="bp">
          <div class="flabel"><span>${esc(L(content.metrics.bp.name))}</span><small>${t('checkin.sys')} / ${t('checkin.dia')} · mmHg</small></div>
          <div class="stepper">${stepper('sys', t('checkin.sys'))}</div>
          <div class="stepper" style="margin-top:8px">${stepper('dia', t('checkin.dia'))}</div>
          <div class="live" data-live="bp"></div>
          ${how('bp')}
        </div>
        ${numField('temp')}
        ${numField('glucose')}
        ${numField('sleepH')}
        ${numField('exercise')}
        <div class="field" data-field="sleepQ">
          ${label('sleepQ')}
          ${scale('sleepQ', 7, 1, (v) => v)}
          <div class="scaleends"><span>${t('checkin.sleepQ.lo')}</span><span>${t('checkin.sleepQ.hi')}</span></div>
          <div class="live" data-live="sleepQ"></div>
          ${how('sleepQ')}
        </div>
        <div class="field" data-field="mood">
          ${label('mood')}
          ${scale('mood', 5, 1, (v) => `${MOOD_FACES[v - 1]}<small>${t('mood.' + v)}</small>`)}
          <div class="live" data-live="mood"></div>
          ${how('mood')}
        </div>
        <div class="field" data-field="vision">
          ${label('vision')}
          ${scale('vision', 3, 0, (v) => `<small style="font-size:.9rem">${t('vision.' + v)}</small>`)}
          <div class="live" data-live="vision"></div>
          ${how('vision')}
        </div>
      </div>
      <div class="actions">
        <button type="submit" class="btn primary">${t('checkin.save')}</button>
        <span class="formerr" id="ciErr"></span>
      </div>
    </form>`;

  const form = root.querySelector('form');
  const input = (key) => form.querySelector(`input[data-key="${key}"]`);

  function live(key) {
    if (!evalFn || key === 'exercise') return;
    const fieldKey = key === 'sys' || key === 'dia' ? 'bp' : key;
    const field = form.querySelector(`[data-field="${fieldKey}"]`);
    const keys = fieldKey === 'bp' ? ['sys', 'dia'] : [key];
    const results = keys.filter((k) => Number.isFinite(vals[k])).map((k) => evalFn(k, vals[k]));
    field.classList.remove('green', 'yellow', 'red');
    const out = form.querySelector(`[data-live="${fieldKey}"]`);
    if (!results.length) { out.textContent = ''; return; }
    const rank = { green: 0, yellow: 1, red: 2 };
    const top = results.reduce((a, b) => (rank[b.status] > rank[a.status] ? b : a));
    field.classList.add(top.status);
    out.textContent = `${t('status.' + top.status)} · ${top.text}`;
  }

  function setNum(key, raw) {
    const n = raw === '' ? NaN : Number(raw);
    if (Number.isFinite(n)) vals[key] = n; else delete vals[key];
    live(key);
  }

  form.addEventListener('input', (e) => {
    const key = e.target.dataset.key;
    if (key) setNum(key, e.target.value);
  });

  form.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      const key = stepBtn.dataset.key;
      const m = M[key];
      const cur = Number.isFinite(vals[key]) ? vals[key] + m.step * Number(stepBtn.dataset.step) : m.start;
      const next = Number(Math.min(m.max, Math.max(m.min, cur)).toFixed(m.digits));
      input(key).value = next;
      setNum(key, String(next));
      return;
    }
    const scaleBtn = e.target.closest('[data-scale]');
    if (scaleBtn) {
      const key = scaleBtn.dataset.scale;
      vals[key] = Number(scaleBtn.dataset.v);
      form.querySelectorAll(`[data-scale="${key}"]`).forEach((b) => b.classList.toggle('active', b === scaleBtn));
      live(key);
    }
  });

  form.querySelector('#ciDate').addEventListener('change', (e) => {
    if (!e.target.value) return;
    vals = load(e.target.value);
    renderCheckin(root, { refs, content, entries, evalFn, onSave });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const okNum = NUMERIC.every((k) => Number.isFinite(vals[k]) && vals[k] >= M[k].min && vals[k] <= M[k].max);
    const okScale = Number.isFinite(vals.sleepQ) && Number.isFinite(vals.mood);
    if (!okNum || !okScale) {
      form.querySelector('#ciErr').textContent = t('checkin.invalid');
      return;
    }
    const entry = { date: vals.date, vision: vals.vision || 0, sleepQ: vals.sleepQ, mood: vals.mood };
    NUMERIC.forEach((k) => { entry[k] = vals[k]; });
    if (Number.isFinite(vals.exercise) && vals.exercise >= 0 && vals.exercise <= M.exercise.max) entry.exercise = vals.exercise; // optional
    vals = null;
    onSave(entry);
  });

  [...NUMERIC, 'sleepQ', 'mood', 'vision'].forEach(live);
}
