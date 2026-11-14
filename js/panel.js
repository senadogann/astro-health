// Organ panel: what the system does, how space affects it, current values with trends,
// what to do, when to notify the flight surgeon (with the communication delay), and sources.
import { t, L, esc } from './i18n.js';
import { clearCharts, trendChart } from './charts.js';
import { valueText, reasonText, driverLabel, delayText } from './ui.js';

// Which indicators share one chart in each system's panel.
const CHART_GROUPS = {
  cardio: [['hr'], ['sys', 'dia']],
  lungs: [['temp']],
  brain: [['sleepH'], ['sleepQ', 'mood']],
  bones: [['bone']],
  eyes: [['vision']],
  blood: [['glucose'], ['temp'], ['radiation']],
};

export function renderPanel(el, { id, res, entries, refs, content, sources, envKey, badge }) {
  clearCharts();
  if (!id) { el.hidden = true; el.innerHTML = ''; return; }

  const sys = content.systems[id];
  const env = refs.environments[envKey];
  const status = res.empty ? null : res.systems[id].status;
  const list = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

  let current = '';
  const charts = [];
  if (!res.empty) {
    current = `<h3>${t('panel.current')} ${badge}</h3>` + CHART_GROUPS[id].map((group, gi) => {
      const rows = group.map((key) => res.metrics[key]).filter(Boolean).map((r) => `
        <div class="mrow">
          <div class="line">
            <span class="dot ${r.status}"></span>
            <span class="name">${esc(L(content.metrics[r.key].name))}</span>
            <span class="badge">${esc(driverLabel(r))}</span>
            <span class="v">${esc(valueText(r, refs))}</span>
          </div>
          <div class="why">${esc(reasonText(r, refs))}</div>
        </div>`).join('');
      charts.push(group);
      return `${rows}<div class="chartbox"><canvas data-chart="${gi}"></canvas></div>`;
    }).join('');
  }

  const srcLinks = sys.sources.map((sid) => sources[sid]).filter(Boolean).map((s) => (
    s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>` : `<span>${esc(s.title)}</span>`
  )).join('');

  el.hidden = false;
  el.innerHTML = `
    <div class="phead">
      ${status ? `<span class="pill ${status}"><span class="dot ${status}"></span>${t('status.' + status)}</span>` : ''}
      <h2>${esc(L(sys.name))}</h2>
      <button type="button" class="close" data-act="close" aria-label="${t('panel.close')}">✕</button>
    </div>
    <h3>${t('panel.function')}</h3>
    <p>${esc(L(sys.function))}</p>
    <h3>${t('panel.space')}</h3>
    <p>${esc(L(sys.space))}</p>
    <div class="tags">${sys.hazards.map((h) => `<span class="badge ill">${esc(L(content.hazards[h]))}</span>`).join('')}</div>
    ${current}
    <h3>${t('panel.todo')}</h3>
    ${list(L(sys.selfcare))}
    <h3>${t('panel.notify')}</h3>
    <div class="notify">
      ${list(L(sys.notify))}
      <div class="delaybox">
        <b>${t('panel.delay', { env: t('env.' + envKey), delay: delayText(env) })}</b>
        ${t(env.delayMaxSec >= 60 ? 'panel.delay.long' : 'panel.delay.short')}
      </div>
    </div>
    <h3>${t('panel.sources')}</h3>
    <div class="sources">${srcLinks}</div>
    <p class="fine">${t('panel.fine')}</p>`;

  // Trend charts (last 30 days).
  const recent = entries.slice(-30);
  const offset = entries.length - recent.length;
  const labels = recent.map((e) => e.date.slice(5));
  const B = refs.bone;
  const seriesData = (key) => recent.map((e, i) => {
    if (key === 'radiation') return Number.isFinite(e.dose) ? e.dose : env.doseRate;
    if (key === 'bone') return +(((offset + i + 1) / 30) * ((B.lossPctPerMonthLow + B.lossPctPerMonthHigh) / 2)).toFixed(2);
    return e[key];
  });
  charts.forEach((group, gi) => {
    const canvas = el.querySelector(`canvas[data-chart="${gi}"]`);
    const series = group.filter((key) => res.metrics[key]).map((key) => ({
      label: L(content.metrics[key].name), data: seriesData(key), status: res.metrics[key].status,
    }));
    const only = group.length === 1 ? res.metrics[group[0]] : null;
    const baseline = only && only.baseline ? { label: t('chart.baseline'), value: +only.baseline.mean.toFixed(2) } : null;
    if (canvas && series.length) trendChart(canvas, { labels, series, baseline });
  });
}
