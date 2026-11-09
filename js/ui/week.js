/* Onglet « Semaine » : le meilleur soir à venir et les rendez-vous du ciel. */
import { eventInfo } from '../model.js';
import { dayData, wx, wmo } from '../weather.js';
import { nextPhase } from '../astro.js';
import { upcoming } from '../events.js';
import { addDays, cap, dayMonth, hm, num, localNow, shortDay, weekday } from '../time.js';
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
      '<span class="d-name">' + (d.i === 0 ? 'Auj.' : cap(shortDay(d.set.S.ref))) + ' <b>' + +d.s.slice(8) + '</b></span>' +
      '<span class="d-icon" title="' + (w ? w[1] : '') + '">' + (w ? icon(w[0]) : '') + '</span>' +
      '<span class="d-time">' + hm(d.set.time) + '</span>' +
      '<span class="d-bar" data-level="' + d.set.rel.level + '">' + (c ? '<u style="width:' + c.score + '%"></u>' : '') + '</span>' +
      '<span class="d-score">' + (c ? c.score : '—') + '</span>' +
      '<small class="d-more">' + (d.D ? 'de ' + num(d.D.tmin) + ' à ' + num(d.D.tmax) + ' °' : '') + (r ? ', lever ' + r.score : '') + '</small>' +
      '</button></li>';
  }).join('');

  const fullMoon = nextPhase(now, .5);
  const events = upcoming(now, 5);
  if (fullMoon) events.push({ ts: +fullMoon, title: 'Pleine lune', detail: 'Lever de lune spectaculaire ce soir-là' });
  events.sort((a, b) => a.ts - b.ts);

  el.innerHTML = '<div class="page page-top">' +
    (best
      ? '<section class="best-card"><h1>' + cap(weekday(best.set.S.ref)) + ' ' + +best.s.slice(8) + '</h1>' +
        '<p>' + (best.i === 0 ? 'Ce soir' : 'Le meilleur soir') + ' à ' + hm(best.set.time) + ', score ' + best.set.scored.score + '. ' + best.set.scored.reasons[0] + '.</p>' +
        '<button type="button" class="btn dark" data-act="remind" data-date="' + best.s + '" data-kind="set">' + icon('bell') + 'Me prévenir</button></section>'
      : '<section class="block"><h1>Les prochains soirs</h1><p class="muted">' + (wx.status === 'error' ? 'Prévision indisponible : vérifie la connexion.' : 'Chargement de la prévision…') + '</p></section>') +
    '<section class="block"><h2>Coucher et score de chaque soir</h2><ul class="days">' + rows + '</ul>' +
    '<p class="muted small">Barres plus pâles : prévision moins sûre. Touche un jour pour le détailler.</p></section>' +
    '<section class="block"><h2>À venir dans le ciel</h2><ul class="agenda">' + events.map(e => {
      const d = new Date(e.ts);
      return '<li><time>' + dayMonth(d) + '</time><div><b>' + e.title + '</b><small>' + e.detail + '</small></div></li>';
    }).join('') + '</ul></section></div>';
}
