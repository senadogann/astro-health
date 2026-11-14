import { loadI18n, setLang, t, L, applyI18n, esc, fmt } from './i18n.js';
import { state, loadState, setState, subscribe, saveEntry, dateStr } from './store.js';
import { renderCheckin } from './checkin.js';
import { evaluate, evalMetric, computeBaseline, worst, SYSTEM_ORDER, lowStreak, applyPersistence } from './rules.js';
import { demoEntries, DEMO_NAME, SCENARIOS } from './demo.js';
import { valueText, reasonText, statusText, delayText } from './ui.js';
import { renderPanel } from './panel.js';
import { loadSpaceWeather, renderSpaceWeather } from './spaceweather.js';
import { initEmergency, openEmergency, renderEmergency } from './emergency.js';
import { computeOutlook, renderOutlook, riskDrivers } from './outlook.js';
import { computeRoutine, renderRoutine } from './routine.js';
import { renderReport } from './report.js';

const $ = (sel) => document.querySelector(sel);
const ENVS = ['iss', 'orion', 'moon', 'marsTransit', 'mars'];
const VIEWS = ['dashboard', 'checkin', 'outlook', 'report', 'mission'];

let view = 'dashboard';
let selected = null;      // selected body system id
let selectedName = '';    // anatomical structure that was tapped on the detailed model
let horizon = 'today';    // what the 3D figure shows: 'today' or '30' (projected)
let refs, content, sources;
let i4 = null;            // Inspiration4 blood values (real NASA data)
let spaceWx = null;       // latest space weather (live, cached or snapshot)
let lastRes = null;       // latest assessment, used by the emergency report
let body = null;          // 3D figure: js/body3d.js (detailed) or js/body.js (simple); null without WebGL
let loading = {};         // layer id -> load ratio, while model files download
let slow = false;         // the detailed model runs slowly on this device

const getJSON = (url) => fetch(url).then((r) => r.json());

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2200);
}

// Explanations live behind a small "i" button so the screen stays clean.
const info = (html) => `<details class="info"><summary aria-label="info">i</summary><div class="bubble">${html}</div></details>`;

const isDemo = () => state.mode === 'demo';
const currentEnv = () => refs.environments[state.env] || refs.environments.iss;

function currentEntries() {
  return isDemo() ? demoEntries(state.scenario, currentEnv().doseRate) : state.entries;
}

function selectSystem(id, name) {
  selected = id;
  selectedName = id ? name || '' : '';
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
      const rule = refs.metrics[key].persist;
      const earlier = state.entries.filter((e) => e.date < dateStr());
      const r = applyPersistence(evalMetric(key, value, refs, baseline), rule ? lowStreak(earlier, key, rule.at) : 0, refs);
      return { status: r.status, label: statusText(r), text: reasonText(r, refs) };
    },
    onSave(entry) {
      saveEntry(entry);
      toast(t('checkin.saved'));
      setView('dashboard');
    },
  });
}

/* ---------- dashboard: six indicator cards ---------- */

const dataBadge = () => (isDemo()
  ? `<span class="badge sim">${t('badge.sim')}</span>`
  : `<span class="badge self">${t('badge.self')}</span>`);

