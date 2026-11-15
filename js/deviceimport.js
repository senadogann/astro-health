// Import check-in values from a file exported by a wristband, blood pressure monitor or health app.
// Supports CSV (comma or semicolon) and JSON (an array of records, or an object holding one).
// Returns values per day; nothing is saved here. The check-in form shows them for the astronaut to check.

// Column names are compared after normalising: lower case, spaces and symbols -> "_".
// A column matches when it equals a name or starts with "name_" (so "blood_glucose_mmol_l" matches "blood_glucose").
const FIELDS = {
  hr: { names: ['resting_heart_rate', 'resting_hr', 'heart_rate', 'heartrate', 'hr', 'pulse', 'pulse_rate', 'nabiz'], agg: 'median',
    exclude: /variab|hrv|max|peak|min_hr|zone/ },
  sys: { names: ['systolic', 'sys', 'bp_systolic', 'systolic_bp', 'blood_pressure_systolic', 'sistolik'], agg: 'mean' },
  dia: { names: ['diastolic', 'dia', 'bp_diastolic', 'diastolic_bp', 'blood_pressure_diastolic', 'diastolik'], agg: 'mean' },
  temp: { names: ['body_temperature', 'body_temp', 'core_temperature', 'temperature', 'temp', 'vucut_sicakligi'], agg: 'mean',
    exclude: /skin|deri|ambient|room|cabin/ },
  glucose: { names: ['blood_glucose', 'glucose', 'bg', 'kan_sekeri'], agg: 'mean' },
  sleepH: { names: ['sleep_hours', 'sleep_duration', 'total_sleep', 'sleep_minutes', 'sleep_min', 'sleep_time', 'asleep', 'sleep', 'uyku'], agg: 'sum',
    exclude: /quality|score|efficiency|start|end|stage|deep|rem|light|awake|latency|onset|wake|kalite/ },
  exercise: { names: ['exercise_minutes', 'active_minutes', 'workout_minutes', 'exercise', 'egzersiz'], agg: 'sum' },
};
const BP_COMBINED = ['blood_pressure', 'bp', 'tansiyon'];
const DATE_NAMES = ['date', 'day', 'timestamp', 'datetime', 'time', 'start', 'start_time', 'start_date', 'tarih'];
// Columns that are recognised on purpose but not used, so the astronaut is told why.
const NOTED = { skin: /skin_temp|deri_sicak/ };

const norm = (h) => String(h).trim().toLowerCase()
  .replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const matches = (h, names) => names.some((n) => h === n || h.startsWith(n + '_'));

function fieldOf(header) {
  for (const [key, f] of Object.entries(FIELDS)) {
    if (matches(header, f.names) && !(f.exclude && f.exclude.test(header))) return key;
  }
  return null;
}

/* ----- reading the file ----- */

function splitCsvLine(line, sep) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === sep && !quoted) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text) {
  // Lines starting with "#" are comments (the sample file uses one to say it is simulated).
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(lines[0], sep);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, sep);
    const row = {};
    headers.forEach((h, i) => {
      // With ";" files, a decimal comma ("36,7") is common.
      row[h] = sep === ';' && /^-?\d+,\d+$/.test(cells[i] || '') ? cells[i].replace(',', '.') : cells[i];
    });
    return row;
  });
}

function parseJson(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  for (const k of ['records', 'data', 'entries', 'days', 'measurements', 'items']) if (Array.isArray(data[k])) return data[k];
  const arr = Object.values(data).find(Array.isArray);
  return arr || [data];
}

