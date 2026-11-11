/* Brings together sun, weather, score, terrain and journal for a given sunrise or sunset. */
import { HOME } from './config.js';
import { position, sunDay, timesAt } from './astro.js';
import { hourData, pathData } from './weather.js';
import { applyOffset, computeScore, labelFor, reliability } from './score.js';
import { cachedProfile, realEvent } from './horizon.js';
import { journalOffset } from './journal.js';
import { alignment, departure } from './spots.js';
import { diffDays, dirWord, isD, localNow } from './time.js';

export function eventInfo(str, kind) {
  const S = sunDay(str);
  const time = kind === 'set' ? S.T.sunset : S.T.sunrise;
  const az = kind === 'set' ? S.setAz : S.riseAz;
  const info = { str, kind, S, time, az, lead: diffDays(localNow().str, str), scored: null };
  info.rel = reliability(info.lead);
  if (!isD(time)) return info;
  const profile = cachedProfile(HOME.lat, HOME.lon);
  info.profile = profile;
  info.real = realEvent(kind, time, profile, d => position(d));
  const w = hourData(+time);
  const raw = w ? computeScore(w, pathData(+time, kind), dirWord(az)) : null;
  if (raw) {
    const score = applyOffset(raw.score, journalOffset());
    info.scored = { ...raw, raw: raw.score, score, ...labelFor(score) };
  }
  return info;
}

/* How each spot fares that day, best placed first */
export function spotsFor(spots, str, kind) {
  return spots.map(s => {
    const T = timesAt(str, s.lat, s.lon);
    const official = kind === 'set' ? T.sunset : T.sunrise;
    if (!isD(official)) return null;
    const sunPos = d => position(d, s.lat, s.lon);
    const real = realEvent(kind, official, cachedProfile(s.lat, s.lon), sunPos);
    const align = alignment(sunPos(official).azimuth, s.facing);
    return { spot: s, real, align, leave: new Date(departure(+real, s.travel)), measured: !!cachedProfile(s.lat, s.lon) };
  }).filter(Boolean).sort((a, b) => b.align.level - a.align.level);
}
