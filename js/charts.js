// Small trend charts (Chart.js, loaded as the global `Chart`).
const live = [];
const STATUS = { green: '#2ee59d', yellow: '#ffc93c', red: '#ff4d5e' };
const SERIES = ['#4cc9f0', '#c9a6ff'];

export function clearCharts() {
  live.splice(0).forEach((c) => c.destroy());
}

// series: [{ label, data, status }]   baseline: { label, value } or null
export function trendChart(canvas, { labels, series, baseline }, { track = true } = {}) {
  if (!window.Chart || !canvas) return null; // library missing: the panel still works without charts
  const datasets = series.map((s, i) => {
    const last = s.data.length - 1;
    return {
      label: s.label,
      data: s.data,
      borderColor: SERIES[i % SERIES.length],
      backgroundColor: SERIES[i % SERIES.length],
      borderWidth: 2,
      tension: 0.3,
      // Only today's point is drawn, in its status colour.
      pointRadius: s.data.map((_, k) => (k === last ? 6 : 0)),
      pointBackgroundColor: s.data.map((_, k) => (k === last ? STATUS[s.status] || SERIES[i] : SERIES[i])),
      pointBorderColor: '#070b14',
    };
  });
  if (baseline) {
    datasets.push({
      label: baseline.label,
      data: labels.map(() => baseline.value),
      borderColor: '#9aa7c7',
      borderDash: [6, 6],
      borderWidth: 1.5,
      pointRadius: 0,
    });
  }
  const grid = { color: 'rgba(154,167,199,.12)' };
  const ticks = { color: '#9aa7c7', font: { size: 11 }, maxTicksLimit: 6 };
  const chart = new window.Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, labels: { color: '#9aa7c7', boxWidth: 14, font: { size: 11 } } },
      },
      scales: { x: { grid, ticks }, y: { grid, ticks, grace: '10%' } },
    },
  });
  if (track) live.push(chart); // tracked charts are removed by clearCharts()
  return chart;
}
