/* Prévisions Open-Meteo : météo sur place et nuages sur la route du soleil. */
import { HOME, TZ, WX_TTL, FETCH_TIMEOUT } from './config.js';
import { sunDay } from './astro.js';
import { destination } from './horizon.js';
import { addDays, dateStr, pad, localNow, localParts } from './time.js';
import { store } from './store.js';

const KEY = 'soleil-wx-v2';
const BASE = 'https://api.open-meteo.com/v1/forecast?';
const COMMON = '&timezone=' + encodeURIComponent(TZ) + '&past_days=1&forecast_days=10';
const PATH_KM = [40, 90, 150];

const homeUrl = () => BASE + 'latitude=' + HOME.lat + '&longitude=' + HOME.lon +
  '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,pressure_msl,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunshine_duration' +
  '&wind_speed_unit=kmh' + COMMON;

/* Trois points vers le lever puis trois vers le coucher. L'azimut change peu en 10 jours : on prend celui de J+3. */
function pathUrl() {
  const S = sunDay(addDays(localNow().str, 3));
  const pts = [S.riseAz, S.setAz].flatMap(az => PATH_KM.map(km => destination(HOME.lat, HOME.lon, az ?? 180, km)));
  return BASE + 'latitude=' + pts.map(p => p[0].toFixed(3)).join(',') +
    '&longitude=' + pts.map(p => p[1].toFixed(3)).join(',') +
    '&hourly=cloud_cover_low,cloud_cover_mid' + COMMON;
}

export const wx = { data: null, path: null, status: 'loading', stamp: 0 };

function index(j) {
  const hourIdx = {}, dayIdx = {};
  j.hourly.time.forEach((t, i) => { hourIdx[t] = i; });
  j.daily.time.forEach((t, i) => { dayIdx[t] = i; });
  return { H: j.hourly, D: j.daily, hourIdx, dayIdx };
}
function apply(o, status) {
  wx.data = index(o.home);
  wx.path = o.path || null;
  wx.stamp = o.t;
  wx.status = status;
}

const hourKey = ts => {
  const p = localParts(Math.round(ts / 3600000) * 3600000);
  return dateStr(p) + 'T' + pad(p.h) + ':00';
};

export function hourData(ts) {
  if (!wx.data) return null;
  const i = wx.data.hourIdx[hourKey(ts)];
  if (i == null) return null;
  const H = wx.data.H, g = k => (H[k] ? H[k][i] : null);
  return {
    temp: g('temperature_2m'), app: g('apparent_temperature'), hum: g('relative_humidity_2m'),
    pp: g('precipitation_probability'), precip: g('precipitation'), code: g('weather_code'),
    pres: g('pressure_msl'), total: g('cloud_cover'), low: g('cloud_cover_low'), mid: g('cloud_cover_mid'),
    high: g('cloud_cover_high'), vis: g('visibility'), wind: g('wind_speed_10m'), dir: g('wind_direction_10m'),
    gust: g('wind_gusts_10m')
  };
}

export function dayData(str) {
  if (!wx.data) return null;
  const i = wx.data.dayIdx[str];
  if (i == null) return null;
  const D = wx.data.D, g = k => (D[k] ? D[k][i] : null);
  return {
    code: g('weather_code'), tmax: g('temperature_2m_max'), tmin: g('temperature_2m_min'),
    rain: g('precipitation_sum'), pp: g('precipitation_probability_max'), wind: g('wind_speed_10m_max'),
    uv: g('uv_index_max'), sun: g('sunshine_duration')
  };
}

export function pathData(ts, kind) {
  if (!wx.path) return null;
  const key = hourKey(ts);
  const part = wx.path.slice(kind === 'rise' ? 0 : 3, kind === 'rise' ? 3 : 6);
  const pts = part.map(loc => {
    const i = loc.hourly.time.indexOf(key);
    return i < 0 ? null : { low: loc.hourly.cloud_cover_low[i], mid: loc.hourly.cloud_cover_mid[i] };
  });
  return pts.some(Boolean) ? pts : null;
}

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

/* Affiche tout de suite ce qui est en mémoire, puis actualise. onChange est appelé à chaque nouvel état. */
export async function loadWeather(force, onChange) {
  const cached = store.get(KEY, null);
  const hasCache = cached && cached.home;
  if (hasCache) {
    apply(cached, 'ok');
    onChange();
    if (!force && Date.now() - cached.t < WX_TTL) return;
  }
  try {
    const [home, path] = await Promise.all([getJson(homeUrl()), getJson(pathUrl()).catch(() => null)]);
    const o = { t: Date.now(), home, path };
    store.set(KEY, o);
    apply(o, 'ok');
  } catch (e) {
    if (hasCache) wx.status = 'offline';
    else { wx.data = null; wx.status = 'error'; }
  }
  onChange();
}

/* Couples symbole / libellé des codes météo */
const WMO = {
  0: ['sun', 'Ciel dégagé'], 1: ['sun', 'Plutôt dégagé'], 2: ['partly', 'Partiellement nuageux'], 3: ['cloud', 'Couvert'],
  45: ['fog', 'Brouillard'], 48: ['fog', 'Brouillard givrant'],
  51: ['rain', 'Bruine légère'], 53: ['rain', 'Bruine'], 55: ['rain', 'Bruine dense'],
  56: ['rain', 'Bruine verglaçante'], 57: ['rain', 'Bruine verglaçante'],
  61: ['rain', 'Pluie faible'], 63: ['rain', 'Pluie'], 65: ['rain', 'Pluie forte'],
  66: ['rain', 'Pluie verglaçante'], 67: ['rain', 'Pluie verglaçante'],
  71: ['snow', 'Neige faible'], 73: ['snow', 'Neige'], 75: ['snow', 'Neige forte'], 77: ['snow', 'Grains de neige'],
  80: ['rain', 'Averses'], 81: ['rain', 'Averses'], 82: ['storm', 'Fortes averses'],
  85: ['snow', 'Averses de neige'], 86: ['snow', 'Fortes averses de neige'],
  95: ['storm', 'Orage'], 96: ['storm', 'Orage et grêle'], 99: ['storm', 'Orage et forte grêle']
};
export const wmo = (c, night) => {
  const w = WMO[c] || ['cloud', 'Indéterminé'];
  return [night && (c === 0 || c === 1) ? 'moon' : w[0], w[1]];
};
