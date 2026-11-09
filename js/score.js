/* Score « beau lever / coucher » (0–100).
   Idée : pour que le ciel s'embrase il faut deux choses.
   1. Que la lumière arrive : pas de nuages bas ou moyens sur sa route, vers le soleil.
   2. Qu'elle ait une toile : des nuages hauts ou moyens au-dessus de l'observateur.
   Un ciel vide reste joli mais sobre : il plafonne autour de 50. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* courbe continue : quantité de nuages hauts/moyens → qualité de la toile (0–1) */
const CANVAS = [[0, 0], [15, .25], [35, .9], [60, 1], [85, .6], [100, .3]];
export function canvasQuality(cover) {
  const c = clamp(cover, 0, 100);
  for (let i = 1; i < CANVAS.length; i++) {
    const [x0, y0] = CANVAS[i - 1], [x1, y1] = CANVAS[i];
    if (c <= x1) return y0 + (y1 - y0) * (c - x0) / (x1 - x0);
  }
  return CANVAS[CANVAS.length - 1][1];
}

/* part du ciel qui bloque la lumière sur sa route (0–100), du point le plus proche au plus loin */
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
  if (score >= 80) return { label: 'Exceptionnel', verdict: 'À ne pas rater' };
  if (score >= 60) return { label: 'Très beau', verdict: 'Ça vaut le coup' };
  if (score >= 40) return { label: 'Sobre', verdict: 'Joli mais discret' };
  if (score >= 20) return { label: 'Fade', verdict: 'Sans plus' };
  return { label: 'Bouché', verdict: 'Reste au chaud' };
}

/* w : météo locale à l'heure de l'événement ; path : nuages vers le soleil, ou null */
export function computeScore(w, path, where = 'vers le soleil') {
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
  if (pr > .2 || pp >= 60) reasons.push('Risque de pluie');
  if (blocked != null && blocked >= 55) reasons.push('Nuages épais ' + where + ', la lumière ne passera pas');
  else if (blocked != null && blocked < 25) reasons.push('Route dégagée ' + where);
  if (low >= 50) reasons.push('Nuages bas au-dessus de toi');
  if (light > .5 && cover >= 25 && cover <= 80) reasons.push('Nuages hauts bien placés pour prendre la couleur');
  else if (light > .5 && cover < 15) reasons.push('Ciel presque vide, peu de nuages pour prendre la couleur');
  else if (cover > 85 && low < 50) reasons.push('Voile très épais, couleurs atténuées');
  if (vis < 5000) reasons.push('Brume ou brouillard');
  if (!reasons.length) reasons.push('Rien de marquant annoncé');

  return { score: s, light, canvas, blocked, directional: blocked != null, reasons: reasons.slice(0, 2), w };
}

export function reliability(lead) {
  if (lead < 0) return { level: 0, text: 'Jour passé' };
  if (lead <= 1) return { level: 3, text: 'Prévision fiable' };
  if (lead <= 3) return { level: 2, text: 'Assez fiable' };
  if (lead <= 5) return { level: 1, text: 'À confirmer' };
  return { level: 0, text: 'Simple tendance' };
}

/* Carnet : écart moyen entre tes notes et le score brut, prudent tant qu'il y a peu de notes. */
export function calibrationOffset(entries) {
  const used = entries.filter(e => e.raw != null && e.rating != null);
  if (used.length < 3) return 0;
  const mean = used.reduce((sum, e) => sum + ((e.rating - 1) * 25 - e.raw), 0) / used.length;
  return Math.round(clamp(mean * used.length / (used.length + 5), -20, 20));
}
export const applyOffset = (score, offset) => Math.round(clamp(score + offset, 0, 100));
