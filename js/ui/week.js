/* "Week" tab: the best evening ahead and upcoming sky events. */
import { eventInfo } from '../model.js';
import { dayData, wx, wmo } from '../weather.js';
import { nextPhase } from '../astro.js';
import { upcoming } from '../events.js';
import { addDays, dayMonth, hm, num, localNow, shortDay, weekday } from '../time.js';
import { icon } from './icons.js';

export function renderWeek(el, app) {
  const today = localNow().str, now = Date.now();
  const days = [];
  for (let i = 0; i < 8; i++) {
    const s = addDays(today, i), set = eventInfo(s, 'set'), rise = eventInfo(s, 'rise');
    days.push({ s, i, set, rise, D: dayData(s) });
  }
  const candidates = days.filter(d => d.set.scored && +d.set.time > now);
  const best = candidates.reduce((a, b) => (!a || b.set.scored.score > a.set.scored.score ? b : a), null);

  const rows = days.map(d => {
    const c = d.set.scored, r = d.rise.scored;
    const w = d.D ? wmo(d.D.code, false) : null;
    return '<li><button type="button" class="day' + (best && d.s === best.s ? ' best' : '') + '" data-act="goto" data-date="' + d.s + '">' +
      '<span class="d-name">' + (d.i === 0 ? 'Today' : shortDay(d.set.S.ref)) + ' <b>' + +d.s.slice(8) + '</b></span>' +
      '<span class="d-icon" title="' + (w ? w[1] : '') + '">' + (w ? icon(w[0]) : '') + '</span>' +
      '<span class="d-time">' + hm(d.set.time) + '</span>' +
      '<span class="d-bar" data-level="' + d.set.rel.level + '">' + (c ? '<u style="width:' + c.score + '%"></u>' : '') + '</span>' +
      '<span class="d-score">' + (c ? c.score : '—') + '</span>' +
      '<small class="d-more">' + (d.D ? num(d.D.tmin) + ' to ' + num(d.D.tmax) + ' °' : '') + (r ? ', sunrise ' + r.score : '') + '</small>' +
      '</button></li>';
  }).join('');

  const fullMoon = nextPhase(now, .5);
  const events = upcoming(now, 5);
  if (fullMoon) events.push({ ts: +fullMoon, title: 'Full moon', detail: 'A striking moonrise that evening' });
  events.sort((a, b) => a.ts - b.ts);

  el.innerHTML = '<div class="page page-top">' +
    (best
      ? '<section class="best-card"><h1>' + weekday(best.set.S.ref) + ' ' + +best.s.slice(8) + '</h1>' +
        '<p>' + (best.i === 0 ? 'Tonight' : 'The best evening') + ' at ' + hm(best.set.time) + ', score ' + best.set.scored.score + '. ' + best.set.scored.reasons[0] + '.</p>' +
        '<button type="button" class="btn dark" data-act="remind" data-date="' + best.s + '" data-kind="set">' + icon('bell') + 'Remind me</button></section>'
      : '<section class="block"><h1>The next evenings</h1><p class="muted">' + (wx.status === 'error' ? 'Forecast unavailable: check your connection.' : 'Loading the forecast…') + '</p></section>') +
    '<section class="block"><h2>Sunset and score each evening</h2><ul class="days">' + rows + '</ul>' +
    '<p class="muted small">Paler bars: less certain forecast. Tap a day to see the details.</p></section>' +
    '<section class="block"><h2>Coming up in the sky</h2><ul class="agenda">' + events.map(e => {
      const d = new Date(e.ts);
      return '<li><time>' + dayMonth(d) + '</time><div><b>' + e.title + '</b><small>' + e.detail + '</small></div></li>';
    }).join('') + '</ul></section></div>';
}
