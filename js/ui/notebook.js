/* "Journal" tab: ratings, spots, settings and backup. */
import { spotsFor } from '../model.js';
import { journalOffset, loadJournal } from '../journal.js';
import { wx } from '../weather.js';
import { dayMonth, dirName, hm, parse } from '../time.js';
import { pendingRating, starsHtml } from './today.js';
import { HOME } from '../config.js';
import { esc } from './dom.js';
import { soundOn } from '../sound.js';

const FACINGS = [['', 'Open view all round'], ['0', 'North'], ['45', 'North-east'], ['90', 'East'], ['135', 'South-east'], ['180', 'South'], ['225', 'South-west'], ['270', 'West'], ['315', 'North-west']];
const dateOf = s => { const [y, m, d] = parse(s); return new Date(Date.UTC(y, m - 1, d, 12)); };

export function renderNotebook(el, app) {
  const list = loadJournal(), offset = journalOffset();
  const pending = pendingRating();
  const spots = spotsFor(app.spots, app.viewDate(), app.state.kind);
  const left = 3 - list.length;

  const calib = left > 0
    ? 'Rate ' + left + ' more sunset' + (left > 1 ? 's' : '') + ' so the score can adapt to your sky.'
    : offset === 0 ? 'Your ratings agree with the score, no correction applied.'
      : 'The score is adjusted by ' + (offset > 0 ? '+' : '−') + Math.abs(offset) + ' points based on your ' + list.length + ' ratings.';

  const entries = list.slice(0, 30).map(e =>
    '<li><div class="e-head"><b>' + (e.kind === 'set' ? 'Sunset' : 'Sunrise') + ', ' + dayMonth(dateOf(e.date)) + '</b>' +
    '<button type="button" class="link" data-act="del-entry" data-date="' + esc(e.date) + '" data-kind="' + esc(e.kind) + '">Delete</button></div>' +
    starsHtml(e.date, e.kind, e.rating) +
    '<input class="note" type="text" maxlength="200" placeholder="A note about that evening" value="' + esc(e.note || '') + '" data-note="' + esc(e.date) + '|' + esc(e.kind) + '" aria-label="Note">' +
    (e.raw != null ? '<small>Forecast score: ' + e.raw + '</small>' : '') + '</li>').join('');

  const spotRows = spots.map(s =>
    '<li><div class="e-head"><b>' + esc(s.spot.name) + '</b><button type="button" class="link" data-act="del-spot" data-id="' + esc(s.spot.id) + '">Remove</button></div>' +
    '<p><span class="tag" data-level="' + s.align.level + '">' + s.align.text + '</span> Sun ' + (app.state.kind === 'set' ? 'hidden at ' : 'visible at ') + '<b>' + hm(s.real) + '</b>, leave at <b>' + hm(s.leave) + '</b></p>' +
    '<small>' + (s.measured ? 'Terrain measured, trees not included.' : 'Terrain not measured yet: a connection is needed.') +
    (s.spot.facing != null ? ' Faces ' + dirName(s.spot.facing) + '.' : '') + (s.spot.travel ? ' ' + s.spot.travel + ' min away.' : '') + '</small></li>').join('');

  el.innerHTML = '<div class="page page-top">' +
    '<h1 class="tab-title">Journal</h1>' +
    (pending ? '<section class="block ask"><h2>Rate the last ' + (pending.kind === 'set' ? 'sunset' : 'sunrise') + '</h2>' + starsHtml(pending.str, pending.kind, 0) + '</section>' : '') +
    '<section class="block"><h2>My ratings</h2><p class="muted">' + calib + '</p>' + (entries ? '<ul class="entries">' + entries + '</ul>' : '') + '</section>' +
    '<section class="block"><h2>My spots</h2>' +
      (spotRows ? '<ul class="entries">' + spotRows + '</ul>' : '<p class="muted">Add your favourite viewpoints to see whether the sun lines up, and when to leave.</p>') +
      '<details class="more"><summary>Add a spot</summary><form id="spotForm" class="form" novalidate>' +
        '<label>Name<input name="name" required maxlength="40" placeholder="My viewpoint"></label>' +
        '<label>Position<span class="inline"><input name="coords" inputmode="text" placeholder="48.8566, 2.3522"><button type="button" class="btn" data-act="locate">My location</button></span></label>' +
        '<label>Main view<select name="facing">' + FACINGS.map(f => '<option value="' + f[0] + '">' + f[1] + '</option>').join('') + '</select></label>' +
        '<label>Travel time in minutes<input name="travel" type="number" inputmode="numeric" min="0" max="600" value="10"></label>' +
        '<p class="error" id="spotError" role="alert"></p>' +
        '<button type="submit" class="btn">Add this spot</button></form></details></section>' +
    '<section class="block"><h2>Settings</h2>' +
      '<p>Place: <b>' + esc(HOME.name) + '</b></p>' +
      '<form id="placeForm" class="form" novalidate><label>Search for a city<span class="inline"><input name="q" maxlength="80" placeholder="City name"><button type="submit" class="btn">Search</button></span></label></form>' +
      '<div id="placeResults" class="places"></div>' +
      '<div class="actions"><button type="button" class="btn" data-act="here">Use my location</button></div>' +
      '<button type="button" class="switch-row" role="switch" aria-checked="' + soundOn() + '" data-act="sound"><span>Interface sounds</span><span class="switch"><i></i></span></button>' +
      '<p class="muted small">On iPhone, the silent switch mutes them too.</p></section>' +
    '<section class="block"><h2>Backup</h2><p class="muted">Your ratings stay on this device. Export them from time to time.</p>' +
      '<div class="actions"><button type="button" class="btn" data-act="export">Export</button>' +
      '<label class="btn">Import<input type="file" id="importFile" accept="application/json,.json" hidden></label></div></section>' +
    '<footer class="foot"><p>Calculations: SunCalc. Weather and terrain: <a href="https://open-meteo.com/">Open-Meteo</a>. Times are local to the chosen place.' +
      (wx.stamp ? ' Weather updated at ' + hm(new Date(wx.stamp)) + '.' : '') + '</p>' +
      '<button type="button" class="link" data-act="refresh">Refresh the weather</button>' +
      '<p><a class="link" href="legal.html">Legal notice and privacy</a></p></footer>' +
    '</div>';
}
