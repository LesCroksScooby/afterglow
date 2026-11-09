/* Lancer depuis le dossier du site :  node --test "tests/*.test.js"
   (Ce dossier n'a pas besoin d'être envoyé sur le serveur.) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

globalThis.SunCalc = createRequire(import.meta.url)('../suncalc.js');
const { canvasQuality, computeScore, pathBlockage, calibrationOffset, reliability, labelFor } = await import('../js/score.js');
const { elevationAngle, buildProfile, horizonAt, realEvent, destination } = await import('../js/horizon.js');
const { buildIcs } = await import('../js/calendar.js');
const { parseCoords, alignment, departure } = await import('../js/spots.js');
const { upcoming } = await import('../js/events.js');
const { sunDay, position } = await import('../js/astro.js');

const clear = { total: 0, low: 0, mid: 0, high: 0, vis: 20000, pp: 0, precip: 0 };

test('un ciel vide reste sobre, jamais « très beau »', () => {
  const r = computeScore(clear, [{ low: 0, mid: 0 }, { low: 0, mid: 0 }, { low: 0, mid: 0 }]);
  assert.equal(r.score, 45);
  assert.equal(labelFor(r.score).label, 'Sobre');
});

test('la qualité de la toile est continue : plus de saut à 5–6 %', () => {
  for (let c = 0; c < 100; c++) {
    assert.ok(Math.abs(canvasQuality(c + 1) - canvasQuality(c)) < .05, 'saut à ' + c);
  }
});

test('des nuages hauts avec une route dégagée donnent un score exceptionnel', () => {
  const r = computeScore({ ...clear, total: 50, high: 50 }, [{ low: 0, mid: 0 }, { low: 0, mid: 0 }, { low: 0, mid: 0 }]);
  assert.ok(r.score >= 90, 'score ' + r.score);
});

test('des nuages épais vers le soleil font chuter le score, même avec un beau ciel local', () => {
  const open = computeScore({ ...clear, total: 50, high: 50 }, [{ low: 0, mid: 0 }, { low: 0, mid: 0 }, { low: 0, mid: 0 }]);
  const shut = computeScore({ ...clear, total: 50, high: 50 }, [{ low: 90, mid: 80 }, { low: 90, mid: 80 }, { low: 90, mid: 80 }]);
  assert.ok(shut.score < open.score / 3, shut.score + ' contre ' + open.score);
});

test('sans données sur la route, le score local fonctionne encore', () => {
  const r = computeScore({ ...clear, total: 50, high: 50 }, null);
  assert.equal(r.directional, false);
  assert.ok(r.score > 80);
});

test('pathBlockage ignore les points manquants', () => {
  assert.equal(pathBlockage([null, null, null]), null);
  assert.equal(pathBlockage([{ low: 40, mid: 0 }, null, null]), 40);
});

test('la fiabilité baisse avec l’échéance', () => {
  assert.deepEqual([0, 2, 4, 7].map(d => reliability(d).level), [3, 2, 1, 0]);
});

test('le carnet corrige prudemment et attend 3 notes', () => {
  assert.equal(calibrationOffset([{ raw: 50, rating: 5 }, { raw: 50, rating: 5 }]), 0);
  const entries = [1, 2, 3].map(() => ({ raw: 40, rating: 4 }));   // note 75 pour un score de 40
  assert.equal(calibrationOffset(entries), 13);                    // 35 × 3/8
  assert.equal(calibrationOffset(Array(100).fill({ raw: 0, rating: 5 })), 20);   // plafonné
});

test('l’angle du relief tient compte de la courbure', () => {
  assert.ok(Math.abs(elevationAngle(100, 1) - 5.7) < .1);
  assert.ok(elevationAngle(0, 20) < 0);
});

test('horizonAt interpole et ne déborde pas entre lever et coucher', () => {
  const e = new Array(380).fill(500);
  const p = buildProfile(400, e);
  assert.ok(horizonAt(p, 90) > 0);
  assert.equal(horizonAt(p, 180), 0);
  assert.equal(horizonAt(null, 240), 0);
});

test('un relief élevé avance le coucher ; un horizon plat ne change rien', () => {
  const S = sunDay('2026-11-09');
  const sunPos = d => position(d);
  const flat = buildProfile(400, new Array(380).fill(400));
  const high = buildProfile(400, new Array(380).fill(600));
  const flatSet = realEvent('set', S.T.sunset, flat, sunPos);
  const highSet = realEvent('set', S.T.sunset, high, sunPos);
  assert.ok(Math.abs(flatSet - S.T.sunset) <= 120000, 'plat');
  assert.ok(highSet < S.T.sunset - 60 * 60000, 'relief');
  const highRise = realEvent('rise', S.T.sunrise, high, sunPos);
  assert.ok(+highRise > +S.T.sunrise + 60 * 60000, 'lever');
});

test('les coordonnées de destination vont dans le bon sens', () => {
  const [la, lo] = destination(50, 4, 270, 10);
  assert.ok(Math.abs(la - 50) < .001 && lo < 4);
});

test('le fichier agenda contient l’alarme et échappe le texte', () => {
  const ics = buildIcs({ uid: 'a', start: Date.UTC(2026, 10, 12, 16, 1), title: 'Coucher, jeudi', description: 'x;y' });
  assert.match(ics, /DTSTART:20261112T160100Z/);
  assert.match(ics, /TRIGGER:-PT60M/);
  assert.match(ics, /SUMMARY:Coucher\\, jeudi/);
  assert.ok(ics.includes('\r\n'));
});

test('parseCoords accepte les formats courants et refuse le reste', () => {
  assert.deepEqual(parseCoords('12.34, 5.6'), { lat: 12.34, lon: 5.6 });
  assert.deepEqual(parseCoords('12,34 5,6'), { lat: 12.34, lon: 5.6 });
  assert.equal(parseCoords('n’importe quoi'), null);
  assert.equal(parseCoords('120, 4'), null);
});

test('alignement et heure de départ', () => {
  assert.equal(alignment(245, 250).text, 'Dans l’axe');
  assert.equal(alignment(245, 210).text, 'De biais');
  assert.equal(alignment(245, 90).text, 'Hors champ');
  assert.equal(alignment(358, 5).level, 2);   // passage par le nord
  assert.equal(departure(3600000, 15), 3600000 - 45 * 60000);
});

test('le calendrier du ciel est trié et ne garde que le visible', () => {
  const items = upcoming(Date.UTC(2028, 6, 1), 40);
  assert.ok(items.some(it => it.title.includes('lune')));
  assert.ok(items.every((it, i) => !i || items[i - 1].ts <= it.ts));
  assert.ok(!items.some(it => it.ts === Date.parse('2028-07-06T18:20:00Z')), 'lune sous l’horizon');
  assert.ok(items.some(it => it.ts === Date.parse('2028-12-31T16:52:00Z')), 'éclipse totale visible');
});

test('chaque son est complet et assez discret', async () => {
  const { SOUNDS } = await import('../js/sound.js');
  for (const name of ['tap', 'tab', 'tick', 'set', 'rise', 'success', 'error', 'shimmer', 'aligned', 'star1', 'star5']) {
    assert.ok(SOUNDS[name] && SOUNDS[name].length, name);
    for (const l of SOUNDS[name]) {
      assert.ok(l.gain > 0 && l.gain <= .25, name + ' volume');
      assert.ok(l.dur > 0 && l.dur <= 1, name + ' durée');
      assert.ok(l.f > 0, name + ' fréquence');
    }
  }
});

test('heures de référence : 9 novembre 2026 au lieu par défaut', () => {
  const S = sunDay('2026-11-09');
  const paris = d => d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  assert.equal(paris(S.T.sunset), '17:18');
  assert.equal(paris(S.T.sunrise), '07:50');
});
