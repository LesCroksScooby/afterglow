/* Open-Meteo forecasts: local weather and clouds on the sun’s path. */
import { HOME, TZ, WX_TTL, FETCH_TIMEOUT } from './config.js';
import { sunDay } from './astro.js';
import { destination } from './horizon.js';
import { addDays, dateStr, pad, localNow, localParts } from './time.js';
import { store } from './store.js';

const KEY = 'afterglow-wx-v2';
const BASE = 'https://api.open-meteo.com/v1/forecast?';
const COMMON = '&timezone=' + encodeURIComponent(TZ) + '&past_days=1&forecast_days=10';
const PATH_KM = [40, 90, 150];

const homeUrl = () => BASE + 'latitude=' + HOME.lat + '&longitude=' + HOME.lon +
  '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,pressure_msl,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunshine_duration' +
  '&wind_speed_unit=kmh' + COMMON;

/* Three points towards sunrise, then three towards sunset. The azimuth barely changes over 10 days: the one for day +3 is used. */
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

/* Shows saved data immediately, then refreshes. onChange is called on every new state. */
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

/* Symbol / label pairs for weather codes */
const WMO = {
  0: ['sun', 'Clear sky'], 1: ['sun', 'Mostly clear'], 2: ['partly', 'Partly cloudy'], 3: ['cloud', 'Overcast'],
  45: ['fog', 'Fog'], 48: ['fog', 'Freezing fog'],
  51: ['rain', 'Light drizzle'], 53: ['rain', 'Drizzle'], 55: ['rain', 'Dense drizzle'],
  56: ['rain', 'Freezing drizzle'], 57: ['rain', 'Freezing drizzle'],
  61: ['rain', 'Light rain'], 63: ['rain', 'Rain'], 65: ['rain', 'Heavy rain'],
  66: ['rain', 'Freezing rain'], 67: ['rain', 'Freezing rain'],
  71: ['snow', 'Light snow'], 73: ['snow', 'Snow'], 75: ['snow', 'Heavy snow'], 77: ['snow', 'Snow grains'],
  80: ['rain', 'Showers'], 81: ['rain', 'Showers'], 82: ['storm', 'Heavy showers'],
  85: ['snow', 'Snow showers'], 86: ['snow', 'Heavy snow showers'],
  95: ['storm', 'Thunderstorm'], 96: ['storm', 'Thunderstorm with hail'], 99: ['storm', 'Thunderstorm with heavy hail']
};
export const wmo = (c, night) => {
  const w = WMO[c] || ['cloud', 'Unknown'];
  return [night && (c === 0 || c === 1) ? 'moon' : w[0], w[1]];
};
