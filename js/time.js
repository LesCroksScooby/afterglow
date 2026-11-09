/* Dates, heures du lieu et mise en forme des nombres. */
import { TZ } from './config.js';

export const pad = n => String(n).padStart(2, '0');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const isD = d => d instanceof Date && !isNaN(+d);

const fmtHM = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fmtLong = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fmtWd = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'short' });
const fmtWdLong = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long' });
const fmtDM = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'long' });
const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

export const hm = d => (isD(d) ? fmtHM.format(d) : '—');
export const longDate = d => fmtLong.format(d);
export const shortDay = d => fmtWd.format(d).replace('.', '');
export const weekday = d => fmtWdLong.format(d);
export const dayMonth = d => fmtDM.format(d);
export const num = (v, dec = 0) =>
  (v == null || isNaN(v)) ? '—' : (+v.toFixed(dec) + 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function localParts(ts) {
  const p = {};
  partsFmt.formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; });
  return { y: +p.year, mo: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute, s: +p.second };
}
export function tzOffsetMin(ts) {
  const p = localParts(ts);
  return (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000) / 60000;
}
/* heure « murale » du lieu → timestamp réel */
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
export const dur = min => { const t = Math.round(min); return Math.floor(t / 60) + ' h ' + pad(t % 60); };
export function fmtIn(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? h + ' h ' + pad(m % 60) : m + ' min';
}
export function relDay(rel) {
  if (rel === 0) return 'Aujourd’hui';
  if (rel === 1) return 'Demain';
  if (rel === -1) return 'Hier';
  return rel > 0 ? 'Dans ' + rel + ' jours' : 'Il y a ' + (-rel) + ' jours';
}

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export const dirName = b => DIRS[Math.round((((b % 360) + 360) % 360) / 22.5) % 16];
const DIR_WORDS = ['au nord', 'au nord-est', 'à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest'];
export const dirWord = b => DIR_WORDS[Math.round((((b % 360) + 360) % 360) / 45) % 8];
