/* "Tonight" tab: the time, and whether it's worth going out. */
import { HOME } from '../config.js';
import { eventInfo, spotsFor } from '../model.js';
import { wx, wmo } from '../weather.js';
import { entryFor } from '../journal.js';
import { addDays, diffDays, dirName, fmtIn, hm, isD, longDate, num, localNow, relDay } from '../time.js';
import { palette, sceneSvg, seedOf } from './scene.js';
import { icon } from './icons.js';
import { esc, row } from './dom.js';

const NAME = { set: 'Sunset', rise: 'Sunrise' };

export function starsHtml(date, kind, current) {
  let h = '<div class="stars" role="group" aria-label="Rating from 1 to 5">';
  for (let r = 1; r <= 5; r++) {
    h += '<button type="button" data-act="rate" data-date="' + date + '" data-kind="' + kind + '" data-r="' + r + '" aria-label="' + r + ' out of 5" aria-pressed="' + (current === r) + '" class="' + (current >= r ? 'on' : '') + '">' + icon('star') + '</button>';
  }
  return h + '</div>';
}

/* the latest sunrise or sunset that has passed and hasn't been rated yet */
export function pendingRating() {
  const today = localNow().str, now = Date.now();
  const candidates = [[today, 'set'], [today, 'rise'], [addDays(today, -1), 'set']];
  for (const [date, kind] of candidates) {
    const E = eventInfo(date, kind);
    if (isD(E.time) && +E.time < now) return entryFor(date, kind) ? null : E;
  }
  return null;
}

function countText(E) {
  const now = Date.now(), lead = diffDays(localNow().str, E.str);
  if (!isD(E.time)) return 'No sunrise or sunset that day';
  if (lead !== 0) return relDay(lead);
  return +E.time >= now ? 'In ' + fmtIn(E.time - now) : fmtIn(now - E.time) + ' ago';
}

function timeline(E) {
  const T = E.S.T;
  const parts = E.kind === 'set'
    ? [['Golden hour', T.goldenHour], ['Sunset', T.sunset], ['Blue hour', T.blueEveStart]]
    : [['Blue hour', T.blueAMStart], ['Sunrise', T.sunrise], ['Golden ends', T.goldenHourEnd]];
  return '<ol class="stamps">' + parts.map(([l, t]) => '<li><span>' + l + '</span><b>' + hm(t) + '</b></li>').join('') + '</ol>';
}

function noScoreText() {
  if (wx.status === 'loading') return 'Loading the forecast…';
  if (wx.status === 'error') return 'Forecast unavailable: check your connection. The times are still accurate.';
  return 'Forecasts cover yesterday and the next 9 days.';
}

function conditions(E) {
  const c = E.scored;
  if (!c) return '';
  const w = c.w, icn = wmo(w.code, false);
  let rows = '';
  if (c.directional) rows += row('Clouds on the sun’s path', num(c.blocked) + '%');
  rows += row('High clouds', num(w.high) + '%');
  rows += row('Low clouds', num(w.low) + '%');
  rows += row('Rain', num(w.pp) + '%');
  rows += row('Wind', num(w.wind) + ' km/h', w.dir != null ? 'from ' + dirName(w.dir) : '');
  rows += row('Temperature', num(w.temp) + ' °', 'feels like ' + num(w.app) + ' °');
  rows += row('Visibility', w.vis != null ? num(w.vis / 1000) + ' km' : '—');
  if (E.profile) {
    const gap = Math.abs(E.real - E.time) / 60000;
    rows += row('Terrain', gap >= 2 ? 'Hidden from ' + hm(E.real) : 'Clear horizon', 'trees not included');
  }
  return '<section class="block"><h2>' + (E.kind === 'set' ? 'At sunset' : 'At sunrise') + '</h2>' +
    '<p class="wx-line">' + icon(icn[0]) + icn[1] + '</p><dl class="rows">' + rows + '</dl></section>';
}

