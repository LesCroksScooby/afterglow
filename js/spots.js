/* Tes lieux de photo : le soleil sera-t-il dans l'axe, et quand partir ? */
import { store } from './store.js';

const KEY = 'soleil-spots-v1';
export const loadSpots = () => store.get(KEY, []);
export const saveSpots = list => store.set(KEY, list);

export function parseCoords(text) {
  const m = String(text).trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[;,\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = +m[1].replace(',', '.'), lon = +m[2].replace(',', '.');
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

const angleGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

export function alignment(eventAz, facing) {
  if (facing == null || eventAz == null) return { level: 1, text: 'Vue dégagée tout autour' };
  const gap = angleGap(eventAz, facing);
  if (gap <= 20) return { level: 2, text: 'Dans l’axe' };
  if (gap <= 45) return { level: 1, text: 'De biais' };
  return { level: 0, text: 'Hors champ' };
}

/* partir pour arriver 30 min avant la disparition du soleil */
export const departure = (realTs, travelMin) => realTs - (30 + (travelMin || 0)) * 60000;
