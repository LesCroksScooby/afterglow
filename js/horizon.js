/* Vrai horizon : profil du relief autour d'un point (données d'altitude Open-Meteo, ~90 m).
   Les arbres et les maisons ne sont pas dans ces données. */
import { store } from './store.js';

const AZS = [];
for (let a = 45; a <= 135; a += 5) AZS.push(a);
for (let a = 225; a <= 315; a += 5) AZS.push(a);
const DIST = [.3, .6, 1, 1.5, 2.5, 4, 6, 9, 14, 20];   // km
const EARTH = 6371;
const KEY = 'soleil-horizon-v1';
const CHUNK = 100;

export function destination(lat, lon, az, km) {
  const r = az * Math.PI / 180;
  return [lat + km * Math.cos(r) / 111.2, lon + km * Math.sin(r) / (111.2 * Math.cos(lat * Math.PI / 180))];
}

/* angle du relief au-dessus de l'horizontale, courbure terrestre et réfraction comprises */
export function elevationAngle(dh, km) {
  const drop = km * km / (2 * EARTH) * 1000 * .87;
  return Math.atan((dh - drop) / (km * 1000)) * 180 / Math.PI;
}

export function buildProfile(center, elevations) {
  let k = 0;
  const angles = AZS.map(() => {
    let best = -90;
    for (const km of DIST) {
      const a = elevationAngle(elevations[k++] - center, km);
      if (a > best) best = a;
    }
    return +best.toFixed(2);
  });
  return { azs: AZS, angles };
}

export function horizonAt(profile, az) {
  if (!profile) return 0;
  const { azs, angles } = profile;
  for (let i = 1; i < azs.length; i++) {
    if (az >= azs[i - 1] && az <= azs[i] && azs[i] - azs[i - 1] <= 5) {
      const t = (az - azs[i - 1]) / (azs[i] - azs[i - 1]);
      return angles[i - 1] + (angles[i] - angles[i - 1]) * t;
    }
  }
  return 0;
}

/* À l'heure officielle, position() donne −0,35° (réfraction incluse) : le bord du soleil touche alors l'horizon plat.
   Un horizon sous 0° est ramené à 0 : au-delà, c'est la forêt qui décide. */
const LIMB = .35;
export function realEvent(kind, official, profile, sunPos) {
  if (!(official instanceof Date) || !profile) return official;
  const step = kind === 'set' ? -60000 : 60000;
  const visible = ts => {
    const p = sunPos(new Date(ts));
    return p.altitude + LIMB > Math.max(0, horizonAt(profile, p.azimuth));
  };
  for (let i = 0; i <= 240; i++) {
    const ts = official.getTime() + i * step;
    if (visible(ts)) return new Date(ts);
  }
  return official;
}

const keyOf = (lat, lon) => lat.toFixed(4) + ',' + lon.toFixed(4);
export const cachedProfile = (lat, lon) => (store.get(KEY, {})[keyOf(lat, lon)] || null);

export async function fetchProfile(lat, lon) {
  const cached = cachedProfile(lat, lon);
  if (cached) return cached;
  const pts = [[lat, lon]];
  AZS.forEach(az => DIST.forEach(km => pts.push(destination(lat, lon, az, km))));
  const elevations = [];
  for (let i = 0; i < pts.length; i += CHUNK) {
    const part = pts.slice(i, i + CHUNK);
    const url = 'https://api.open-meteo.com/v1/elevation?latitude=' + part.map(p => p[0].toFixed(4)).join(',') +
      '&longitude=' + part.map(p => p[1].toFixed(4)).join(',');
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    elevations.push(...(await r.json()).elevation);
  }
  const profile = buildProfile(elevations[0], elevations.slice(1));
  const all = store.get(KEY, {});
  all[keyOf(lat, lon)] = profile;
  store.set(KEY, all);
  return profile;
}
