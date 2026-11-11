/* Run from the site folder:  node --test "tests/*.test.js"
   (This folder doesn't need to be uploaded to the server.) */
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
const openPath = [{ low: 0, mid: 0 }, { low: 0, mid: 0 }, { low: 0, mid: 0 }];

test('an empty sky stays subtle, never "gorgeous"', () => {
  const r = computeScore(clear, openPath);
  assert.equal(r.score, 45);
  assert.equal(labelFor(r.score).label, 'Subtle');
});

test('canvas quality is continuous: no jump at 5–6%', () => {
  for (let c = 0; c < 100; c++) {
    assert.ok(Math.abs(canvasQuality(c + 1) - canvasQuality(c)) < .05, 'jump at ' + c);
  }
});

test('high clouds with a clear path give an exceptional score', () => {
  const r = computeScore({ ...clear, total: 50, high: 50 }, openPath);
  assert.ok(r.score >= 90, 'score ' + r.score);
});

test('thick clouds towards the sun drop the score, even under a nice local sky', () => {
  const open = computeScore({ ...clear, total: 50, high: 50 }, openPath);
  const shut = computeScore({ ...clear, total: 50, high: 50 }, [{ low: 90, mid: 80 }, { low: 90, mid: 80 }, { low: 90, mid: 80 }]);
  assert.ok(shut.score < open.score / 3, shut.score + ' vs ' + open.score);
});

test('without path data, the local score still works', () => {
  const r = computeScore({ ...clear, total: 50, high: 50 }, null);
  assert.equal(r.directional, false);
  assert.ok(r.score > 80);
});

test('pathBlockage ignores missing points', () => {
  assert.equal(pathBlockage([null, null, null]), null);
  assert.equal(pathBlockage([{ low: 40, mid: 0 }, null, null]), 40);
});

test('reliability drops with lead time', () => {
  assert.deepEqual([0, 2, 4, 7].map(d => reliability(d).level), [3, 2, 1, 0]);
});

test('the journal corrects cautiously and waits for 3 ratings', () => {
  assert.equal(calibrationOffset([{ raw: 50, rating: 5 }, { raw: 50, rating: 5 }]), 0);
  const entries = [1, 2, 3].map(() => ({ raw: 40, rating: 4 }));   // rated 75 for a score of 40
  assert.equal(calibrationOffset(entries), 13);                    // 35 × 3/8
  assert.equal(calibrationOffset(Array(100).fill({ raw: 0, rating: 5 })), 20);   // capped
});

test('terrain angle accounts for Earth curvature', () => {
  assert.ok(Math.abs(elevationAngle(100, 1) - 5.7) < .1);
  assert.ok(elevationAngle(0, 20) < 0);
});

test('horizonAt interpolates and doesn’t spill between sunrise and sunset sectors', () => {
  const p = buildProfile(400, new Array(380).fill(500));
  assert.ok(horizonAt(p, 90) > 0);
  assert.equal(horizonAt(p, 180), 0);
  assert.equal(horizonAt(null, 240), 0);
});

test('high terrain brings sunset forward; a flat horizon changes nothing', () => {
  const S = sunDay('2026-11-09');
  const sunPos = d => position(d);
  const flat = buildProfile(400, new Array(380).fill(400));
  const high = buildProfile(400, new Array(380).fill(600));
  const flatSet = realEvent('set', S.T.sunset, flat, sunPos);
  const highSet = realEvent('set', S.T.sunset, high, sunPos);
  assert.ok(Math.abs(flatSet - S.T.sunset) <= 120000, 'flat');
  assert.ok(highSet < S.T.sunset - 60 * 60000, 'terrain');
  const highRise = realEvent('rise', S.T.sunrise, high, sunPos);
  assert.ok(+highRise > +S.T.sunrise + 60 * 60000, 'sunrise');
});

test('destination coordinates go the right way', () => {
  const [la, lo] = destination(50, 4, 270, 10);
  assert.ok(Math.abs(la - 50) < .001 && lo < 4);
});

test('the calendar file has the alarm and escapes text', () => {
  const ics = buildIcs({ uid: 'a', start: Date.UTC(2026, 10, 12, 16, 1), title: 'Sunset, Thursday', description: 'x;y' });
  assert.match(ics, /DTSTART:20261112T160100Z/);
  assert.match(ics, /TRIGGER:-PT60M/);
  assert.match(ics, /SUMMARY:Sunset\\, Thursday/);
  assert.ok(ics.includes('\r\n'));
});

test('parseCoords accepts common formats and rejects the rest', () => {
  assert.deepEqual(parseCoords('12.34, 5.6'), { lat: 12.34, lon: 5.6 });
  assert.deepEqual(parseCoords('12,34 5,6'), { lat: 12.34, lon: 5.6 });
  assert.equal(parseCoords('anything'), null);
  assert.equal(parseCoords('120, 4'), null);
});

test('alignment and departure time', () => {
  assert.equal(alignment(245, 250).text, 'Right in line');
  assert.equal(alignment(245, 210).text, 'At an angle');
  assert.equal(alignment(245, 90).text, 'Out of view');
  assert.equal(alignment(358, 5).level, 2);   // across north
  assert.equal(departure(3600000, 15), 3600000 - 45 * 60000);
});

test('sky events are sorted and only keep visible ones', () => {
  const items = upcoming(Date.UTC(2028, 6, 1), 40);
  assert.ok(items.some(it => it.title.includes('lunar')));
  assert.ok(items.every((it, i) => !i || items[i - 1].ts <= it.ts));
  assert.ok(!items.some(it => it.ts === Date.parse('2028-07-06T18:20:00Z')), 'moon below the horizon');
  assert.ok(items.some(it => it.ts === Date.parse('2028-12-31T16:52:00Z')), 'total eclipse visible');
});

test('every sound is complete and quiet enough', async () => {
  const { SOUNDS } = await import('../js/sound.js');
  for (const name of ['tap', 'tab', 'tick', 'set', 'rise', 'success', 'error', 'shimmer', 'aligned', 'star1', 'star5']) {
    assert.ok(SOUNDS[name] && SOUNDS[name].length, name);
    for (const l of SOUNDS[name]) {
      assert.ok(l.gain > 0 && l.gain <= .25, name + ' volume');
      assert.ok(l.dur > 0 && l.dur <= 1, name + ' duration');
      assert.ok(l.f > 0, name + ' frequency');
    }
  }
});

test('reference times: 9 November 2026 at the default place', () => {
  const S = sunDay('2026-11-09');
  const local = d => d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  assert.equal(local(S.T.sunset), '17:18');
  assert.equal(local(S.T.sunrise), '07:50');
});
