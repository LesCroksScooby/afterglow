/* The layered sky above the real terrain line.
   Its colours reflect the forecast: vivid when the score is high, slate grey when it is low. */
import { horizonAt } from '../horizon.js';

const SET = ['#20294f', '#3a376f', '#6f4580', '#b35577', '#e8805a', '#fbad62', '#ffd896'];
const RISE = ['#27346a', '#4a4f8f', '#8a6aa0', '#d08a9b', '#f4a98a', '#fccb91', '#fff0c2'];
const GREY = [66, 73, 88];
const PAGE = '#262b36';
const RIDGE = '#3a4251';

const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export function palette(kind, vivid) {
  return (kind === 'rise' ? RISE : SET).map((h, i, all) => {
    const c = rgbOf(h);
    const shade = GREY.map(v => v + i / (all.length - 1) * 58);
    return hex(c.map((v, k) => shade[k] + (v - shade[k]) * vivid));
  });
}

export const seedOf = str => [...str].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
function rng(seed) {
  let s = seed || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/* band edges: thinner and thinner towards the horizon */
export const BANDS = [0, .54, .67, .77, .85, .91, .96, 1];
const SUN_X = .68;
const FIELD = 70;   // degrees of horizon shown across the width

export function ridgePoints(W, base, az, profile) {
  const raw = [];
  const center = az ?? 250, lo = center > 180 ? 225 : 45, hi = lo + 90;
  /* the profile only covers 90°: beyond that it is mirrored to keep a continuous line */
  const fold = a => (a < lo ? lo + (lo - a) : a > hi ? hi - (a - hi) : a);
  for (let x = 0; x <= W; x += W / 40) raw.push(horizonAt(profile, fold(center + (x / W - SUN_X) * FIELD)));
  const min = Math.min(...raw), span = Math.max(...raw) - min;
  const k = W * .06 / Math.max(span, .4);
  return raw.map((a, i) => [i * W / 40, base - W * .025 - (a - min) * k]);
}

export function treelinePoints(W, base, seed) {
  const rand = rng(seed + 11), pts = [[0, base]];
  for (let x = 0; x < W;) {
    const w = W * (.012 + rand() * .018), h = W * (.018 + rand() * .035);
    pts.push([x + w / 2, base - h], [x + w, base - W * .004]);
    x += w;
  }
  return pts;
}

const poly = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

export function sceneSvg({ kind, vivid, scored, az, profile, seed }) {
  const W = 400, H = 476, horizon = 440;
  const colors = palette(kind, vivid);
  let g = '';
  colors.forEach((c, i) => {
    g += '<rect x="0" y="' + (BANDS[i] * horizon).toFixed(1) + '" width="' + W + '" height="' + ((BANDS[i + 1] - BANDS[i]) * horizon + 1).toFixed(1) + '" fill="' + c + '"/>';
  });

  /* long flat clouds, placed according to the forecast amount */
  const rand = rng(seed);
  const n = scored ? Math.round(scored.canvas * 7) : 2;
  for (let i = 0; i < n; i++) {
    const w = 90 + rand() * 170, y = horizon * (.56 + rand() * .3), x = rand() * (W + 60) - 60;
    const tone = colors[Math.min(6, 3 + Math.round(rand() * 3))];
    g += '<rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (3 + rand() * 6).toFixed(0) + '" rx="4" fill="' + tone + '"/>';
  }

  const hidden = scored && scored.light < .2;
  if (!hidden) {
    const r = 37;
    g += '<circle class="sun" cx="' + W * SUN_X + '" cy="' + (horizon - 16) + '" r="' + r + '" fill="#fff3d6"/>';
  }
  if (scored && scored.light < .55) {
    const k = Math.round((1 - scored.light) * 5);
    for (let i = 0; i < k; i++) {
      g += '<rect x="' + (rand() * 60 - 60).toFixed(0) + '" y="' + (horizon - 74 + i * 13).toFixed(0) + '" width="' + (W + 80) + '" height="11" rx="5" fill="' + hex(GREY.map(v => v + 18)) + '"/>';
    }
  }

  const ridge = ridgePoints(W, horizon, az, profile);
  g += '<polygon fill="' + RIDGE + '" points="0,' + H + ' ' + poly(ridge) + ' ' + W + ',' + H + '"/>';
  g += '<polygon fill="' + PAGE + '" points="0,' + H + ' ' + poly(treelinePoints(W, horizon + 24, seed)) + ' ' + W + ',' + (horizon + 24) + ' ' + W + ',' + H + '"/>';
  return '<svg class="scene" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + g + '</svg>';
}