function toDate(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(s); // day first: 15.11.2026 or 15/11/2026
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{10,13}$/.test(s)) { // Unix time in seconds or milliseconds
    const d = new Date(s.length === 13 ? Number(s) : Number(s) * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return null;
}

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const n = Number(String(v).trim().replace(/\s/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : null;
};

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

/* ----- main ----- */

// metrics = refs.metrics (for the possible range and number of digits of each value)
export function parseDeviceFile(text, fileName, metrics) {
  const isJson = /\.json$/i.test(fileName) || /^\s*[[{]/.test(text);
  const rows = isJson ? parseJson(text) : parseCsv(text);
  const result = { days: {}, fields: [], conversions: [], ignored: [], notes: [], rows: rows.length, badDates: 0 };
  if (!rows.length) return result;

  // Work out what every column means, once, from the first row's keys (JSON rows may vary, so union them).
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r || {})))];
  const columns = {}; // original header -> { key, unit }
  let dateCol = null;
  for (const h of headers) {
    const n = norm(h);
    if (!dateCol && DATE_NAMES.includes(n)) { dateCol = h; continue; }
    if (NOTED.skin.test(n)) { if (!result.ignored.includes('skin')) result.ignored.push('skin'); continue; }
    if (BP_COMBINED.includes(n)) { columns[h] = { key: 'bp' }; continue; }
    const key = fieldOf(n);
    if (!key) continue;
    columns[h] = {
      key,
      mmol: key === 'glucose' && /mmol/.test(n),
      fahrenheit: key === 'temp' && /(^|_)f$|fahrenheit/.test(n),
      minutes: key === 'sleepH' && /(^|_)min(utes?)?($|_)/.test(n),
      seconds: key === 'sleepH' && /(^|_)(sec|seconds|s)$/.test(n),
    };
  }
  if (!dateCol) dateCol = headers.find((h) => /date|time|tarih/.test(norm(h))) || null;

  // Collect raw values per day and field.
  const raw = {};
  const add = (date, key, v) => { ((raw[date] = raw[date] || {})[key] = raw[date][key] || []).push(v); };
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const date = dateCol ? toDate(row[dateCol]) : null;
    if (!date) { result.badDates++; continue; }
    for (const [h, c] of Object.entries(columns)) {
      const value = row[h];
      if (c.key === 'bp') {
        const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(String(value || '').trim());
        if (m) { add(date, 'sys', Number(m[1])); add(date, 'dia', Number(m[2])); }
        continue;
      }
      let v = num(value);
      if (v == null) continue;
      // Unit conversions (from the column name, or from the size of the number).
      if (c.key === 'glucose' && (c.mmol || v < 30)) { v *= 18.016; note(result, 'glucose'); }      // mmol/L -> mg/dL
      if (c.key === 'temp' && (c.fahrenheit || v > 45)) { v = (v - 32) * 5 / 9; note(result, 'temp'); } // °F -> °C
      if (c.key === 'sleepH') {
        if (c.seconds || v > 1440) { v /= 3600; note(result, 'sleepSec'); }
        else if (c.minutes || v > 24) { v /= 60; note(result, 'sleepMin'); }
      }
      add(date, c.key, v);
    }
  }

  // One value per day: median heart rate (so one exercise reading does not move it), sum of sleep and
  // exercise, mean of the rest. Values outside the possible range of the form are dropped.
  for (const [date, fields] of Object.entries(raw)) {
    const day = {};
    for (const [key, list] of Object.entries(fields)) {
      const agg = key === 'sys' || key === 'dia' ? 'mean' : FIELDS[key].agg;
      // Several heart rate readings in a day may include activity: the astronaut is asked to check the value.
      if (key === 'hr' && list.length > 1 && !result.notes.includes('hrMulti')) result.notes.push('hrMulti');
      let v = agg === 'median' ? median(list) : agg === 'sum' ? list.reduce((s, x) => s + x, 0) : mean(list);
      const m = metrics[key];
      v = Number(v.toFixed(m.digits));
      if (v < m.min || v > m.max) { if (!result.ignored.includes('range:' + key)) result.ignored.push('range:' + key); continue; }
      day[key] = v;
    }
    if (Object.keys(day).length) result.days[date] = day;
  }
  result.fields = [...new Set(Object.values(result.days).flatMap(Object.keys))];
  return result;
}

function note(result, kind) {
  if (!result.conversions.includes(kind)) result.conversions.push(kind);
}
