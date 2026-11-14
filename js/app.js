import { loadI18n, setLang, t, applyI18n } from './i18n.js';
import { state, loadState, setState, subscribe, saveEntry } from './store.js';
import { renderCheckin } from './checkin.js';

const $ = (sel) => document.querySelector(sel);
const ENVS = ['iss', 'orion', 'moon', 'marsTransit', 'mars'];

let view = 'dashboard';
let refs, content, sources;

const getJSON = (url) => fetch(url).then((r) => r.json());

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2200);
}

function renderCheckinView() {
  renderCheckin($('#checkin'), {
    refs, content, entries: state.entries,
    onSave(entry) {
      saveEntry(entry);
      toast(t('checkin.saved'));
      setView('dashboard');
    },
  });
}

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
  if (view === 'checkin') renderCheckinView();
}

function setView(v) {
  view = v;
  render();
}

async function boot() {
  loadState();
  [, refs, content, sources] = await Promise.all([
    loadI18n(), getJSON('data/references.json'), getJSON('data/content.json'), getJSON('data/sources.json'),
  ]);

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setState({ lang: b.dataset.lang })));
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#envSelect').addEventListener('change', (e) => setState({ env: e.target.value }));

  subscribe(render);
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
