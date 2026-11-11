/* Dates, local time at the chosen place, and number formatting. */
import { TZ } from './config.js';

export const pad = n => String(n).padStart(2, '0');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const isD = d => d instanceof Date && !isNaN(+d);

const LOCALE = 'en-GB';
const fmtHM = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fmtLong = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fmtWd = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: 'short' });
const fmtWdLong = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: 'long' });
const fmtDM = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric', month: 'long' });
const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

export const hm = d => (isD(d) ? fmtHM.format(d) : '—');
export const longDate = d => fmtLong.format(d).replace(',', '');
export const shortDay = d => fmtWd.format(d);
export const weekday = d => fmtWdLong.format(d);
export const dayMonth = d => fmtDM.format(d);
export const num = (v, dec = 0) =>
  (v == null || isNaN(v)) ? '—' : (+v.toFixed(dec) + 0).toLocaleString(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function localParts(ts) {
  const p = {};
  partsFmt.formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; });
  return { y: +p.year, mo: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute, s: +p.second };
}
export function tzOffsetMin(ts) {
  const p = localParts(ts);
  return (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000) / 60000;
}
/* local wall-clock time → real timestamp */
export function localTs(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = tzOffsetMin(guess);
  let ts = guess - off * 60000;
  const off2 = tzOffsetMin(ts);
  if (off2 !== off) ts = guess - off2 * 60000;
  return ts;
}
export const dateStr = p => p.y + '-' + pad(p.mo) + '-' + pad(p.d);
export const parse = s => s.split('-').map(Number);
export function addDays(s, n) {
  const [y, m, d] = parse(s);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function diffDays(a, b) {
  const [y1, m1, d1] = parse(a), [y2, m2, d2] = parse(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
export function localNow() {
  const p = localParts(Date.now());
  return { str: dateStr(p), min: p.h * 60 + p.mi };
}
export const minOfDay = ts => { const p = localParts(ts); return p.h * 60 + p.mi + p.s / 60; };
export const clock = min => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
export const dur = min => { const t = Math.round(min); return Math.floor(t / 60) + 'h ' + pad(t % 60) + 'm'; };
export function fmtIn(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? h + 'h ' + pad(m % 60) + 'm' : m + ' min';
}
export function relDay(rel) {
  if (rel === 0) return 'Today';
  if (rel === 1) return 'Tomorrow';
  if (rel === -1) return 'Yesterday';
  return rel > 0 ? 'In ' + rel + ' days' : rel * -1 + ' days ago';
}

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const dirName = b => DIRS[Math.round((((b % 360) + 360) % 360) / 22.5) % 16];
const DIR_WORDS = ['to the north', 'to the north-east', 'to the east', 'to the south-east', 'to the south', 'to the south-west', 'to the west', 'to the north-west'];
export const dirWord = b => DIR_WORDS[Math.round((((b % 360) + 360) % 360) / 45) % 8];
