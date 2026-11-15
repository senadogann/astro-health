// Organ panel: what the system does, how space affects it, current values with trends,
// what to do, when to notify the flight surgeon (with the communication delay), and sources.
import { t, L, esc } from './i18n.js';
import { clearCharts, trendChart } from './charts.js';
import { valueText, reasonText, driverLabel, delayText, statusText, sigmaNote } from './ui.js';
import { i4Html, i4Chart } from './i4.js';

// Which indicators share one chart in each system's panel.
const CHART_GROUPS = {
  cardio: [['hr'], ['sys', 'dia']],
  lungs: [['temp']],
  brain: [['sleepH'], ['sleepQ', 'mood']],
  bones: [['bone']],
  eyes: [['vision']],
  blood: [['glucose'], ['temp'], ['radiation']],
};

export function renderPanel(el, { id, res, entries, refs, content, sources, envKey, badge, i4, outlookHtml, structure }) {
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
          <div class="why">${esc(statusText(r))} · ${esc(reasonText(r, refs))}</div>
          ${sigmaNote(r) ? `<div class="sigma">ⓘ ${esc(sigmaNote(r))}</div>` : ''}
        </div>`).join('');
      charts.push(group);
      return `${rows}<div class="chartbox"><canvas data-chart="${gi}"></canvas></div>`;
    }).join('');
  }

  // Real NASA data comparison (Inspiration4), only in the blood panel.
  const glucose = !res.empty && res.metrics.glucose ? res.metrics.glucose.value : null;
  const i4Block = id === 'blood' ? i4Html(i4, glucose) : '';

  // Sources: the three NASA HRP pages for every system, the CSA radiation article where radiation matters.
  const srcIds = ['hrp_hazards', 'hrp_risks', 'hrp_research'];
  if (sys.hazards.includes('radiation')) srcIds.push('csa_radiation');
  sys.sources.forEach((sid) => { if (!srcIds.includes(sid)) srcIds.push(sid); });
  const srcLinks = srcIds.map((sid) => sources[sid]).filter(Boolean).map((s) => (
    s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>` : `<span>${esc(s.title)}</span>`
  )).join('');

  // "How space affects it", organised by the five hazards of human spaceflight (NASA HRP).
  const hazards = sys.effects.map((e) => {
    const h = content.hazards[e.hazard];
    return `<div class="hazard"><span class="hico" aria-hidden="true">${h.icon}</span><div><b>${esc(L(h))}</b><p>${esc(L(e))}</p></div></div>`;
  }).join('');

  el.hidden = false;
  el.innerHTML = `
    <div class="phead">
      ${status ? `<span class="pill ${status}"><span class="dot ${status}"></span>${statusText(res.systems[id])}</span>` : ''}
      <h2>${structure ? esc(structure.label) : esc(L(sys.name))}${structure ? `<small>${esc(structure.tissue)} · ${esc(L(sys.name))}</small>
        <small class="anat" title="${esc(t('anat.title'))}">${esc(structure.anatomical)}${structure.exact ? '' : ` · ${esc(t('anat.estimated'))}`}</small>` : ''}</h2>
      <button type="button" class="close" data-act="close" aria-label="${t('panel.close')}">✕</button>
    </div>
    <h3>${t('panel.function')}</h3>
    <p>${esc(L(sys.function))}</p>
    <h3>${t('panel.space')}
      <details class="info"><summary aria-label="info">i</summary><div class="bubble">${t('panel.hazards.note')}
        <a href="${esc(sources.hrp_hazards.url)}" target="_blank" rel="noopener">nasa.gov/hrp/hazards ↗</a></div></details></h3>
    <div class="hazards">${hazards}</div>
    ${sys.note ? `<p class="why">${esc(L(sys.note))}</p>` : ''}
    ${current}
    ${i4Block}
    ${outlookHtml || ''}
    <h3>${t('panel.todo')} <span class="badge ill" title="${esc(t('panel.guidance'))}">${t('badge.ill')}</span></h3>
    ${list(L(sys.selfcare))}
    <h3>${t('panel.notify')} <span class="badge ill" title="${esc(t('panel.guidance'))}">${t('badge.ill')}</span></h3>
    <p class="why">${esc(t('panel.guidance'))}</p>
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

  if (i4Block) i4Chart(el, i4, glucose);

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
