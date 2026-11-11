/* "Sky" tab: day curve, compass, light phases, weather at the chosen hour, moon, year. */
import { dayCurve, moonIllum, moonName, moonPos, moonTimes, nextPhase, phaseName, position, sunDay } from '../astro.js';
import { dayData, hourData, wmo, wx } from '../weather.js';
import { addDays, cap, clamp, clock, dayMonth, dirName, dur, hm, isD, minOfDay, num, pad, parse, localTs } from '../time.js';
import { icon } from './icons.js';
import { $, row } from './dom.js';

const rad = Math.PI / 180;
const A = { W: 360, H: 190, x0: 10, x1: 350, top: 14, bot: 166, aMax: 65, aMin: -25 };
const X = m => A.x0 + (m / 1440) * (A.x1 - A.x0);
const Y = a => A.top + (A.aMax - a) / (A.aMax - A.aMin) * (A.bot - A.top);

function arcSvg(S) {
  const y0 = Y(0).toFixed(1);
  const d = dayCurve(S).map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  let g = '<defs><clipPath id="cpUp"><rect width="' + A.W + '" height="' + y0 + '"/></clipPath>' +
    '<clipPath id="cpDn"><rect y="' + y0 + '" width="' + A.W + '" height="' + (A.bot - y0) + '"/></clipPath></defs>';
  [0, 6, 12, 18, 24].forEach(h => {
    g += '<line class="a-grid" x1="' + X(h * 60) + '" x2="' + X(h * 60) + '" y1="' + A.top + '" y2="' + A.bot + '"/>' +
      '<text class="a-t" x="' + X(h * 60) + '" y="' + (A.H - 6) + '" text-anchor="' + (h === 0 ? 'start' : h === 24 ? 'end' : 'middle') + '">' + pad(h) + ':00</text>';
  });
  g += '<line class="a-hz" x1="' + A.x0 + '" x2="' + A.x1 + '" y1="' + y0 + '" y2="' + y0 + '"/>' +
    '<path class="a-dn" d="' + d + '" clip-path="url(#cpDn)"/><path class="a-up" d="' + d + '" clip-path="url(#cpUp)"/>';
  [[S.T.sunrise, -7, 'end'], [S.T.sunset, 7, 'start']].forEach(([t, dx, anchor]) => {
    if (!isD(t)) return;
    g += '<text class="a-l" x="' + (X(minOfDay(t)) + dx).toFixed(1) + '" y="' + (y0 - 6) + '" text-anchor="' + anchor + '">' + hm(t) + '</text>';
  });
  g += '<g id="arcNow"><line id="arcDrop" class="a-drop" y2="' + A.bot + '"/><circle id="arcSun" r="8" stroke-width="2"/></g>';
  return '<svg id="arcChart" class="arc" viewBox="0 0 ' + A.W + ' ' + A.H + '" role="img" aria-label="Height of the sun through the day">' + g + '</svg>';
}

