// Assessment engine. Pure functions: entries + environment + references -> green / yellow / red.
//
// Three layers, in order of importance:
//   1. Personal baseline: mean and SD of the first 7–14 days -> z-score (the main alert).
//   2. Earth reference:   general clinical ranges, labelled as such.
//   3. NASA-derived:      radiation dose against NASA limits, bone loss at the NASA rate.
//
// Prototype values. Real medical thresholds are set by flight surgeons.

const RANK = { green: 0, yellow: 1, red: 2 };
export const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);

// Which indicators feed which body system.
export const SYSTEMS = {
  cardio: ['hr', 'sys', 'dia'],
  lungs: ['temp'],
  brain: ['sleepH', 'sleepQ', 'mood'],
  bones: ['bone'],
  eyes: ['vision'],
  blood: ['glucose', 'temp', 'radiation'],
};
export const SYSTEM_ORDER = ['cardio', 'lungs', 'brain', 'bones', 'eyes', 'blood'];
export const CHECKIN_KEYS = ['hr', 'sys', 'dia', 'temp', 'glucose', 'sleepH', 'sleepQ', 'mood', 'vision'];

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
function sampleSd(a) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
const inRange = (v, [lo, hi]) => (lo == null || v >= lo) && (hi == null || v <= hi);

export function rangeStatus(v, m) {
  if (inRange(v, m.green)) return 'green';
  if (inRange(v, m.yellow)) return 'yellow';
  return 'red';
}

// Personal baseline from the first 7–14 days of data.
export function computeBaseline(entries, refs) {
  const z = refs.zscore;
  const out = { ready: entries.length >= z.minDays, n: entries.length, need: z.minDays, days: 0, stats: {} };
  if (!out.ready) return out;
  const first = entries.slice(0, z.maxDays);
  out.days = first.length;
  for (const key of CHECKIN_KEYS) {
    const m = refs.metrics[key];
    if (!m.sdFloor) continue;
    const vals = first.map((e) => e[key]).filter(Number.isFinite);
    if (vals.length < z.minDays) continue;
    // The SD floor stops a very steady baseline from turning tiny changes into alerts.
    out.stats[key] = { mean: mean(vals), sd: Math.max(sampleSd(vals), m.sdFloor) };
  }
  return out;
}

export function evalMetric(key, value, refs, baseline) {
  const m = refs.metrics[key];
  const earth = rangeStatus(value, m);
  const st = baseline && baseline.stats[key];
  let z = null;
  let zStatus = 'green';
  if (st) {
    z = (value - st.mean) / st.sd;
    const dev = m.dir === 'low' ? -z : m.dir === 'high' ? z : Math.abs(z);
    if (dev >= refs.zscore.red) zStatus = 'red';
    else if (dev >= refs.zscore.yellow) zStatus = 'yellow';
  }
  const status = worst(earth, zStatus);
  let driver = null; // what caused a non-green status
  if (status !== 'green') driver = RANK[zStatus] >= RANK[earth] ? 'baseline' : m.label;
  return { key, value, status, earth, z, zStatus, driver, baseline: st || null, label: m.label };
}

export function missionDay(entries) {
  if (!entries.length) return 0;
  const a = new Date(entries[0].date + 'T00:00:00');
  const b = new Date(entries[entries.length - 1].date + 'T00:00:00');
  return Math.round((b - a) / 86400000) + 1;
}

export function evaluate(entries, envKey, refs) {
  if (!entries.length) return { empty: true };
  const env = refs.environments[envKey];
  const latest = entries[entries.length - 1];
  const baseline = computeBaseline(entries, refs);
  const day = missionDay(entries);
  const metrics = {};

  for (const key of CHECKIN_KEYS) {
    if (Number.isFinite(latest[key])) metrics[key] = evalMetric(key, latest[key], refs, baseline);
  }

  // Radiation (NASA-derived): daily dose and mission total against the 600 mSv career limit.
  const R = refs.radiation;
  const doses = entries.map((e) => (Number.isFinite(e.dose) ? e.dose : env.doseRate));
  const cumulative = doses.reduce((s, v) => s + v, 0);
  const today = doses[doses.length - 1];
  const pct = (cumulative / R.careerLimit_mSv) * 100;
  let rStatus = 'green';
  if (today >= R.dailyRed_mSv || pct >= R.careerRedPct) rStatus = 'red';
  else if (today >= R.dailyYellow_mSv || pct >= R.careerYellowPct) rStatus = 'yellow';
  metrics.radiation = {
    key: 'radiation', value: today, status: rStatus, driver: rStatus === 'green' ? null : 'nasa', label: 'nasa',
    cumulative, pct, rate: env.doseRate, event: today >= R.dailyRed_mSv,
  };

  // Bone loss (NASA-derived model): 1–1.5% per month of weightlessness, from mission day.
  const B = refs.bone;
  const lo = (day / 30) * B.lossPctPerMonthLow;
  const hi = (day / 30) * B.lossPctPerMonthHigh;
  const loss = (lo + hi) / 2;
  const bStatus = loss >= B.redPct ? 'red' : loss >= B.yellowPct ? 'yellow' : 'green';
  metrics.bone = { key: 'bone', value: loss, lo, hi, status: bStatus, driver: bStatus === 'green' ? null : 'nasa', label: 'nasa' };

  const systems = {};
  let overall = 'green';
  for (const id of SYSTEM_ORDER) {
    const list = SYSTEMS[id].map((k) => metrics[k]).filter(Boolean);
    const status = list.reduce((s, m) => worst(s, m.status), 'green');
    systems[id] = { id, status, metrics: list };
    overall = worst(overall, status);
  }

  return { empty: false, day, latest, baseline, metrics, systems, overall, shelter: metrics.radiation.event };
}