function metricCard({ title, system, parts, value, extra, foot }) {
  const top = parts.reduce((a, b) => (worst(a.status, b.status) === a.status ? a : b));
  return `
    <button type="button" class="mcard ${top.status}" data-system="${system}">
      <span class="top"><span>${esc(title)}</span></span>
      <span class="val">${value}${extra ? ` <small>${esc(extra)}</small>` : ''}</span>
      <span class="why">${esc(reasonText(top, refs))}</span>
      ${foot ? `<span class="foot">${foot}</span>` : ''}
      <span class="top"><span><span class="dot ${top.status}" style="display:inline-block;vertical-align:middle"></span> ${statusText(top)}</span></span>
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
  if (m.hr) cards.push(metricCard({ title: name('hr'), system: 'cardio', parts: [m.hr], value: esc(valueText(m.hr, refs)) }));
  if (m.sys && m.dia) cards.push(metricCard({ title: t('card.bp'), system: 'cardio', parts: [m.sys, m.dia], value: `${m.sys.value}/${m.dia.value}`, extra: 'mmHg' }));
  if (m.temp) cards.push(metricCard({ title: name('temp'), system: 'lungs', parts: [m.temp], value: esc(valueText(m.temp, refs)) }));
  if (m.glucose) cards.push(metricCard({ title: name('glucose'), system: 'blood', parts: [m.glucose], value: esc(valueText(m.glucose, refs)),
    foot: i4 ? `<span class="badge real">${t('badge.real')}</span> ${t('i4.card', { v: Math.round(i4.analytes.glucose.preflightMean) })}` : '' }));
  if (m.sleepH && m.sleepQ) cards.push(metricCard({ title: t('card.sleep'), system: 'brain', parts: [m.sleepH, m.sleepQ], value: esc(valueText(m.sleepH, refs)), extra: t('card.sleepQ', { q: m.sleepQ.value }) }));
  if (m.mood) cards.push(metricCard({ title: name('mood'), system: 'brain', parts: [m.mood], value: esc(valueText(m.mood, refs)) }));

  const env = currentEnv();
  const b = res.baseline;
  const details = [
    b.ready ? t('baseline.ready', { n: b.days }) : t('baseline.building', { n: b.n, need: b.need }),
    `${t('env.' + state.env)}: ${t('env.note.' + state.env)}`,
    `${t('env.dose')}: ${esc(env.doseRange)} ${t('env.perDay')}`,
    t('panel.fine'),
  ].map((x) => `<p>${x}</p>`).join('');

  el.innerHTML = `
    <div class="summary">
      <span class="pill ${res.overall}"><span class="dot ${res.overall}"></span>${t('overall.' + res.overall)}</span>
      <h2>${isDemo() ? esc(DEMO_NAME) : t('mode.mine')}</h2>
      ${dataBadge()}
      <span class="badge">${t('mission.day', { n: res.day })}</span>
      <span class="badge" title="${t('env.delay')}">📡 ${esc(delayText(env))}</span>
      ${info(details)}
    </div>
    <div class="cards six">${cards.join('')}</div>`;
}

/* ---------- 3D body: chips, layers, loading ---------- */

function renderChips(statuses) {
  $('#systemChips').innerHTML = SYSTEM_ORDER.map((id) => {
    const status = statuses[id] || '';
    return `<button type="button" class="chip${selected === id ? ' active' : ''}" data-system="${id}">
      <span class="dot ${status}"></span><span>${esc(L(content.systems[id].short || content.systems[id].name))}</span></button>`;
  }).join('');
}

function renderLayers() {
  const el = $('#layerBar');
  const list = body && body.getLayers ? body.getLayers() : [];
  el.hidden = !list.length;
  el.innerHTML = list.map((l) => `
    <button type="button" class="layer${l.on ? ' on' : ''}" data-layer="${l.id}" aria-pressed="${l.on}">
      ${l.loading ? '⏳' : l.on ? '●' : '○'} ${t('layer.' + l.id)}</button>`).join('');
}

function renderLoading() {
  const el = $('#bodyLoad');
  const ids = Object.keys(loading);
  el.hidden = !ids.length;
  if (!ids.length) return;
  const ratio = ids.reduce((s, id) => s + loading[id], 0) / ids.length;
  el.innerHTML = `
    <span>${t('body.loading', { what: ids.map((id) => t('layer.' + id)).join(', ') })} ${Math.round(ratio * 100)}%</span>
    <div class="bar"><i style="width:${Math.round(ratio * 100)}%"></i></div>`;
}

function renderSlowNote() {
  const el = $('#slowNote');
  el.hidden = !(slow && state.model !== 'simple');
  el.innerHTML = `<span>${t('body.slow')}</span> <button type="button" class="btn" data-model="simple">${t('model.simple')}</button>`;
}

// The figure is loaded separately so the app still works without WebGL.
// state.model picks the detailed anatomy model or the light, simple one.
async function initBody() {
  if (body) { body.dispose(); body = null; }
  loading = {};
  slow = false;
  const stage = $('#bodyStage');
  const tryCreate = async (file, extra) => {
    const { createBody } = await import(file);
    return createBody(stage, { onSelect: selectSystem, ...extra });
  };
  try {
    if (state.model === 'simple') throw new Error('simple model requested');
    body = await tryCreate('./body3d.js', {
      onProgress(p) {
        if (p.done || p.error) delete loading[p.layer]; else loading[p.layer] = p.ratio;
        if (p.error) toast(t('body.loadError'));
        renderLoading();
      },
      onLayers: renderLayers,
      onSlow() { slow = true; renderSlowNote(); },
    });
  } catch (e) {
    try {
      body = await tryCreate('./body.js');
    } catch (e2) {
      stage.innerHTML = '<div class="fallback" data-i18n="body.fallback"></div>';
      applyI18n(stage);
    }
  }
  renderLoading();
  renderDashboard();
}

function renderDashboard() {
  const entries = currentEntries();
  const res = evaluate(entries, state.env, refs);
  lastRes = res;
  renderAlerts(res);
  renderOverview(res);

  // 30-day outlook. The figure and the chips show either today's status or the projection.
  const out = res.empty ? { ready: false, n: 0, need: 5 } : computeOutlook(entries, state.env, refs, res);
  const projected = horizon === '30' && out.ready;
  const statuses = res.empty ? {} : projected ? out.systems
    : Object.fromEntries(SYSTEM_ORDER.map((id) => [id, res.systems[id].status]));
  renderChips(statuses);
  document.querySelectorAll('[data-horizon]').forEach((b) => b.classList.toggle('active', b.dataset.horizon === horizon));
  $('#projNote').hidden = !projected;

  const who = isDemo() ? DEMO_NAME : t('mode.mine');
  if (view === 'outlook') renderOutlook($('#outlook'), out, { refs, content, sources });
  if (view === 'report') {
    renderReport($('#report'), { res, out, entries, refs, content, envKey: state.env, spaceWx, who, simulated: isDemo() });
  }
  if (view === 'mission') {
    renderSpaceWeather($('#spaceWeather'), spaceWx);
    renderDoseCard(res);
    // Reminders and streak. Weekly and monthly tasks are remembered on this device.
    renderRoutine($('#routine'), computeRoutine(entries, state.tasks, res), isDemo());
    renderCredits();
  }

  const outlookHtml = selected && out.ready ? `<h3>${t('panel.outlook')}</h3>` + out.risks.filter((r) => r.system === selected).map((r) => `
    <div class="riskline"><span class="pill ${r.status}"><span class="dot ${r.status}"></span>${t('level.' + r.status)}</span><b>${t('risk.' + r.id)}</b></div>
    <ul>${riskDrivers(r, out, content, refs).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('') : '';
  // On wide screens the panel replaces the cards; "close" brings them back.
  $('#overview').hidden = !!selected;
  renderPanel($('#organPanel'), {
    id: selected, res, entries, refs, content, sources, envKey: state.env, badge: dataBadge(), i4, outlookHtml, structure: selectedName,
  });
  if (body) {
    body.setStatuses(statuses);
    body.setSelected(selected);
  }
  renderLayers();
  renderSlowNote();
}

/* ---------- "Demo" menu: data source, scenarios, 3D model ---------- */

function renderDemoMenu() {
  const seg = (attr, value, label, active) => `<button type="button" data-${attr}="${value}" class="${active ? 'active' : ''}">${esc(label)}</button>`;
  const scen = (id) => `<button type="button" class="btn${(state.scenario || '') === id ? ' active' : ''}" data-scenario="${id}">${t('scenario.' + (id || 'none'))}</button>`;
  $('#demoBox').innerHTML = `
    <span class="label">${t('mode.label')}</span>
    <div class="seg">${seg('mode', 'demo', t('mode.demoShort'), isDemo())}${seg('mode', 'mine', t('mode.mine'), !isDemo())}</div>
    ${isDemo() ? `<span class="label">${t('scenario.label')}</span>${[''].concat(SCENARIOS).map(scen).join('')}` : ''}
    <span class="label">${t('model.label')}</span>
    <div class="seg">${seg('model', 'detailed', t('model.detailed'), state.model !== 'simple')}${seg('model', 'simple', t('model.simple'), state.model === 'simple')}</div>`;
}

/* ---------- mission tab ---------- */

// Cumulative mission dose against the NASA career limit (600 mSv).
function renderDoseCard(res) {
  const el = $('#doseCard');
  if (res.empty) { el.innerHTML = ''; return; }
  const r = res.metrics.radiation;
  const limit = refs.radiation.careerLimit_mSv;
  const src = sources[refs.radiation.careerSource];
  const daysLeft = Math.max(0, Math.round((limit - r.cumulative) / r.rate));
  el.innerHTML = `
    <div class="card dosecard ${r.status}">
      <div class="chead"><h3>${t('dose.title')}</h3><span class="badge">${t('label.nasa')}</span>${isDemo() ? `<span class="badge sim">${t('badge.sim')}</span>` : ''}
        ${info(`<p>${r.event ? t('dose.spe') : t('dose.model')}</p><p>${esc(src.title)}</p>`)}</div>
      <div class="big">${fmt(r.cumulative, 1)} <small>mSv ${t('dose.of', { limit })} · ${fmt(r.pct, 1)}%</small></div>
      <div class="bar"><i class="${r.status}" style="width:${Math.min(100, r.pct).toFixed(1)}%"></i></div>
      <div class="why">${t('dose.rate', { env: t('env.' + state.env), rate: fmt(r.rate, 2) })}. ${t('dose.left', { days: fmt(daysLeft) })}</div>
    </div>`;
}

function renderCredits() {
  const link = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
  $('#credits').innerHTML = `
    <h3>${t('credits.title')}</h3>
    <p><b>${t('credits.models')}</b><br>
      3D anatomy models: ${link('https://github.com/LluisV/Z-Anatomy', 'Z-Anatomy')} (github.com/LluisV/Z-Anatomy),
      derived from ${link('https://lifesciencedb.jp/bp3d/', 'BodyParts3D')} (DBCLS),
      ${link('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}.
      Converted, compressed and simplified; colors applied at runtime.<br>
      ${link('assets/model/NOTICE.md', 'NOTICE.md')} · ${link('assets/model/ATTRIBUTION.md', 'ATTRIBUTION.md')}</p>
    <p><b>${t('credits.data')}</b><br>
      NASA OSDR OSD-575 / OSD-569 (Inspiration4) · NOAA SWPC · NASA DONKI (CCMC) · NASA Human Research Program · NASA-STD-3001 · Canadian Space Agency</p>
    <p><b>${t('credits.libs')}</b><br>
      ${link('https://threejs.org/', 'Three.js')} (MIT) · ${link('https://www.chartjs.org/', 'Chart.js')} (MIT) · meshoptimizer decoder (MIT)</p>
    <p class="fine">${t('credits.note')}</p>`;
}

/* ---------- alerts ---------- */

function liveAlertHtml() {
  if (!spaceWx || spaceWx.mode !== 'live' || spaceWx.status !== 'red') return '';
  return `
    <div class="alert pulse" role="alert">
      <span class="ico">☢</span>
      <div>
        <h3>${t('alert.live.title', { s: spaceWx.level })} <span class="badge real">${t('badge.real')}</span></h3>
        <p>${t('alert.live.body', { flux: fmt(spaceWx.flux, 1), delay: esc(delayText(currentEnv())) })}</p>
        <button type="button" class="btn primary" style="margin-top:10px" data-act="shelter">${t('em.open.shelter')}</button>
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
        <button type="button" class="btn primary" style="margin-top:10px" data-act="shelter">${t('em.open.shelter')}</button>
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
  VIEWS.forEach((v) => { $('#view-' + v).hidden = view !== v; });
  renderDemoMenu();
}

function render() {
  setLang(state.lang);
  renderChrome();
  renderDashboard();
  if (view === 'checkin') renderCheckinView();
  renderEmergency();
}

function setView(v) {
  view = v;
  render();
  window.scrollTo(0, 0);
}

// One click handler for every button the app renders.
function onClick(e) {
  // Close open "i" bubbles and menus when the tap is somewhere else.
  document.querySelectorAll('details.info[open], details.menu[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });

  const pick = (attr) => e.target.closest(`[data-${attr}]`);
  let el;
  if ((el = pick('system'))) return selectSystem(el.dataset.system);
  if ((el = pick('layer'))) {
    if (body && body.setLayer) body.setLayer(el.dataset.layer, !el.classList.contains('on'));
    return undefined;
  }
  if ((el = pick('task'))) return setState({ tasks: { ...state.tasks, [el.dataset.task]: dateStr() } });
  if ((el = pick('horizon'))) { horizon = el.dataset.horizon; return render(); }
  if ((el = pick('mode'))) return setState({ mode: el.dataset.mode });
  if ((el = pick('scenario'))) return setState({ scenario: el.dataset.scenario || null, mode: 'demo' });
  if ((el = pick('model'))) {
    if (el.dataset.model !== state.model) { setState({ model: el.dataset.model }); initBody(); }
    return undefined;
  }
  if ((el = pick('goto'))) return setView(el.dataset.goto);
  if (!(el = pick('act'))) return undefined;
  const act = el.dataset.act;
  if (act === 'close') selectSystem(null);
  if (act === 'shelter') openEmergency('radiation');
  if (act === 'checkin') setView('checkin');
  if (act === 'report') setView('report');
  if (act === 'demo') setState({ mode: 'demo' });
  if (act === 'print') {
    setState({ tasks: { ...state.tasks, weekly: dateStr() } }); // printing the report completes the weekly task
    window.print();
  }
  return undefined;
}

async function boot() {
  loadState();
  [, refs, content, sources] = await Promise.all([
    loadI18n(), getJSON('data/references.json'), getJSON('data/content.json'), getJSON('data/sources.json'),
  ]);

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setState({ lang: b.dataset.lang })));
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#envSelect').addEventListener('change', (e) => setState({ env: e.target.value }));
  document.addEventListener('click', onClick);

  // Emergency mode is available on every screen and works offline.
  initEmergency($('#emergency'), () => ({
    res: lastRes, refs, content, envKey: state.env, spaceWx,
    who: isDemo() ? DEMO_NAME : t('mode.mine'), simulated: isDemo(),
  }));
  $('#emBtn').addEventListener('click', () => openEmergency());

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
