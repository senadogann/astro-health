// Crew routine: measurement reminders and light gamification (check-in streak, badges).
// Schedule follows ISS medical operations in simplified form:
//   every day   - sleep, mood, exercise and vitals check-in
//   every week  - report for the private conference with the flight surgeon
//   every month - body mass and a cognitive test
import { t, esc } from './i18n.js';
import { dateStr } from './store.js';

const DAY = 86400000;
const toDate = (s) => new Date(s + 'T00:00:00');
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);

const TASKS = [
  { id: 'checkin', every: 1, icon: '🩺', act: 'checkin' },
  { id: 'weekly', every: 7, icon: '📋', act: 'report' },
  { id: 'weight', every: 30, icon: '⚖', act: 'mark' },
  { id: 'cognition', every: 30, icon: '🧩', act: 'mark' },
];

export function computeRoutine(entries, doneDates, res) {
  const today = dateStr();
  const dates = entries.map((e) => e.date);
  const lastEntry = dates[dates.length - 1] || null;

  const tasks = TASKS.map((task) => {
    const last = task.id === 'checkin' ? lastEntry : (doneDates && doneDates[task.id]) || null;
    const since = last ? daysBetween(last, today) : null;
    const dueIn = since == null ? 0 : Math.max(0, task.every - since);
    return { ...task, last, dueIn, due: dueIn === 0 };
  });

  // Streak: consecutive days with a check-in, ending today or yesterday.
  let streak = 0, best = 0, run = 0;
  dates.forEach((d, i) => {
    run = i > 0 && daysBetween(dates[i - 1], d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  if (lastEntry && daysBetween(lastEntry, today) <= 1) streak = run;

  const last7 = entries.slice(-7);
  const badges = [
    { id: 'first', icon: '🚀', earned: entries.length >= 1 },
    { id: 'week', icon: '🔥', earned: best >= 7 },
    { id: 'baseline', icon: '📈', earned: entries.length >= 14 },
    { id: 'month', icon: '🏅', earned: best >= 30 },
    { id: 'sleep', icon: '😴', earned: last7.length === 7 && last7.every((e) => e.sleepH >= 7) },
    { id: 'exercise', icon: '💪', earned: last7.filter((e) => e.exercise >= 20).length >= 3 },
    { id: 'green', icon: '✅', earned: !!res && !res.empty && res.overall === 'green' },
  ];
  return { tasks, streak, best, badges };
}

export function renderRoutine(el, r, simulated) {
  const when = (task) => (task.due ? t('task.due') : task.id === 'checkin' ? t('task.doneToday') : t('task.next', { d: task.dueIn }));
  const button = (task) => {
    if (!task.due) return '<span class="tick">✓</span>';
    if (task.act === 'mark') return `<button type="button" class="btn" data-task="${task.id}">${t('task.mark')}</button>`;
    return `<button type="button" class="btn primary" data-act="${task.act}">${t('task.open.' + task.act)}</button>`;
  };
  el.innerHTML = `
    <div class="card">
      <div class="chead"><h3>${t('routine.tasks')}</h3>${simulated ? `<span class="badge sim">${t('badge.sim')}</span>` : ''}</div>
      <ul class="tasks">
        ${r.tasks.map((task) => `
          <li class="${task.due ? 'due' : 'ok'}">
            <span class="ico">${task.icon}</span>
            <span class="tt"><b>${t('task.' + task.id)}</b><small>${t('task.every.' + task.every)} · ${when(task)}</small></span>
            ${button(task)}
          </li>`).join('')}
      </ul>
      <p class="fine">${t('routine.note')}</p>
    </div>
    <div class="card">
      <div class="chead"><h3>${t('routine.streak')}</h3>${simulated ? `<span class="badge sim">${t('badge.sim')}</span>` : ''}</div>
      <div class="big">🔥 ${r.streak} <small>${t('routine.days')} · ${t('routine.best', { n: r.best })}</small></div>
      <div class="badges">
        ${r.badges.map((b) => `
          <span class="medal${b.earned ? ' earned' : ''}" title="${esc(t('medal.' + b.id + '.how'))}">
            <span class="ico">${b.icon}</span><span><b>${t('medal.' + b.id)}</b><small>${t('medal.' + b.id + '.how')}</small></span>
          </span>`).join('')}
      </div>
    </div>`;
}
