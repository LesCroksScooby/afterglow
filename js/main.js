/* Démarrage, état de l'appli et gestion des gestes. */
import { HOME, WX_TTL, saveLocation } from './config.js';
import { sunDay } from './astro.js';
import { loadWeather, wx } from './weather.js';
import { cachedProfile, fetchProfile } from './horizon.js';
import { eventInfo } from './model.js';
import { loadJournal, entryFor, importJournal, removeEntry, saveEntry } from './journal.js';
import { loadSpots, parseCoords, saveSpots } from './spots.js';
import { buildIcs } from './calendar.js';
import { deliverFile, eveningImage } from './share.js';
import { startCompass, stopCompass } from './compass.js';
import { addDays, cap, hm, isD, longDate, localNow } from './time.js';
import { armSound, play, setSound, soundOn } from './sound.js';
import { $, esc, toast } from './ui/dom.js';
import { renderToday, updateCount } from './ui/today.js';
import { renderWeek } from './ui/week.js';
import { minuteFromX, renderSky, resetHeading, setHeading, setYearPoint, updateSkyTime, yearPointFromX } from './ui/sky.js';
import { renderNotebook } from './ui/notebook.js';

const state = { tab: 'today', date: null, kind: 'set', skyMin: null, aiming: false };

const app = {
  state,
  spots: loadSpots(),
  skyHour: null,
  /* En direct, « Ce soir » passe au lendemain 20 min après l'événement. */
  liveDate() {
    const today = localNow().str, S = sunDay(today);
    const t = state.kind === 'set' ? S.T.sunset : S.T.sunrise;
    return isD(t) && Date.now() > +t + 20 * 60000 ? addDays(today, 1) : today;
  },
  viewDate: () => state.date || app.liveDate(),
  skyDate: () => state.date || localNow().str,
  skyMinute: () => (state.skyMin === null ? localNow().min : state.skyMin)
};

const VIEWS = { today: renderToday, week: renderWeek, sky: renderSky, book: renderNotebook };
const panel = id => document.getElementById('tab-' + id);

function render() {
  VIEWS[state.tab](panel(state.tab), app);
}

