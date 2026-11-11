/* Sun and moon (SunCalc, no network needed). Altitudes and azimuths are in degrees. */
import { HOME } from './config.js';
import { isD, parse, localTs, tzOffsetMin } from './time.js';

const SC = globalThis.SunCalc;
/* blue hours: sun between −8° and −4° */
SC.addTime(-8, 'blueAMStart', 'blueEveEnd');
SC.addTime(-4, 'blueAMEnd', 'blueEveStart');

export const position = (date, lat = HOME.lat, lon = HOME.lon) => SC.getPosition(date, lat, lon);

export function timesAt(str, lat, lon) {
  const [y, m, d] = parse(str);
  const ref = new Date(Date.UTC(y, m - 1, d, 12));
  return SC.getTimes(ref, lat, lon, 0, tzOffsetMin(ref.getTime()));
}

const cache = new Map();
export function sunDay(str) {
  if (cache.has(str)) return cache.get(str);
  const [y, m, d] = parse(str);
  const ref = new Date(Date.UTC(y, m - 1, d, 12));
  const off = tzOffsetMin(ref.getTime());
  const T = SC.getTimes(ref, HOME.lat, HOME.lon, 0, off);
  const az = dt => (isD(dt) ? position(dt).azimuth : null);
  const S = {
    str, ref, off, T,
    riseAz: az(T.sunrise),
    setAz: az(T.sunset),
    noonAlt: position(T.solarNoon).altitude,
    dayLen: (isD(T.sunrise) && isD(T.sunset)) ? (T.sunset - T.sunrise) / 60000 : 0,
    pts: null
  };
  cache.set(str, S);
  return S;
}

/* altitude every 10 min, for the day curve */
export function dayCurve(S) {
  if (S.pts) return S.pts;
  const [y, m, d] = parse(S.str);
  const pts = [];
  for (let mn = 0; mn <= 1440; mn += 10) {
    const ts = localTs(y, m, d, Math.floor(mn / 60), mn % 60);
    pts.push([mn, position(new Date(ts)).altitude]);
  }
  S.pts = pts;
  return pts;
}

export function phaseName(alt, morning) {
  if (alt >= 6) return 'Daylight';
  if (alt >= -0.833) return 'Golden hour';
  if (alt >= -4) return morning ? 'Civil dawn' : 'Civil dusk';
  if (alt >= -8) return 'Blue hour';
  if (alt >= -12) return morning ? 'Nautical dawn' : 'Nautical dusk';
  if (alt >= -18) return morning ? 'Astronomical dawn' : 'Astronomical dusk';
  return 'Full darkness';
}

export const moonName = ph =>
  ph < .03 || ph >= .97 ? 'New moon' : ph < .22 ? 'Waxing crescent' : ph < .28 ? 'First quarter' :
  ph < .47 ? 'Waxing gibbous' : ph < .53 ? 'Full moon' : ph < .72 ? 'Waning gibbous' :
  ph < .78 ? 'Last quarter' : 'Waning crescent';

/* next new (0) or full (0.5) moon */
export function nextPhase(fromTs, target) {
  const f = ts => ((SC.getMoonIllumination(new Date(ts)).phase - target + 1.5) % 1) - 0.5;
  let prev = f(fromTs);
  for (let i = 1; i <= 24 * 32; i++) {
    const ts = fromTs + i * 3600e3;
    const cur = f(ts);
    if (prev < 0 && cur >= 0) return new Date(ts);
    prev = cur;
  }
  return null;
}

export const moonIllum = date => SC.getMoonIllumination(date);
export const moonPos = date => SC.getMoonPosition(date, HOME.lat, HOME.lon);
export const moonTimes = S => SC.getMoonTimes(S.ref, HOME.lat, HOME.lon, S.off);
