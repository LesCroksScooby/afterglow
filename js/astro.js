/* Soleil et lune (SunCalc, sans réseau). Altitudes et azimuts sont en degrés. */
import { HOME } from './config.js';
import { isD, parse, localTs, tzOffsetMin } from './time.js';

const SC = globalThis.SunCalc;
/* heures bleues : soleil entre −8° et −4° */
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

/* altitude toutes les 10 min, pour la courbe du jour */
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
  if (alt >= 6) return 'Plein jour';
  if (alt >= -0.833) return 'Heure dorée';
  if (alt >= -4) return morning ? 'Aube civile' : 'Crépuscule civil';
  if (alt >= -8) return 'Heure bleue';
  if (alt >= -12) return morning ? 'Aube nautique' : 'Crépuscule nautique';
  if (alt >= -18) return morning ? 'Aube astronomique' : 'Crépuscule astronomique';
  return 'Nuit noire';
}

export const moonName = ph =>
  ph < .03 || ph >= .97 ? 'Nouvelle lune' : ph < .22 ? 'Premier croissant' : ph < .28 ? 'Premier quartier' :
  ph < .47 ? 'Gibbeuse croissante' : ph < .53 ? 'Pleine lune' : ph < .72 ? 'Gibbeuse décroissante' :
  ph < .78 ? 'Dernier quartier' : 'Dernier croissant';

/* prochaine nouvelle (0) ou pleine (0.5) lune */
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
