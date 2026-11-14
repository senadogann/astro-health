import { loadI18n, setLang, t, L, applyI18n, esc, fmt } from './i18n.js';
import { state, loadState, setState, subscribe, saveEntry } from './store.js';
import { renderCheckin } from './checkin.js';
import { evaluate, evalMetric, computeBaseline, worst, SYSTEM_ORDER } from './rules.js';
import { demoEntries, DEMO_NAME, SCENARIOS } from './demo.js';
import { valueText, reasonText, driverLabel, delayText } from './ui.js';
import { renderPanel } from './panel.js';
import { loadSpaceWeather, renderSpaceWeather } from './spaceweather.js';

const $ = (sel) => document.querySelector(sel);
const ENVS = ['iss', 'orion', 'moon', 'marsTransit', 'mars'];

let view = 'dashboard';
let selected = null; // selected body system id
let refs, content, sources;
let i4 = null;         // Inspiration4 blood values (real NASA data)
let spaceWx = null;    // latest space weather (live, cached or snapshot)
let body = null; // 3D figure (js/body.js); stays null if WebGL is unavailable

const getJSON = (url) => fetch(url).then((r) => r.json());

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2200);
}

const isDemo = () => state.mode === 'demo';
const currentEnv = () => refs.environments[state.env] || refs.environments.iss;

function currentEntries() {
  return isDemo() ? demoEntries(state.scenario, currentEnv().doseRate) : state.entries;
}