function showTab(id) {
  if (state.aiming) stopAiming();
  state.tab = id;
  Object.keys(VIEWS).forEach(k => { panel(k).hidden = k !== id; });
  document.querySelectorAll('.tabs button').forEach(b => {
    const on = b.dataset.tab === id;
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  render();
  window.scrollTo(0, 0);
}

function setDate(str) {
  state.date = str;
  state.skyMin = null;
  render();
}
/* après un changement de jour ou d'événement, une petite note signale un beau ciel prévu */
function promiseSound() {
  const c = eventInfo(app.viewDate(), state.kind).scored;
  if (c && c.score >= 60) play('shimmer', .12);
}
function shiftDay(n) {
  play('tap');
  setDate(addDays(app.viewDate(), n));
  promiseSound();
}

function stopAiming() {
  state.aiming = false;
  stopCompass();
  resetHeading();
}

function rate(date, kind, rating) {
  const prev = entryFor(date, kind);
  const E = eventInfo(date, kind);
  const raw = prev && prev.raw != null ? prev.raw : (E.scored ? E.scored.raw : null);
  saveEntry({ date, kind, rating, raw, note: prev ? prev.note : '' });
  play('star' + rating);
  toast('Note enregistrée');
  render();
}

async function remind(date, kind) {
  const E = eventInfo(date, kind);
  const name = kind === 'set' ? 'Coucher' : 'Lever';
  const ics = buildIcs({
    uid: date + '-' + kind, start: +E.time,
    title: name + ' du soleil, ' + HOME.name,
    description: E.scored ? 'Score prévu : ' + E.scored.score + '/100. ' + E.scored.reasons.join('. ') + '.' : 'Heure calculée à ' + hm(E.time) + '.'
  });
  const res = await deliverFile(new Blob([ics], { type: 'text/calendar' }), 'rappel-' + date + '.ics', name + ' du soleil');
  if (res !== 'cancelled') { play('success'); toast('Ouvre le fichier pour l’ajouter à ton agenda. Alarme 1 h avant.'); }
}

async function share() {
  const E = eventInfo(app.viewDate(), state.kind);
  const blob = await eveningImage(E);
  const res = await deliverFile(blob, 'soleil-' + E.str + '.png', cap(longDate(E.S.ref)));
  if (res !== 'cancelled') play('success');
  if (res === 'saved') toast('Image enregistrée');
}

async function exportData() {
  const text = JSON.stringify({ version: 1, journal: loadJournal(), spots: app.spots }, null, 1);
  await deliverFile(new Blob([text], { type: 'application/json' }), 'carnet-soleil.json', 'Carnet Soleil');
}

function measureSpot(s) {
  fetchProfile(s.lat, s.lon).then(render).catch(() => toast('Relief non mesuré : réseau indisponible'));
}

function locate() {
  if (!navigator.geolocation) { play('error'); toast('Position non disponible sur cet appareil'); return; }
  play('tap');
  toast('Recherche de ta position…');
  navigator.geolocation.getCurrentPosition(pos => {
    const input = $('#spotForm [name=coords]');
    if (input) input.value = pos.coords.latitude.toFixed(5) + ', ' + pos.coords.longitude.toFixed(5);
    play('success');
    toast('Position trouvée');
  }, () => { play('error'); toast('Position refusée : saisis les coordonnées à la main'); }, { enableHighAccuracy: true, timeout: 12000 });
}

async function toggleAim() {
  const btn = $('#aimBtn');
  if (state.aiming) { stopAiming(); render(); return; }
  let armed = true;
  const res = await startCompass(h => {
    if (!state.aiming || state.tab !== 'sky') return;
    const gap = setHeading(app, h);
    if (gap <= 4 && armed) { armed = false; play('aligned'); }
    else if (gap > 10) armed = true;
  });
  if (res !== 'ok') {
    play('error');
    toast(res === 'denied' ? 'Accès à la boussole refusé' : 'Pas de boussole sur cet appareil');
    return;
  }
  play('tap');
  state.aiming = true;
  btn.lastChild.textContent = 'Arrêter de viser';
  $('#aimHint').textContent = 'Tiens le téléphone à plat et tourne-toi.';
}

/* Changer de lieu : la météo gardée ne vaut plus, et l'heure locale change. */
function useLocation(place) {
  saveLocation(place);
  try { localStorage.removeItem('soleil-wx-v2'); } catch (e) { /* rien */ }
  location.reload();
}

let places = [];
async function searchPlace(q) {
  if (!q) { play('error'); toast('Saisis le nom d’une ville'); return; }
  play('tap');
  const box = $('#placeResults');
  try {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?count=5&language=fr&format=json&name=' + encodeURIComponent(q);
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    places = ((await r.json()).results || []).filter(p => p.timezone);
    box.innerHTML = places.length
      ? places.map((p, i) => '<button type="button" class="btn" data-act="place" data-i="' + i + '">' + esc([p.name, p.admin1, p.country].filter(Boolean).join(', ')) + '</button>').join('')
      : '<p class="muted">Aucun lieu trouvé. Essaie un autre nom.</p>';
  } catch (e) {
    play('error');
    box.innerHTML = '<p class="muted">Recherche impossible : vérifie la connexion.</p>';
  }
}

function useMyPosition() {
  if (!navigator.geolocation) { play('error'); toast('Position non disponible sur cet appareil'); return; }
  toast('Recherche de ta position…');
  navigator.geolocation.getCurrentPosition(pos => useLocation({
    name: 'Ma position',
    lat: +pos.coords.latitude.toFixed(4),
    lon: +pos.coords.longitude.toFixed(4),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone
  }), () => { play('error'); toast('Position refusée : cherche plutôt une ville'); }, { timeout: 12000 });
}

const ACTIONS = {
  'go-place': () => { play('tab'); showTab('book'); const f = $('#placeForm'); if (f) f.scrollIntoView({ block: 'center' }); },
  here: useMyPosition,
  place: b => {
    const p = places[+b.dataset.i];
    if (p) useLocation({ name: p.name, lat: +p.latitude.toFixed(4), lon: +p.longitude.toFixed(4), tz: p.timezone });
  },
  day: b => shiftDay(+b.dataset.d),
  live: () => { play('tab'); setDate(null); promiseSound(); },
  kind: b => {
    if (state.kind === b.dataset.kind) return;
    state.kind = b.dataset.kind;
    play(state.kind);
    render();
    promiseSound();
  },
  goto: b => { play('tab'); state.date = b.dataset.date; state.kind = 'set'; showTab('today'); promiseSound(); },
  rate: b => rate(b.dataset.date, b.dataset.kind, +b.dataset.r),
  remind: b => remind(b.dataset.date, b.dataset.kind),
  share,
  skynow: () => { play('tap'); state.skyMin = null; state.date = null; render(); },
  aim: toggleAim,
  locate,
  export: exportData,
  refresh: () => { play('tap'); toast('Actualisation…'); loadWeather(true, render); },
  sound: () => {
    setSound(!soundOn());
    if (soundOn()) play('success');
    render();
  },
  'del-entry': b => {
    if (confirm('Effacer cette note ?')) { removeEntry(b.dataset.date, b.dataset.kind); render(); }
  },
  'del-spot': b => {
    if (confirm('Supprimer ce spot ?')) {
      app.spots = app.spots.filter(s => s.id !== b.dataset.id);
      saveSpots(app.spots);
      render();
    }
  }
};

document.addEventListener('click', e => {
  const tab = e.target.closest('.tabs button');
  if (tab) {
    if (tab.dataset.tab !== state.tab) play('tab');
    showTab(tab.dataset.tab);
    return;
  }
  const b = e.target.closest('[data-act]');
  if (b && ACTIONS[b.dataset.act]) ACTIONS[b.dataset.act](b);
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'dateInput' && /^\d{4}-\d{2}-\d{2}$/.test(t.value)) { play('tap'); setDate(t.value); promiseSound(); }
  if (t.dataset.note) {
    const [date, kind] = t.dataset.note.split('|');
    const prev = entryFor(date, kind);
    if (prev) saveEntry({ ...prev, note: t.value.slice(0, 200) });
  }
  if (t.id === 'importFile' && t.files[0]) {
    const text = await t.files[0].text();
    const n = importJournal(text);
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (err) { /* déjà signalé par importJournal */ }
    if (n === null) { play('error'); toast('Ce fichier n’est pas une sauvegarde du carnet'); return; }
    play('success');
    if (parsed && Array.isArray(parsed.spots)) {
      app.spots = parsed.spots.filter(s => s && typeof s.name === 'string' && typeof s.lat === 'number' && typeof s.lon === 'number')
        .map(s => ({ id: String(s.id || s.name), name: s.name.slice(0, 40), lat: s.lat, lon: s.lon,
          facing: typeof s.facing === 'number' ? s.facing : null, travel: typeof s.travel === 'number' ? s.travel : 0 }));
      saveSpots(app.spots);
      app.spots.forEach(measureSpot);
    }
    toast(n + ' notes importées');
    render();
  }
});

document.addEventListener('submit', e => {
  if (e.target.id === 'placeForm') { e.preventDefault(); searchPlace(e.target.q.value.trim()); return; }
  if (e.target.id !== 'spotForm') return;
  e.preventDefault();
  const f = e.target, err = $('#spotError');
  const name = f.name.value.trim(), coords = parseCoords(f.coords.value);
  if (!name) { play('error'); err.textContent = 'Donne un nom à ce spot.'; return; }
  if (!coords) { play('error'); err.textContent = 'Position attendue sous la forme 48.8566, 2.3522, ou touche « Ma position ».'; return; }
  const spot = {
    id: Date.now().toString(36), name, ...coords,
    facing: f.facing.value === '' ? null : +f.facing.value,
    travel: Math.max(0, +f.travel.value || 0)
  };
  app.spots = [...app.spots, spot];
  saveSpots(app.spots);
  play('success');
  toast('Spot ajouté');
  render();
  measureSpot(spot);
});

document.addEventListener('input', e => {
  if (e.target.id === 'slider') setSkyMinute(+e.target.value);
});

/* un petit clic toutes les demi-heures quand on fait défiler la journée */
function setSkyMinute(min) {
  const before = Math.floor(app.skyMinute() / 30);
  state.skyMin = min;
  if (Math.floor(min / 30) !== before) play('tick');
  updateSkyTime(app);
}

/* glisser sur la courbe du jour et sur celle de l'année */
let drag = null;
document.addEventListener('pointerdown', e => {
  const svg = e.target.closest('#arcChart, #yearChart');
  if (!svg) return;
  drag = svg;
  svg.setPointerCapture(e.pointerId);
  moveDrag(e);
});
document.addEventListener('pointermove', e => { if (drag) moveDrag(e); });
const endDrag = () => { drag = null; };
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
let lastMonth = -1;
function moveDrag(e) {
  if (drag.id === 'arcChart') { setSkyMinute(minuteFromX(drag, e.clientX)); return; }
  const doy = yearPointFromX(drag, e.clientX), month = Math.floor(doy / 30.42);
  if (month !== lastMonth) { lastMonth = month; play('tick'); }
  setYearPoint(+app.skyDate().slice(0, 4), doy);
}

/* balayer le haut de « Ce soir » pour changer de jour */
let touch = null;
document.addEventListener('touchstart', e => {
  /* le balayage ne démarre jamais sur une commande */
  touch = e.target.closest('#hero') && !e.target.closest('button, label, input') ? [e.touches[0].clientX, e.touches[0].clientY] : null;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dy) < 50) shiftDay(dx < 0 ? 1 : -1);
}, { passive: true });

/* tic-tac */
let lastDay = localNow().str, lastLive = app.liveDate();
function tick() {
  const n = localNow(), live = app.liveDate();
  if (n.str !== lastDay || live !== lastLive) { lastDay = n.str; lastLive = live; render(); return; }
  if (state.tab === 'today') updateCount(app);
  if (state.tab === 'sky' && state.skyMin === null) updateSkyTime(app);
}
setInterval(tick, 20000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  tick();
  if (Date.now() - wx.stamp > WX_TTL) loadWeather(false, render);
});

/* démarrage */
armSound();
document.documentElement.classList.add('intro');
setTimeout(() => document.documentElement.classList.remove('intro'), 1500);
showTab('today');
loadWeather(false, render);
if (!cachedProfile(HOME.lat, HOME.lon)) fetchProfile(HOME.lat, HOME.lon).then(render).catch(() => {});
app.spots.filter(s => !cachedProfile(s.lat, s.lon)).forEach(measureSpot);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
