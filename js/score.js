/* Sunrise / sunset beauty score (0–100).
   The idea: a sky lights up when two things come together.
   1. The light gets through: no low or mid clouds on its path, towards the sun.
   2. It has a canvas: high or mid clouds above the observer.
   An empty sky stays pretty but subtle: it tops out around 50. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* smooth curve: amount of high/mid cloud → canvas quality (0–1) */
const CANVAS = [[0, 0], [15, .25], [35, .9], [60, 1], [85, .6], [100, .3]];
export function canvasQuality(cover) {
  const c = clamp(cover, 0, 100);
  for (let i = 1; i < CANVAS.length; i++) {
    const [x0, y0] = CANVAS[i - 1], [x1, y1] = CANVAS[i];
    if (c <= x1) return y0 + (y1 - y0) * (c - x0) / (x1 - x0);
  }
  return CANVAS[CANVAS.length - 1][1];
}

/* share of the sky blocking the light on its path (0–100), from nearest to farthest point */
export function pathBlockage(path) {
  const weights = [.4, .35, .25];
  let sum = 0, total = 0;
  path.forEach((p, i) => {
    if (p == null || p.low == null) return;
    sum += clamp(p.low + .55 * (p.mid ?? 0), 0, 100) * weights[i];
    total += weights[i];
  });
  return total ? sum / total : null;
}

export function labelFor(score) {
  if (score >= 80) return { label: 'Exceptional', verdict: 'Don’t miss it' };
  if (score >= 60) return { label: 'Gorgeous', verdict: 'Worth going out' };
  if (score >= 40) return { label: 'Subtle', verdict: 'Pretty but subtle' };
  if (score >= 20) return { label: 'Dull', verdict: 'Nothing special' };
  return { label: 'Clouded out', verdict: 'Stay in' };
}

/* w: local weather at the time of the event; path: clouds towards the sun, or null */
export function computeScore(w, path, where = 'towards the sun') {
  if (!w || w.total == null) return null;
  const low = w.low ?? 0, mid = w.mid ?? 0, high = w.high ?? 0;
  const vis = w.vis ?? 20000, pp = w.pp ?? 0, pr = w.precip ?? 0;

  const blocked = path ? pathBlockage(path) : null;
  const opening = blocked == null ? 1 : clamp(1 - (blocked - 20) / 65, 0, 1);
  const localClear = clamp(1 - (low - 15) / 70, 0, 1);
  const light = opening * localClear;
  const cover = Math.max(high, mid * .85);
  const canvas = canvasQuality(cover);
  const clarity = clamp(vis / 15000, 0, 1);

  let s = 100 * (.10 + .25 * light + .55 * canvas * light + .10 * clarity);
  if (pr > .2) s *= .5;
  if (pp >= 70) s = Math.min(s, 25);
  if (low >= 85) s = Math.min(s, 12);
  s = Math.round(clamp(s, 0, 100));

  const reasons = [];
  if (pr > .2 || pp >= 60) reasons.push('Rain likely');
  if (blocked != null && blocked >= 55) reasons.push('Thick clouds ' + where + ', the light won’t get through');
  else if (blocked != null && blocked < 25) reasons.push('Clear path ' + where);
  if (low >= 50) reasons.push('Low clouds overhead');
  if (light > .5 && cover >= 25 && cover <= 80) reasons.push('High clouds well placed to catch the colour');
  else if (light > .5 && cover < 15) reasons.push('Almost empty sky, few clouds to catch the colour');
  else if (cover > 85 && low < 50) reasons.push('Very thick veil, muted colours');
  if (vis < 5000) reasons.push('Haze or fog');
  if (!reasons.length) reasons.push('Nothing remarkable forecast');

  return { score: s, light, canvas, blocked, directional: blocked != null, reasons: reasons.slice(0, 2), w };
}

export function reliability(lead) {
  if (lead < 0) return { level: 0, text: 'Past day' };
  if (lead <= 1) return { level: 3, text: 'Reliable forecast' };
  if (lead <= 3) return { level: 2, text: 'Fairly reliable' };
  if (lead <= 5) return { level: 1, text: 'Needs confirming' };
  return { level: 0, text: 'Rough trend' };
}

/* Journal: average gap between your ratings and the raw score, cautious while there are few ratings. */
export function calibrationOffset(entries) {
  const used = entries.filter(e => e.raw != null && e.rating != null);
  if (used.length < 3) return 0;
  const mean = used.reduce((sum, e) => sum + ((e.rating - 1) * 25 - e.raw), 0) / used.length;
  return Math.round(clamp(mean * used.length / (used.length + 5), -20, 20));
}
export const applyOffset = (score, offset) => Math.round(clamp(score + offset, 0, 100));
