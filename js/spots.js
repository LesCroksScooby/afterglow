/* Your viewpoints: will the sun line up, and when should you leave? */
import { store } from './store.js';

const KEY = 'afterglow-spots-v1';
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
  if (facing == null || eventAz == null) return { level: 1, text: 'Open view all round' };
  const gap = angleGap(eventAz, facing);
  if (gap <= 20) return { level: 2, text: 'Right in line' };
  if (gap <= 45) return { level: 1, text: 'At an angle' };
  return { level: 0, text: 'Out of view' };
}

/* leave so as to arrive 30 min before the sun disappears */
export const departure = (realTs, travelMin) => realTs - (30 + (travelMin || 0)) * 60000;