function selectSystem(id) {
  selected = id;
  render();
  if (id && window.matchMedia('(max-width: 899px)').matches) {
    $('#organPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ---------- check-in ---------- */

function renderCheckinView() {
  const baseline = computeBaseline(state.entries, refs);
  renderCheckin($('#checkin'), {
    refs, content, entries: state.entries,
    evalFn(key, value) {
      const r = evalMetric(key, value, refs, baseline);
      return { status: r.status, text: reasonText(r, refs) };
    },
    onSave(entry) {
      saveEntry(entry);
      toast(t('checkin.saved'));
      setView('dashboard');
    },
  });
}

/* ---------- dashboard ---------- */

function dataBadge(key) {
  if (key === 'radiation' || key === 'bone') return `<span class="badge">${t('label.nasa')}</span>`;
  return isDemo() ? `<span class="badge sim">${t('badge.sim')}</span>` : `<span class="badge self">${t('badge.self')}</span>`;
}

function metricCard({ title, system, parts, value, extra, badgeKey, foot }) {
  const top = parts.reduce((a, b) => (worst(a.status, b.status) === a.status ? a : b));
  return `
    <button type="button" class="mcard ${top.status}" data-system="${system}">
      <span class="top"><span>${esc(title)}</span>${dataBadge(badgeKey)}</span>
      <span class="val">${value}${extra ? ` <small>${esc(extra)}</small>` : ''}</span>
      <span class="why">${esc(reasonText(top, refs))}</span>
      ${foot ? `<span class="foot">${foot}</span>` : ''}
      <span class="top"><span><span class="dot ${top.status}" style="display:inline-block;vertical-align:middle"></span> ${t('status.' + top.status)}</span><span>${esc(driverLabel(top))}</span></span>
    </button>`;
}

function renderOverview(res) {
  const el = $('#overview');
  if (res.empty) {
    el.innerHTML = `
      <div class="card empty">
        <h2>${t('empty.title')}</h2>
        <p>${t('empty.body')}</p>
        <button type="button" class="btn primary" data-act="checkin">${t('empty.cta')}</button>
        <button type="button" class="btn" data-act="demo">${t('empty.demo')}</button>
      </div>`;
    return;
  }
  const m = res.metrics;
  const name = (key) => L(content.metrics[key].name);
  const cards = [];
  if (m.hr) cards.push(metricCard({ title: name('hr'), system: 'cardio', parts: [m.hr], value: esc(valueText(m.hr, refs)), badgeKey: 'hr' }));
  if (m.sys && m.dia) cards.push(metricCard({ title: t('card.bp'), system: 'cardio', parts: [m.sys, m.dia], value: `${m.sys.value}/${m.dia.value}`, extra: 'mmHg', badgeKey: 'sys' }));
  if (m.temp) cards.push(metricCard({ title: name('temp'), system: 'lungs', parts: [m.temp], value: esc(valueText(m.temp, refs)), badgeKey: 'temp' }));
  if (m.glucose) cards.push(metricCard({ title: name('glucose'), system: 'blood', parts: [m.glucose], value: esc(valueText(m.glucose, refs)), badgeKey: 'glucose',
    foot: i4 ? `${t('i4.card', { v: Math.round(i4.analytes.glucose.preflightMean) })} · ${t('badge.real')}` : '' }));
  if (m.sleepH && m.sleepQ) cards.push(metricCard({ title: t('card.sleep'), system: 'brain', parts: [m.sleepH, m.sleepQ], value: esc(valueText(m.sleepH, refs)), extra: t('card.sleepQ', { q: m.sleepQ.value }), badgeKey: 'sleepH' }));
  if (m.mood) cards.push(metricCard({ title: name('mood'), system: 'brain', parts: [m.mood], value: esc(valueText(m.mood, refs)), badgeKey: 'mood' }));
  if (m.vision) cards.push(metricCard({ title: name('vision'), system: 'eyes', parts: [m.vision], value: `<span style="font-size:1.3rem">${esc(valueText(m.vision, refs))}</span>`, badgeKey: 'vision' }));
  cards.push(metricCard({ title: name('radiation'), system: 'blood', parts: [m.radiation], value: esc(valueText(m.radiation, refs)), badgeKey: 'radiation' }));
  cards.push(metricCard({ title: name('bone'), system: 'bones', parts: [m.bone], value: esc(valueText(m.bone, refs)), badgeKey: 'bone' }));

  const b = res.baseline;
  el.innerHTML = `
    <div class="summary">
      <span class="pill ${res.overall}"><span class="dot ${res.overall}"></span>${t('overall.' + res.overall)}</span>
      <h2>${isDemo() ? esc(DEMO_NAME) : t('mode.mine')}</h2>
      <span class="badge">${t('mission.day', { n: res.day })}</span>
    </div>
    <div class="cards">${cards.join('')}</div>
    <p class="infoline">${b.ready ? t('baseline.ready', { n: b.days }) : t('baseline.building', { n: b.n, need: b.need })}</p>
    <p class="infoline">${t('panel.fine')}</p>`;
}

function renderChips(res) {
  $('#systemChips').innerHTML = SYSTEM_ORDER.map((id) => {
    const status = res.empty ? '' : res.systems[id].status;
    return `<button type="button" class="chip${selected === id ? ' active' : ''}" data-system="${id}">
      <span class="dot ${status}"></span><span>${esc(L(content.systems[id].name))}</span></button>`;
  }).join('');
}

function renderDashboard() {
  const entries = currentEntries();
  const res = evaluate(entries, state.env, refs);
  renderEnvStrip();
  renderDemoBar();
  renderAlerts(res);
  renderSpaceWeather($('#spaceWeather'), spaceWx);
  renderDoseCard(res);
  renderOverview(res);
  renderChips(res);
  // On wide screens the panel replaces the cards; "close" brings them back.
  $('#overview').hidden = !!selected;
  renderPanel($('#organPanel'), {
    id: selected, res, entries, refs, content, sources, envKey: state.env, badge: dataBadge('hr'), i4,
  });
  if (body) {
    body.setStatuses(res.empty ? {} : Object.fromEntries(SYSTEM_ORDER.map((id) => [id, res.systems[id].status])));
    body.setSelected(selected);
  }
}

// The figure is loaded separately so the app still works without WebGL.
async function initBody() {
  try {
    const { createBody } = await import('./body.js');
    body = createBody($('#bodyStage'), { onSelect: selectSystem });
    renderDashboard();
  } catch (e) {
    $('#bodyStage').innerHTML = '<div class="fallback" data-i18n="body.fallback"></div>';
    $('#bodyHint').hidden = true;
    applyI18n($('#bodyStage'));
  }
}

/* ---------- demo mode ---------- */

function renderDemoBar() {
  const seg = (mode, label) => `<button type="button" data-mode="${mode}" class="${state.mode === mode ? 'active' : ''}">${esc(label)}</button>`;
  const scen = (id) => `<button type="button" class="btn${id ? ' warn' : ''}${(state.scenario || '') === id ? ' active' : ''}" data-scenario="${id}">${t('scenario.' + (id || 'none'))}</button>`;
  $('#demoBar').innerHTML = `
    <span class="label">${t('mode.label')}</span>
    <div class="seg">${seg('demo', t('mode.demo', { name: DEMO_NAME }))}${seg('mine', t('mode.mine'))}</div>
    ${isDemo() ? `<span class="label">${t('scenario.label')}</span>${[''].concat(SCENARIOS).map(scen).join('')}
      <span class="badge sim">${t('badge.sim')}</span>` : `<span class="badge self">${t('badge.self')}</span>`}`;
}

/* ---------- environment ---------- */

// The environment changes the communication delay, the radiation dose rate and the advice texts.
function renderEnvStrip() {
  const env = currentEnv();
  const src = sources[env.source];
  $('#envStrip').innerHTML = `
    <span>📡 ${t('env.delay')}: <b>${esc(delayText(env))}</b></span>
    <span>☢ ${t('env.dose')}: <b>${esc(env.doseRange)} ${t('env.perDay')}</b>
      ${src && src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener" title="${esc(src.title)}">↗</a>` : ''}</span>
    <span class="note">${t('env.note.' + state.env)}</span>`;
}

// Cumulative mission dose against the NASA career limit (600 mSv).
function renderDoseCard(res) {
  const el = $('#doseCard');
  if (res.empty) { el.innerHTML = ''; return; }
  const r = res.metrics.radiation;
  const limit = refs.radiation.careerLimit_mSv;
  const src = sources[refs.radiation.careerSource];
  const daysLeft = Math.max(0, Math.round((limit - r.cumulative) / r.rate));
  el.innerHTML = `
    <button type="button" class="card dosecard ${r.status}" data-system="blood" style="width:100%;text-align:left">
      <div class="chead"><h3>${t('dose.title')}</h3><span class="badge">${t('label.nasa')}</span>${isDemo() ? `<span class="badge sim">${t('badge.sim')}</span>` : ''}</div>
      <div class="big">${fmt(r.cumulative, 1)} <small>mSv ${t('dose.of', { limit })} · ${fmt(r.pct, 1)}%</small></div>
      <div class="bar"><i class="${r.status}" style="width:${Math.min(100, r.pct).toFixed(1)}%"></i></div>
      <div class="why">${t('dose.rate', { env: t('env.' + state.env), rate: fmt(r.rate, 2) })}. ${t('dose.left', { days: fmt(daysLeft) })}</div>
      <div class="why">${r.event ? t('dose.spe') : t('dose.model')}</div>
      <div class="fine">${esc(src.title)}</div>
    </button>`;
}

function liveAlertHtml() {
  if (!spaceWx || spaceWx.mode !== 'live' || spaceWx.status !== 'red') return '';
  return `
    <div class="alert pulse" role="alert">
      <span class="ico">☢</span>
      <div>
        <h3>${t('alert.live.title', { s: spaceWx.level })} <span class="badge real">${t('badge.real')}</span></h3>
        <p>${t('alert.live.body', { flux: fmt(spaceWx.flux, 1), delay: esc(delayText(currentEnv())) })}</p>
      </div>
    </div>`;
}

function renderAlerts(res) {
  $('#alerts').innerHTML = liveAlertHtml() + (!res.empty && res.shelter ? `
    <div class="alert pulse" role="alert">
      <span class="ico">☢</span>
      <div>
        <h3>${t('alert.spe.title')} <span class="badge sim">${t('badge.sim')}</span></h3>
        <p>${t('alert.spe.body', { delay: esc(delayText(currentEnv())) })}</p>
        <button type="button" class="btn" style="margin-top:10px" data-system="blood">${esc(L(content.systems.blood.name))} →</button>
      </div>
    </div>` : '');
}

async function refreshSpaceWeather() {
  spaceWx = await loadSpaceWeather();
  render();
}

/* ---------- chrome ---------- */

function renderChrome() {
  applyI18n();
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('active', b.dataset.lang === state.lang));
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#envSelect').innerHTML = ENVS.map((e) => `<option value="${e}"${e === state.env ? ' selected' : ''}>${t('env.' + e)}</option>`).join('');
  $('#view-dashboard').hidden = view !== 'dashboard';
  $('#view-checkin').hidden = view !== 'checkin';
}

function render() {
  setLang(state.lang);
  renderChrome();
  renderDashboard();
  if (view === 'checkin') renderCheckinView();
}

function setView(v) {
  view = v;
  render();
  window.scrollTo(0, 0);
}

async function boot() {
  loadState();
  [, refs, content, sources] = await Promise.all([
    loadI18n(), getJSON('data/references.json'), getJSON('data/content.json'), getJSON('data/sources.json'),
  ]);

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setState({ lang: b.dataset.lang })));
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#envSelect').addEventListener('change', (e) => setState({ env: e.target.value }));

  // One click handler for everything rendered inside the dashboard.
  $('#view-dashboard').addEventListener('click', (e) => {
    const sys = e.target.closest('[data-system]');
    if (sys) return selectSystem(sys.dataset.system);
    const mode = e.target.closest('[data-mode]');
    if (mode) return setState({ mode: mode.dataset.mode });
    const scen = e.target.closest('[data-scenario]');
    if (scen) return setState({ scenario: scen.dataset.scenario || null });
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'close') selectSystem(null);
    if (act.dataset.act === 'checkin') setView('checkin');
    if (act.dataset.act === 'demo') setState({ mode: 'demo' });
  });

  subscribe(render);
  render();
  initBody();

  // Real NASA data. Both are optional: the app works without them.
  getJSON('data/i4_blood.json').then((d) => { i4 = d; render(); }).catch(() => {});
  refreshSpaceWeather();
  setInterval(refreshSpaceWeather, 5 * 60 * 1000);
  window.addEventListener('online', refreshSpaceWeather);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
