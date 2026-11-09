/* Partage d'une image du soir et envoi de fichiers vers le téléphone. */
import { BANDS, palette, ridgePoints, seedOf, treelinePoints } from './ui/scene.js';
import { HOME } from './config.js';
import { cap, hm, longDate } from './time.js';

/* Renvoie 'shared', 'saved' ou 'cancelled' */
export async function deliverFile(blob, name, title) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'saved';
}

function fill(ctx, color, pts, W, H) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  pts.forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

export async function eveningImage(E) {
  const W = 1080, H = 1350, horizon = 1140;
  if (document.fonts && document.fonts.load) await document.fonts.load('300px "Instrument Serif"').catch(() => {});
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const vivid = E.scored ? Math.min(1, .35 + E.scored.score / 110) : .7;
  palette(E.kind, vivid).forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(0, BANDS[i] * horizon, W, (BANDS[i + 1] - BANDS[i]) * horizon + 1);
  });
  c.fillStyle = '#fff3d6';
  c.beginPath();
  c.arc(W * .68, horizon - 40, 100, 0, Math.PI * 2);
  c.fill();
  fill(c, '#3a4251', ridgePoints(W, horizon, E.az, E.profile), W, H);
  fill(c, '#262b36', treelinePoints(W, horizon + 62, seedOf(E.str)), W, H);

  c.fillStyle = '#f0ebdf';
  c.textBaseline = 'alphabetic';
  c.font = '300px "Instrument Serif", Georgia, serif';
  c.fillText(hm(E.time), 72, 390);
  c.font = '64px "Instrument Serif", Georgia, serif';
  c.fillText((E.kind === 'set' ? 'Coucher' : 'Lever') + ' du soleil', 80, 112 + 30);
  c.font = '44px system-ui, sans-serif';
  c.fillText(HOME.name, 80, H - 112);
  c.font = '36px system-ui, sans-serif';
  c.fillStyle = '#c6ccd7';
  c.fillText(cap(longDate(E.S.ref)), 80, H - 60);
  if (E.scored) {
    c.fillStyle = '#f0ebdf';
    c.textAlign = 'right';
    c.font = '150px "Instrument Serif", Georgia, serif';
    c.fillText(String(E.scored.score), W - 80, H - 60);
    c.textAlign = 'left';
  }
  return new Promise(res => cv.toBlob(res, 'image/png'));
}
