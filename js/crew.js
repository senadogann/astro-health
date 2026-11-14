// SIMULATED 180-day mission for a FICTIONAL four-person crew. Every value produced here is simulated.
//
// Where a NASA reference exists, the simulation is built on it (see README "Simulated crew data"):
//   sleep        crew mean 6.09 h/night, 8.5 h scheduled ......... Barger et al., Lancet Neurol 2014
//   glucose      personal baseline = pre-flight mean of one real
//                Inspiration4 crew member (C001..C004) ............ NASA OSDR OSD-575 (data/i4_blood.json)
//   radiation    daily dose = dose rate of the chosen environment . data/references.json (LSAH, Nature 2024, ...)
//   vision/SANS  ~70% of long-duration crew show at least one
//                finding -> 3 of the 4 astronauts ................ HRP SANS Evidence Report 2022
//   exercise     >= 3 aerobic sessions a week, >= 20 min ......... NASA OCHMO exercise brief
//   bone loss    1-1.5 %/month, computed by the rules engine ..... HRP Bone Fracture Evidence Report 2024
// Everything else (heart rate, blood pressure, temperature, mood, day-to-day variation, the timing of
// events) has no NASA reference in this app and is ILLUSTRATIVE.
import { dateStr } from './store.js';

export const MISSION_DAYS = 180;

export const NASA = {
  sleepMeanH: 6.09,      // Barger et al. 2014
  sleepScheduledH: 8.5,  // Barger et al. 2014
  sansShare: 0.7,        // HRP SANS Evidence Report 2022
  exerciseMinMinutes: 20, exerciseSessionsPerWeek: 3, // OCHMO
};

// Fictional crew. i4 = Inspiration4 crew member whose real pre-flight glucose is used as the baseline.
// sleepOffset values sum to 0, so the crew mean stays 6.09 h. Other baselines are illustrative.
export const CREW = [
  { id: 'c1', name: 'Cmdr. A. Yıldız', role: 'cmd', i4: 'C001', seed: 11, hr: 61, sys: 117, dia: 75, temp: 36.7, sleepOffset: 0.20, sansOnset: 72 },
  { id: 'c2', name: 'Plt. E. Kaya', role: 'plt', i4: 'C002', seed: 23, hr: 58, sys: 112, dia: 71, temp: 36.6, sleepOffset: -0.15, sansOnset: 104 },
  { id: 'c3', name: 'MS1 D. Aydın', role: 'ms1', i4: 'C003', seed: 37, hr: 66, sys: 121, dia: 78, temp: 36.8, sleepOffset: -0.25, sansOnset: null,
    // Illustrative event: a week of short sleep before a spacewalk (days 118-126).
    sleepLoss: { from: 118, to: 126 } },
  { id: 'c4', name: 'MS2 S. Çelik', role: 'ms2', i4: 'C004', seed: 53, hr: 63, sys: 114, dia: 72, temp: 36.6, sleepOffset: 0.20, sansOnset: 151 },
];

// Small seeded random generator: the simulation looks the same on every device.
export function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const cache = new Map();

// Day 1 .. 180 of one astronaut's simulated mission; the last day is today.
export function crewEntries(index, doseRate, i4) {
  const key = `${index}|${doseRate}|${i4 ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const c = CREW[index] || CREW[0];
  const r = rng(c.seed);
  const g = () => clamp((r() + r() + r() - 1.5) * 2, -2, 2); // roughly normal, SD ~1, clipped
  const glucoseBase = i4 && i4.analytes.glucose.preflightByCrew ? i4.analytes.glucose.preflightByCrew[c.i4] : 75;
  const sleepMean = NASA.sleepMeanH + c.sleepOffset;
  const today = new Date();
  const out = [];
  for (let day = 1; day <= MISSION_DAYS; day++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (MISSION_DAYS - day));
    const loss = c.sleepLoss && day >= c.sleepLoss.from && day <= c.sleepLoss.to;
    const k = loss ? day - c.sleepLoss.from : 0;
    const sleepH = loss ? 5.2 - 0.12 * k + 0.15 * g() : sleepMean + 0.45 * g();
    out.push({
      date: dateStr(d),
      day,
      hr: Math.round(c.hr + 2.5 * g() + (loss ? 0.8 * k : 0)),
      sys: Math.round(c.sys + 4 * g()),
      dia: Math.round(c.dia + 3 * g()),
      temp: +(c.temp + 0.12 * g()).toFixed(1),
      glucose: Math.round(glucoseBase + 4 * g()),
      sleepH: clamp(sleepH, 3.5, NASA.sleepScheduledH), // rounded after the mean is set (below)
      sleepQ: clamp(Math.round(loss ? 3 - k / 4 : 4 + (sleepH - 6) * 1.2 + 0.5 * g()), 1, 7),
      mood: loss && k >= 4 ? 2 : loss ? 3 : r() < 0.2 ? 5 : r() < 0.08 ? 3 : 4,
      vision: c.sansOnset && day >= c.sansOnset ? 1 : 0,
      dose: +(doseRate * (1 + 0.08 * g())).toFixed(2),
      // Six sessions a week, one rest day (meets the OCHMO minimum of 3 x 20 min).
      exercise: day % 7 === 0 ? 0 : Math.round(60 + 30 * r()),
    });
  }
  // Keep each astronaut's mean sleep over the whole mission on target (6.09 h + personal offset; the offsets
  // sum to 0, so the crew mean is 6.09 h). Only the normal nights are shifted; the event stays as it is.
  const isEvent = (e) => c.sleepLoss && e.day >= c.sleepLoss.from && e.day <= c.sleepLoss.to;
  const normal = out.filter((e) => !isEvent(e));
  const total = out.reduce((s, e) => s + e.sleepH, 0);
  const shift = (sleepMean * out.length - total) / normal.length;
  normal.forEach((e) => { e.sleepH = clamp(e.sleepH + shift, 3.5, NASA.sleepScheduledH); });
  out.forEach((e) => { e.sleepH = Math.round(e.sleepH * 100) / 100; });
  cache.set(key, out);
  return out;
}

// Mean sleep of the whole crew over the mission, for the README and for checking.
export function crewSleepMean(doseRate = 0.5, i4 = null) {
  const all = CREW.flatMap((_, i) => crewEntries(i, doseRate, i4));
  return all.reduce((s, e) => s + e.sleepH, 0) / all.length;
}
