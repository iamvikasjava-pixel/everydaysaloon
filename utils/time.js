// Calendar maths in the saloon's own timezone. The server runs in UTC on Render,
// so "today" and "this month" must be computed for the saloon, not the host.
const DEFAULT_TZ = 'Asia/Kolkata';
const DAY_MS = 86400000;

function safeTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return DEFAULT_TZ; }
}

function parts(at, tz) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(at).forEach(x => { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

function offsetMs(at, tz) {
  const p = parts(at, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(at.getTime() / 1000) * 1000;
}

// UTC instant at which local day y-m-d begins in tz
function dayStart(y, m, d, tz) {
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - offsetMs(new Date(guess), tz));
}

function todayRange(tz, at = new Date()) {
  tz = safeTz(tz);
  const { y, m, d } = parts(at, tz);
  const start = dayStart(y, m, d, tz);
  return { start, end: new Date(dayStart(y, m, d + 1, tz).getTime() - 1) };
}

function monthRange(tz, at = new Date()) {
  tz = safeTz(tz);
  const { y, m } = parts(at, tz);
  return { start: dayStart(y, m, 1, tz), end: new Date(dayStart(y, m + 1, 1, tz).getTime() - 1) };
}

// 'YYYY-MM-DD' → start (or end) of that local day; other strings fall back to Date parsing.
// Returns null when unparseable.
function parseDay(str, tz, endOfDay = false) {
  if (str === undefined || str === null || str === '') return null;
  tz = safeTz(tz);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
  if (m) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    // reject impossible dates rather than letting Date roll 2026-13-01 into next year
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
    return endOfDay ? new Date(dayStart(y, mo, d + 1, tz).getTime() - 1) : dayStart(y, mo, d, tz);
  }
  const dt = new Date(str);
  return isNaN(dt) ? null : dt;
}

// Attendance is keyed by the saloon-local calendar date stored as UTC midnight,
// which is also what new Date('YYYY-MM-DD') yields for a manually marked day.
function dateKey(tz, at = new Date()) {
  const { y, m, d } = parts(at, safeTz(tz));
  return new Date(Date.UTC(y, m - 1, d));
}

function hhmm(tz, at = new Date()) {
  const { h, min } = parts(at, safeTz(tz));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Saloon-local calendar day as 'YYYY-MM-DD' (keys the day-wise bill approver roster)
function dayStr(tz, at = new Date()) {
  const { y, m, d } = parts(at, safeTz(tz));
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' shifted by n calendar days
function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// True for a real calendar date written as 'YYYY-MM-DD'
function isDayStr(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
  if (!m) return false;
  const probe = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return probe.getUTCMonth() === +m[2] - 1 && probe.getUTCDate() === +m[3];
}

module.exports = { DEFAULT_TZ, DAY_MS, safeTz, todayRange, monthRange, parseDay, dateKey, hhmm, dayStr, addDays, isDayStr };
