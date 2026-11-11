/* Sky events: meteor showers (fixed dates) and lunar eclipses visible from the chosen place (NASA catalogue, 2028–2030). */
import { moonIllum, moonPos } from './astro.js';
import { num, localParts } from './time.js';

const SHOWERS = [
  [1, 3, 'Quadrantids'], [4, 22, 'Lyrids'], [5, 6, 'Eta Aquariids'], [8, 12, 'Perseids'],
  [10, 21, 'Orionids'], [11, 17, 'Leonids'], [12, 14, 'Geminids']
];

/* time of greatest eclipse (UTC) */
const LUNAR = [
  ['2028-01-12T04:13:00Z', 'Partial lunar eclipse'],
  ['2028-07-06T18:20:00Z', 'Partial lunar eclipse'],
  ['2028-12-31T16:52:00Z', 'Total lunar eclipse'],
  ['2029-06-26T03:22:00Z', 'Total lunar eclipse'],
  ['2029-12-20T22:42:00Z', 'Total lunar eclipse'],
  ['2030-06-15T18:33:00Z', 'Partial lunar eclipse']
];

export function upcoming(now, limit = 5) {
  const items = [];
  const { y } = localParts(now);
  for (const year of [y, y + 1]) {
    for (const [mo, d, name] of SHOWERS) {
      const ts = Date.UTC(year, mo - 1, d, 22);
      if (ts < now - 864e5) continue;
      const ill = moonIllum(new Date(ts)).fraction;
      items.push({ ts, title: name + ' meteor shower',
        detail: 'Moon ' + num(ill * 100) + '% lit, ' + (ill < .35 ? 'a good night to watch' : 'the faintest ones will be washed out') });
    }
  }
  for (const [iso, title] of LUNAR) {
    const ts = Date.parse(iso);
    if (ts > now && moonPos(new Date(ts)).altitude > 0) items.push({ ts, title, detail: 'The Moon is up at greatest eclipse' });
  }
  return items.sort((a, b) => a.ts - b.ts).slice(0, limit);
}