function compassSvg(S) {
  const R = 86;
  const P = (r, deg) => [(r * Math.sin(deg * rad)).toFixed(1), (-r * Math.cos(deg * rad)).toFixed(1)];
  let g = '<circle class="c-o" r="' + R + '"/>';
  for (let a = 0; a < 360; a += 10) {
    const big = a % 30 === 0, p1 = P(R, a), p2 = P(R - (big ? 9 : 4), a);
    g += '<line class="c-t' + (big ? ' b' : '') + '" x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '"/>';
  }
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(c => {
    const p = P(64, c[1]);
    g += '<text class="c-d" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle" dominant-baseline="central">' + c[0] + '</text>';
  });
  const yr = S.str.slice(0, 4), win = sunDay(yr + '-12-21'), sum = sunDay(yr + '-06-21');
  const band = (a, b, cls) => {
    if (a == null || b == null) return '';
    const lo = Math.min(a, b), hi = Math.max(a, b), p1 = P(R + 6, lo), p2 = P(R + 6, hi);
    return '<path class="' + cls + '" d="M' + p1[0] + ' ' + p1[1] + 'A' + (R + 6) + ' ' + (R + 6) + ' 0 0 1 ' + p2[0] + ' ' + p2[1] + '"/>';
  };
  g += band(win.riseAz, sum.riseAz, 'c-br') + band(win.setAz, sum.setAz, 'c-bs');
  const ray = (az, cls) => { const p = P(R, az); return '<line class="' + cls + '" x2="' + p[0] + '" y2="' + p[1] + '"/><circle class="' + cls + '-d" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; };
  if (S.riseAz != null) g += ray(S.riseAz, 'c-rr');
  if (S.setAz != null) g += ray(S.setAz, 'c-rs');
  g += '<circle id="compSun" r="8" stroke-width="2"/><circle class="c-c" r="3"/>';
  return '<svg class="compass" viewBox="-108 -108 216 216" role="img" aria-label="Sunrise and sunset directions"><g id="dial">' + g + '</g><path class="c-up" d="M0 -106 L-6 -96 L6 -96 Z"/></svg>';
}

function moonSvg(phase) {
  const r = 30, k = Math.cos(2 * Math.PI * phase), rx = Math.abs(k) * r;
  const waxing = phase < .5, crescent = k > 0;
  const d = waxing
    ? 'M0 ' + -r + 'A' + r + ' ' + r + ' 0 0 1 0 ' + r + 'A' + rx.toFixed(1) + ' ' + r + ' 0 0 ' + (crescent ? 0 : 1) + ' 0 ' + -r
    : 'M0 ' + -r + 'A' + r + ' ' + r + ' 0 0 0 0 ' + r + 'A' + rx.toFixed(1) + ' ' + r + ' 0 0 ' + (crescent ? 1 : 0) + ' 0 ' + -r;
  return '<svg class="moon" viewBox="-32 -32 64 64" aria-hidden="true"><circle r="' + r + '" class="m-dark"/><path d="' + d + '" class="m-lit"/></svg>';
}

function phasesHtml(S) {
  const T = S.T;
  const rows = [
    ['nightEnd', 'Astronomical dawn'], ['nauticalDawn', 'Nautical dawn'], ['blueAMStart', 'Blue hour starts'],
    ['dawn', 'Civil dawn'], ['blueAMEnd', 'Blue hour ends'], ['sunrise', 'Sunrise'],
    ['goldenHourEnd', 'Golden hour ends'], ['solarNoon', 'Solar noon'], ['goldenHour', 'Golden hour starts'],
    ['sunset', 'Sunset'], ['blueEveStart', 'Blue hour starts'], ['dusk', 'Civil dusk'],
    ['blueEveEnd', 'Blue hour ends'], ['nauticalDusk', 'Nautical dusk'], ['night', 'Full darkness']
  ].filter(r => isD(T[r[0]])).sort((a, b) => T[a[0]] - T[b[0]]);
  const hl = { sunrise: 1, sunset: 1 };
  const next = sunDay(addDays(S.str, 1));
  const nightMin = (isD(T.night) && isD(next.T.nightEnd)) ? (next.T.nightEnd - T.night) / 60000 : null;
  const prev = sunDay(addDays(S.str, -1));
  const diff = Math.round((S.dayLen - prev.dayLen) * 60), ad = Math.abs(diff);
  const shadow = S.noonAlt > 0 ? 1 / Math.tan(S.noonAlt * rad) : null;
  return '<section class="block"><h2>The day</h2><dl class="rows">' +
    row('Day length', dur(S.dayLen), (diff >= 0 ? '+' : '−') + Math.floor(ad / 60) + ' min ' + pad(ad % 60) + ' s vs yesterday') +
    row('Height at noon', num(S.noonAlt, 1) + ' °', 'at ' + hm(T.solarNoon)) +
    row('Shadow at noon', shadow ? num(shadow, 2) + ' m' : '—', 'for an object 1 m tall') +
    row('Full darkness', nightMin != null ? dur(nightMin) : 'None') +
    '</dl><details class="more"><summary>All light phases</summary><ul class="phases">' +
    rows.map(r => '<li' + (hl[r[0]] ? ' class="hl"' : '') + '><b>' + hm(T[r[0]]) + '</b><span>' + r[1] + '</span></li>').join('') +
    '</ul></details></section>';
}

function moonHtml(S) {
  const mi = moonIllum(S.ref), mp = moonPos(S.ref), mt = moonTimes(S);
  const full = nextPhase(S.ref.getTime(), .5), nw = nextPhase(S.ref.getTime(), 0);
  const ill = mi.fraction;
  const sky = ill < .1 ? 'Very dark night, ideal for the Milky Way.' : ill < .4 ? 'Fairly dark night, good for stars.' :
    ill < .8 ? 'The Moon is bright, the sky is less dark.' : 'Very bright Moon, few stars visible.';
  const dd = d => isD(d) ? dayMonth(d) : '—';
  return '<section class="block"><h2>Moon</h2><div class="moon-head">' + moonSvg(mi.phase) +
    '<div><b>' + moonName(mi.phase) + '</b><small>' + num(ill * 100) + '% lit. ' + sky + '</small></div></div><dl class="rows">' +
    row('Moonrise', hm(mt.rise), mt.rise ? '' : (mt.alwaysUp ? 'up all day' : 'no moonrise that day')) +
    row('Moonset', hm(mt.set), mt.set ? '' : 'no moonset that day') +
    row('Full moon', dd(full)) + row('New moon', dd(nw)) +
    row('Distance', num(mp.distance) + ' km') + '</dl></section>';
}

/* Year curve: cached, because 183 days are computed */
const years = new Map();
function yearData(y) {
  if (years.has(y)) return years.get(y);
  const list = [];
  for (let s = y + '-01-01', i = 0; s.startsWith(String(y)) && i < 370; s = addDays(s, 2), i += 2) {
    const S = sunDay(s);
    list.push({ s, doy: i, rise: isD(S.T.sunrise) ? minOfDay(S.T.sunrise) : null, set: isD(S.T.sunset) ? minOfDay(S.T.sunset) : null, ref: S.ref, T: S.T });
  }
  years.set(y, list);
  return list;
}
const Y1 = { W: 360, H: 214, x0: 34, x1: 352, top: 8, bot: 190 };
const yX = d => Y1.x0 + d / 365 * (Y1.x1 - Y1.x0);
const yY = m => Y1.bot - m / 1440 * (Y1.bot - Y1.top);

function yearSvg(y) {
  const data = yearData(y);
  const line = k => data.map((p, i) => (i ? 'L' : 'M') + yX(p.doy).toFixed(1) + ' ' + yY(p[k]).toFixed(1)).join('');
  const band = line('set') + [...data].reverse().map(p => 'L' + yX(p.doy).toFixed(1) + ' ' + yY(p.rise).toFixed(1)).join('') + 'Z';
  let g = '';
  [0, 6, 12, 18, 24].forEach(h => {
    g += '<line class="a-grid" x1="' + Y1.x0 + '" x2="' + Y1.x1 + '" y1="' + yY(h * 60) + '" y2="' + yY(h * 60) + '"/>' +
      '<text class="a-t" x="' + (Y1.x0 - 5) + '" y="' + (yY(h * 60) + 3.5) + '" text-anchor="end">' + pad(h) + ':00</text>';
  });
  'JFMAMJJASOND'.split('').forEach((m, i) => {
    g += '<text class="a-t" x="' + yX(i * 30.42 + 15).toFixed(1) + '" y="' + (Y1.H - 8) + '" text-anchor="middle">' + m + '</text>';
  });
  g += '<path class="y-band" d="' + band + '"/><path class="y-set" d="' + line('set') + '"/><path class="y-rise" d="' + line('rise') + '"/>';
  g += '<text class="y-lab" x="' + yX(150) + '" y="' + (yY(data[75].set) - 12) + '" text-anchor="middle">Sunset</text>';
  g += '<text class="y-lab" x="' + yX(150) + '" y="' + (yY(data[75].rise) + 20) + '" text-anchor="middle">Sunrise</text>';
  g += '<g id="yNow"><line id="yLine" class="y-now" y1="' + Y1.top + '" y2="' + Y1.bot + '"/><circle id="yS" class="y-dot" r="4.5"/><circle id="yR" class="y-dot" r="4.5"/></g>';
  return '<svg id="yearChart" class="year" viewBox="0 0 ' + Y1.W + ' ' + Y1.H + '" role="img" aria-label="Sunrise and sunset times over the year">' + g + '</svg>';
}

export function setYearPoint(y, doy) {
  const data = yearData(y), p = data[clamp(Math.round(doy / 2), 0, data.length - 1)];
  const x = yX(p.doy).toFixed(1);
  $('#yLine').setAttribute('x1', x); $('#yLine').setAttribute('x2', x);
  $('#yS').setAttribute('cx', x); $('#yS').setAttribute('cy', yY(p.set).toFixed(1));
  $('#yR').setAttribute('cx', x); $('#yR').setAttribute('cy', yY(p.rise).toFixed(1));
  $('#yRead').textContent = cap(dayMonth(p.ref)) + ': sunrise ' + hm(p.T.sunrise) + ', sunset ' + hm(p.T.sunset);
}
export const yearPointFromX = (svg, clientX) => {
  const b = svg.getBoundingClientRect();
  const x = (clientX - b.left) / b.width * Y1.W;
  return clamp((x - Y1.x0) / (Y1.x1 - Y1.x0) * 365, 0, 365);
};
export const minuteFromX = (svg, clientX) => {
  const b = svg.getBoundingClientRect();
  const x = (clientX - b.left) / b.width * A.W;
  return clamp(Math.round((x - A.x0) / (A.x1 - A.x0) * 1440 / 5) * 5, 0, 1439);
};

function weatherHtml(S, ts, alt, label) {
  let body;
  const w = wx.data ? hourData(ts) : null;
  if (!wx.data) body = '<p class="muted">' + (wx.status === 'loading' ? 'Loading the weather…' : 'Weather unavailable: check your connection. Sun times still work.') + '</p>';
  else if (!w) body = '<p class="muted">No weather for this date: forecasts cover yesterday and the next 9 days.</p>';
  else {
    const D = dayData(S.str), ic = wmo(w.code, alt < -.833);
    const lay = (l, v) => '<div class="lay"><span>' + l + '</span><i><u style="width:' + clamp(v ?? 0, 0, 100) + '%"></u></i><em>' + num(v) + '%</em></div>';
    body = '<p class="wx-line big">' + icon(ic[0]) + ic[1] + '</p><dl class="rows">' +
      row('Temperature', num(w.temp, 1) + ' °', D ? num(D.tmin) + ' to ' + num(D.tmax) + ' ° over the day' : '') +
      row('Rain', num(w.pp) + '%', num(w.precip, 1) + ' mm/h') +
      row('Wind', num(w.wind) + ' km/h', (w.dir != null ? 'from ' + dirName(w.dir) + ', ' : '') + 'gusts ' + num(w.gust)) +
      row('Visibility', w.vis != null ? num(w.vis / 1000, 1) + ' km' : '—') +
      row('Humidity', num(w.hum) + '%') + row('Pressure', num(w.pres) + ' hPa') +
      (D ? row('Max UV index', num(D.uv, 1)) + row('Sunshine', D.sun != null ? num(D.sun / 3600, 1) + ' h' : '—') : '') +
      '</dl><div class="layers">' + lay('Total', w.total) + lay('High', w.high) + lay('Mid', w.mid) + lay('Low', w.low) + '</div>' +
      (wx.status === 'offline' ? '<p class="muted small">Offline: weather saved at ' + hm(new Date(wx.stamp)) + '.</p>' : '');
  }
  return '<h2>Weather at ' + label + '</h2>' + body;
}

export function renderSky(el, app) {
  const str = app.skyDate(), S = sunDay(str), y = +str.slice(0, 4);
  el.innerHTML = '<div class="page page-top">' +
    '<section class="readout"><h1 id="skyTime">—</h1><p id="skyStatus"></p>' +
      '<button type="button" class="link" id="skyNow" data-act="skynow">Now</button></section>' +
    '<div class="arc-wrap">' + arcSvg(S) + '</div>' +
    '<input type="range" id="slider" min="0" max="1439" step="5" aria-label="Time of day">' +
    '<section class="block compass-block"><h2>Sun direction</h2>' + compassSvg(S) +
      '<p class="muted center" id="aimHint">Red: sunset, gold: sunrise. The arcs show how far they move over the year.</p>' +
      '<button type="button" class="btn" id="aimBtn" data-act="aim">' + icon('aim') + 'Aim with your phone</button></section>' +
    '<section class="block" id="skyWx"></section>' +
    phasesHtml(S) + moonHtml(S) +
    '<section class="block"><h2>The year ' + y + '</h2><div class="year-wrap">' + yearSvg(y) + '</div><p class="muted small" id="yRead"></p></section>' +
    '</div>';
  const jan1 = Date.UTC(y, 0, 1), [yy, mm, dd] = parse(str);
  setYearPoint(y, (Date.UTC(yy, mm - 1, dd) - jan1) / 864e5);
  app.skyHour = null;
  updateSkyTime(app);
}

export function updateSkyTime(app) {
  const str = app.skyDate(), min = app.skyMinute(), S = sunDay(str);
  if (!$('#arcSun')) return;
  const [y, m, d] = parse(str);
  const ts = localTs(y, m, d, Math.floor(min / 60), min % 60);
  const pos = position(new Date(ts)), alt = pos.altitude, up = alt > -.833;
  const morning = isD(S.T.solarNoon) ? ts < S.T.solarNoon : min < 720;
  const cx = X(min).toFixed(1), cy = Math.min(Y(alt), A.bot - 8).toFixed(1);   // at night the dot stays on the chart

  const sun = $('#arcSun');
  sun.setAttribute('cx', cx); sun.setAttribute('cy', cy); sun.setAttribute('class', up ? 's-up' : 's-dn');
  const drop = $('#arcDrop');
  drop.setAttribute('x1', cx); drop.setAttribute('x2', cx); drop.setAttribute('y1', cy);
  $('#slider').value = min;
  $('#skyTime').textContent = clock(min);
  $('#skyStatus').textContent = phaseName(alt, morning) + '. Sun ' + num(Math.abs(alt), 1) + ' ° ' + (up ? 'above' : 'below') + ' the horizon, due ' + dirName(pos.azimuth) + '.';
  $('#skyNow').hidden = app.state.skyMin === null && app.state.date === null;

  const b = pos.azimuth * rad, cs = $('#compSun');
  cs.setAttribute('cx', (84 * Math.sin(b)).toFixed(1)); cs.setAttribute('cy', (-84 * Math.cos(b)).toFixed(1));
  cs.setAttribute('class', up ? 's-up' : 's-dn');

  const hourKey = str + Math.round(ts / 3600e3) + wx.status + wx.stamp;
  if (app.skyHour !== hourKey || !$('#skyWx').firstChild) {
    app.skyHour = hourKey;
    $('#skyWx').innerHTML = weatherHtml(S, ts, alt, clock(min));
  } else {
    const h2 = $('#skyWx h2');
    if (h2) h2.textContent = 'Weather at ' + clock(min);
  }
}

export function setHeading(app, heading) {
  const dial = $('#dial');
  if (!dial) return;
  dial.setAttribute('transform', 'rotate(' + (-heading).toFixed(1) + ')');
  const S = sunDay(app.skyDate());
  const target = S.setAz;
  const gap = ((target - heading + 540) % 360) - 180, a = Math.abs(Math.round(gap));
  $('#aimHint').textContent = a <= 4 ? 'You’re facing the sunset.' : 'Sunset is ' + a + ' ° to your ' + (gap < 0 ? 'left' : 'right') + '.';
  return a;
}
export function resetHeading() {
  const dial = $('#dial');
  if (dial) dial.removeAttribute('transform');
}
