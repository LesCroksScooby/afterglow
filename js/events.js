/* Rendez-vous du ciel : pluies d'étoiles (dates fixes) et éclipses de lune visibles du lieu (catalogue NASA, 2028–2030). */
import { moonIllum, moonPos } from './astro.js';
import { num, localParts } from './time.js';

const SHOWERS = [
  [1, 3, 'Quadrantides'], [4, 22, 'Lyrides'], [5, 6, 'Êta Aquarides'], [8, 12, 'Perséides'],
  [10, 21, 'Orionides'], [11, 17, 'Léonides'], [12, 14, 'Géminides']
];

/* instant du maximum (UTC) */
const LUNAR = [
  ['2028-01-12T04:13:00Z', 'Éclipse partielle de lune'],
  ['2028-07-06T18:20:00Z', 'Éclipse partielle de lune'],
  ['2028-12-31T16:52:00Z', 'Éclipse totale de lune'],
  ['2029-06-26T03:22:00Z', 'Éclipse totale de lune'],
  ['2029-12-20T22:42:00Z', 'Éclipse totale de lune'],
  ['2030-06-15T18:33:00Z', 'Éclipse partielle de lune']
];

export function upcoming(now, limit = 5) {
  const items = [];
  const { y } = localParts(now);
  for (const year of [y, y + 1]) {
    for (const [mo, d, name] of SHOWERS) {
      const ts = Date.UTC(year, mo - 1, d, 22);
      if (ts < now - 864e5) continue;
      const ill = moonIllum(new Date(ts)).fraction;
      items.push({ ts, title: 'Pluie d’étoiles des ' + name,
        detail: 'Lune éclairée à ' + num(ill * 100) + ' %, ' + (ill < .35 ? 'bonne nuit pour observer' : 'les plus faibles seront noyées') });
    }
  }
  for (const [iso, title] of LUNAR) {
    const ts = Date.parse(iso);
    if (ts > now && moonPos(new Date(ts)).altitude > 0) items.push({ ts, title, detail: 'Lune levée au maximum de l’éclipse' });
  }
  return items.sort((a, b) => a.ts - b.ts).slice(0, limit);
}
