import { loadI18n, setLang, t, applyI18n } from './i18n.js';
import { state, loadState, setState, subscribe } from './store.js';

const $ = (sel) => document.querySelector(sel);
const ENVS = ['iss', 'orion', 'moon', 'marsTransit', 'mars'];

let view = 'dashboard';

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
}

function setView(v) {
  view = v;
  render();
}

async function boot() {
  loadState();
  await loadI18n();

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
