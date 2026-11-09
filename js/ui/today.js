/* Onglet « Ce soir » : l'heure, et est-ce que ça vaut le coup de sortir. */
import { HOME } from '../config.js';
import { eventInfo, spotsFor } from '../model.js';
import { wx, wmo } from '../weather.js';
import { entryFor } from '../journal.js';
import { addDays, cap, diffDays, dirName, fmtIn, hm, isD, longDate, num, localNow, relDay } from '../time.js';
import { palette, sceneSvg, seedOf } from './scene.js';
import { icon } from './icons.js';
import { esc, row } from './dom.js';

const NAME = { set: 'Coucher', rise: 'Lever' };

export function starsHtml(date, kind, current) {
  let h = '<div class="stars" role="group" aria-label="Note de 1 à 5">';
  for (let r = 1; r <= 5; r++) {
    h += '<button type="button" data-act="rate" data-date="' + date + '" data-kind="' + kind + '" data-r="' + r + '" aria-label="' + r + ' sur 5" aria-pressed="' + (current === r) + '" class="' + (current >= r ? 'on' : '') + '">' + icon('star') + '</button>';
  }
  return h + '</div>';
}

/* dernier lever ou coucher passé et pas encore noté */
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
  if (!isD(E.time)) return 'Pas d’événement ce jour-là';
  if (lead !== 0) return relDay(lead);
  return +E.time >= now ? 'Dans ' + fmtIn(E.time - now) : 'Il y a ' + fmtIn(now - E.time);
}

function timeline(E) {
  const T = E.S.T;
  const parts = E.kind === 'set'
    ? [['Heure dorée', T.goldenHour], ['Coucher', T.sunset], ['Heure bleue', T.blueEveStart]]
    : [['Heure bleue', T.blueAMStart], ['Lever', T.sunrise], ['Fin de l’or', T.goldenHourEnd]];
  return '<ol class="stamps">' + parts.map(([l, t]) => '<li><span>' + l + '</span><b>' + hm(t) + '</b></li>').join('') + '</ol>';
}

function noScoreText() {
  if (wx.status === 'loading') return 'Chargement de la prévision…';
  if (wx.status === 'error') return 'Prévision indisponible : vérifie la connexion. Les heures restent justes.';
  return 'Les prévisions couvrent hier et les 9 prochains jours.';
}

function conditions(E) {
  const c = E.scored;
  if (!c) return '';
  const w = c.w, icn = wmo(w.code, false);
  let rows = '';
  if (c.directional) rows += row('Nuages sur la route du soleil', num(c.blocked) + ' %');
  rows += row('Nuages hauts', num(w.high) + ' %');
  rows += row('Nuages bas', num(w.low) + ' %');
  rows += row('Pluie', num(w.pp) + ' %');
  rows += row('Vent', num(w.wind) + ' km/h', w.dir != null ? 'de ' + dirName(w.dir) : '');
  rows += row('Température', num(w.temp) + ' °', 'ressenti ' + num(w.app) + ' °');
  rows += row('Visibilité', w.vis != null ? num(w.vis / 1000) + ' km' : '—');
  if (E.profile) {
    const gap = Math.abs(E.real - E.time) / 60000;
    rows += row('Relief', gap >= 2 ? 'Caché dès ' + hm(E.real) : 'Horizon dégagé', 'hors arbres');
  }
  return '<section class="block"><h2>' + (E.kind === 'set' ? 'Au moment du coucher' : 'Au moment du lever') + '</h2>' +
    '<p class="wx-line">' + icon(icn[0]) + icn[1] + '</p><dl class="rows">' + rows + '</dl></section>';
}

/* Les commandes sont créées une seule fois : un appui n'est jamais perdu pendant une mise à jour. */
const skeleton = () =>
  '<header class="hero" id="hero"><div id="sceneHost"></div>' +
    '<div class="hero-text">' +
      '<div class="hero-top"><h1>' + HOME.name + '</h1>' +
        '<button type="button" class="back-today" id="liveBtn" data-act="live">Revenir à aujourd’hui</button></div>' +
      '<div class="datenav">' +
        '<button type="button" data-act="day" data-d="-1" aria-label="Jour précédent">' + icon('left') + '</button>' +
        '<label class="datelabel"><span id="dateText"></span><input type="date" id="dateInput" aria-label="Choisir une date"></label>' +
        '<button type="button" data-act="day" data-d="1" aria-label="Jour suivant">' + icon('right') + '</button>' +
      '</div>' +
      '<div class="kinds" role="group" aria-label="Événement">' + ['set', 'rise'].map(k =>
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
  el.querySelector('#dateText').textContent = cap(longDate(E.S.ref));
  const input = el.querySelector('#dateInput');
  if (input.value !== str) input.value = str;
  el.querySelectorAll('.kinds button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  el.querySelector('#heroTime').textContent = hm(E.time);
  el.querySelector('#count').textContent = countText(E);

  el.querySelector('#todayBody').innerHTML =
      (HOME.chosen ? '' : '<section class="block"><h2>Choisis ton lieu</h2><p class="muted">Exemple affiché : ' + HOME.name + '.</p><button type="button" class="btn" data-act="go-place">Choisir un lieu</button></section>') +
      (c
        ? '<section class="verdict"><div><h2>' + c.verdict + '</h2><p>' + c.reasons.join('. ') + '.</p></div>' +
          '<div class="score"><b>' + c.score + '</b><small>sur 100</small></div></section>' +
          '<p class="trust" data-level="' + E.rel.level + '"><i></i><i></i><i></i>' + E.rel.text + (c.directional ? '' : ', sans la route du soleil') + '</p>'
        : '<section class="verdict"><p>' + noScoreText() + '</p></section>') +
      (isD(E.time) ? timeline(E) : '') +
      (best ? '<section class="block spot-tip"><h2>' + esc(best.spot.name) + '</h2><p>' + best.align.text + ', pars à <b>' + hm(best.leave) + '</b></p></section>' : '') +
      (pending && live ? '<section class="block ask"><h2>Note ' + (pending.kind === 'set' ? 'le coucher' : 'le lever') + ' ' + (diffDays(pending.str, localNow().str) ? 'd’hier' : 'd’aujourd’hui') + '</h2>' + starsHtml(pending.str, pending.kind, 0) + '</section>' : '') +
      conditions(E) +
      '<div class="actions">' +
        '<button type="button" class="btn" data-act="share">' + icon('share') + 'Partager</button>' +
        (isD(E.time) && +E.time > Date.now() ? '<button type="button" class="btn" data-act="remind" data-date="' + str + '" data-kind="' + kind + '">' + icon('bell') + 'Me prévenir</button>' : '') +
      '</div>';
}

export function updateCount(app) {
  const el = document.getElementById('count');
  if (el) el.textContent = countText(eventInfo(app.viewDate(), app.state.kind));
}
