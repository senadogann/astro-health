// Demo mode: 30 days of SIMULATED data for a fictional astronaut, plus what-if scenarios.
import { dateStr } from './store.js';

export const DEMO_NAME = 'Cmdr. A. Yıldız';
export const SCENARIOS = ['spe', 'sleep', 'fluid'];

// Small seeded random generator so the demo looks the same on every device.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoEntries(scenario, doseRate = 0.5, days = 30) {
  const r = rng(20260115);
  // Roughly normal noise, clipped so a healthy day never looks like an alert.
  const g = () => Math.max(-1.4, Math.min(1.4, (r() + r() + r() - 1.5) * 2));
  const rx = rng(77);
  const today = new Date();
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    out.push({
      date: dateStr(d),
      hr: Math.round(62 + 3 * g()),
      sys: Math.round(116 + 4 * g()),
      dia: Math.round(74 + 3 * g()),
      temp: +(36.7 + 0.12 * g()).toFixed(1),
      glucose: Math.round(90 + 4 * g()),
      sleepH: +(7.5 + 0.3 * g()).toFixed(1),
      sleepQ: Math.round(5.5 + 0.5 * g()),
      mood: r() < 0.25 ? 5 : 4,
      vision: 0,
      dose: +(doseRate * (1 + 0.08 * g())).toFixed(2),
      exercise: i % 7 === 6 ? 0 : Math.round(60 + 30 * rx()), // one rest day a week
    });
  }

  // Change the last n days; k runs from 0 (first changed day) to n-1 (today).
  const tail = (n, fn) => { for (let k = 0; k < n; k++) fn(out[days - n + k], k); };

  if (scenario === 'spe') {
    // Solar particle event today: a large one-day dose (illustrative), stress response.
    tail(1, (e) => { e.dose = 45; e.hr = 75; e.mood = 3; e.sleepH = 6.2; e.sleepQ = 4; });
  } else if (scenario === 'sleep') {
    const h = [5.6, 5.2, 4.8, 4.5, 4.3, 4.2], q = [3, 3, 2, 2, 2, 2], m = [3, 3, 3, 2, 2, 2];
    tail(6, (e, k) => { e.sleepH = h[k]; e.sleepQ = q[k]; e.mood = m[k]; e.hr = 64 + 2 * k; e.exercise = k < 2 ? 30 : 10; });
  } else if (scenario === 'fluid') {
    tail(4, (e, k) => {
      e.hr = 70 + 4 * k; e.sys = 110 - 4 * k; e.dia = 70 - 2 * k;
      e.temp = +(36.9 + 0.1 * k).toFixed(1); e.vision = k > 0 ? 1 : 0; e.exercise = 15;
    });
  }
  return out;
}
