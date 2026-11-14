// What-if scenarios for the demo. They change the last days of the selected astronaut's SIMULATED data.
// Scenario values are illustrative and are always shown with the "Simulated" label.
export const SCENARIOS = ['spe', 'sleep', 'fluid'];

export function applyScenario(entries, scenario) {
  if (!scenario || !entries.length) return entries;
  const out = entries.map((e) => ({ ...e }));
  const n = out.length;
  // Change the last k days; i runs from 0 (first changed day) to k-1 (the selected day).
  const tail = (k, fn) => { for (let i = 0; i < Math.min(k, n); i++) fn(out[n - Math.min(k, n) + i], i); };

  if (scenario === 'spe') {
    // Solar particle event on the selected day: a large one-day dose (illustrative), stress response.
    tail(1, (e) => { e.dose = 45; e.hr += 13; e.mood = 3; e.sleepH = 6.2; e.sleepQ = 4; });
  } else if (scenario === 'sleep') {
    const h = [5.6, 5.2, 4.8, 4.5, 4.3, 4.2], q = [3, 3, 2, 2, 2, 2], m = [3, 3, 3, 2, 2, 2];
    tail(6, (e, i) => { e.sleepH = h[i]; e.sleepQ = q[i]; e.mood = m[i]; e.hr += 2 + 2 * i; e.exercise = i < 2 ? 30 : 10; });
  } else if (scenario === 'fluid') {
    tail(4, (e, i) => {
      e.hr += 8 + 4 * i; e.sys -= 6 + 4 * i; e.dia -= 4 + 2 * i;
      e.temp = +(e.temp + 0.2 + 0.1 * i).toFixed(1); e.vision = Math.max(e.vision, i > 0 ? 1 : 0); e.exercise = 15;
    });
  }
  return out;
}