/* The controls are built once, so a tap is never lost during an update. */
const skeleton = () =>
  '<header class="hero" id="hero"><div id="sceneHost"></div>' +
    '<div class="hero-text">' +
      '<div class="hero-top"><h1>' + esc(HOME.name) + '</h1>' +
        '<button type="button" class="back-today" id="liveBtn" data-act="live">Back to today</button></div>' +
      '<div class="datenav">' +
        '<button type="button" data-act="day" data-d="-1" aria-label="Previous day">' + icon('left') + '</button>' +
        '<label class="datelabel"><span id="dateText"></span><input type="date" id="dateInput" aria-label="Pick a date"></label>' +
        '<button type="button" data-act="day" data-d="1" aria-label="Next day">' + icon('right') + '</button>' +
      '</div>' +
      '<div class="kinds" role="group" aria-label="Event">' + ['set', 'rise'].map(k =>
        '<button type="button" data-act="kind" data-kind="' + k + '">' + NAME[k] + '</button>').join('') + '</div>' +
      '<p class="time" id="heroTime"></p>' +
      '<p class="count" id="count"></p>' +
    '</div>' +
  '</header><div class="page" id="todayBody"></div>';

export function renderToday(el, app) {
  const { state } = app;
  const str = app.viewDate(), kind = state.kind, E = eventInfo(str, kind);
  const c = E.scored;
  const vivid = c ? Math.min(1, .12 + c.score / 85) : .62;
  const seed = seedOf(str + kind);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = palette(kind, vivid)[0];

  const spots = spotsFor(app.spots, str, kind);
  const best = spots[0];
  const pending = pendingRating();
  const live = state.date === null;

  if (!el.querySelector('#hero')) el.innerHTML = skeleton();
  const sceneKey = [str, kind, vivid, c ? c.light + '/' + c.canvas : '', E.profile ? 1 : 0].join('|');
  const host = el.querySelector('#sceneHost');
  if (host.dataset.key !== sceneKey) {
    host.dataset.key = sceneKey;
    host.innerHTML = sceneSvg({ kind, vivid, scored: c, az: E.az, profile: E.profile, seed });
  }
  el.querySelector('#liveBtn').classList.toggle('off', live);
  el.querySelector('#dateText').textContent = longDate(E.S.ref);
  const input = el.querySelector('#dateInput');
  if (input.value !== str) input.value = str;
  el.querySelectorAll('.kinds button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  el.querySelector('#heroTime').textContent = hm(E.time);
  el.querySelector('#count').textContent = countText(E);

  el.querySelector('#todayBody').innerHTML =
      (HOME.chosen ? '' : '<section class="block"><h2>Choose your place</h2><p class="muted">Example shown: ' + esc(HOME.name) + '.</p><button type="button" class="btn" data-act="go-place">Choose a place</button></section>') +
      (c
        ? '<section class="verdict"><div><h2>' + c.verdict + '</h2><p>' + c.reasons.join('. ') + '.</p></div>' +
          '<div class="score"><b>' + c.score + '</b><small>out of 100</small></div></section>' +
          '<p class="trust" data-level="' + E.rel.level + '"><i></i><i></i><i></i>' + E.rel.text + (c.directional ? '' : ', without the sun’s path') + '</p>'
        : '<section class="verdict"><p>' + noScoreText() + '</p></section>') +
      (isD(E.time) ? timeline(E) : '') +
      (best ? '<section class="block spot-tip"><h2>' + esc(best.spot.name) + '</h2><p>' + best.align.text + ', leave at <b>' + hm(best.leave) + '</b></p></section>' : '') +
      (pending && live ? '<section class="block ask"><h2>Rate ' + (diffDays(pending.str, localNow().str) ? 'yesterday’s' : 'today’s') + ' ' + (pending.kind === 'set' ? 'sunset' : 'sunrise') + '</h2>' + starsHtml(pending.str, pending.kind, 0) + '</section>' : '') +
      conditions(E) +
      '<div class="actions">' +
        '<button type="button" class="btn" data-act="share">' + icon('share') + 'Share</button>' +
        (isD(E.time) && +E.time > Date.now() ? '<button type="button" class="btn" data-act="remind" data-date="' + str + '" data-kind="' + kind + '">' + icon('bell') + 'Remind me</button>' : '') +
      '</div>';
}

export function updateCount(app) {
  const el = document.getElementById('count');
  if (el) el.textContent = countText(eventInfo(app.viewDate(), app.state.kind));
}
