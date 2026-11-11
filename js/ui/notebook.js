/* Onglet « Carnet » : notes, spots, sauvegarde. */
import { spotsFor } from '../model.js';
import { journalOffset, loadJournal } from '../journal.js';
import { wx } from '../weather.js';
import { dayMonth, dirName, hm, parse } from '../time.js';
import { pendingRating, starsHtml } from './today.js';
import { HOME } from '../config.js';
import { esc } from './dom.js';
import { soundOn } from '../sound.js';

const FACINGS = [['', 'Vue dégagée tout autour'], ['0', 'Nord'], ['45', 'Nord-est'], ['90', 'Est'], ['135', 'Sud-est'], ['180', 'Sud'], ['225', 'Sud-ouest'], ['270', 'Ouest'], ['315', 'Nord-ouest']];
const dateOf = s => { const [y, m, d] = parse(s); return new Date(Date.UTC(y, m - 1, d, 12)); };

export function renderNotebook(el, app) {
  const list = loadJournal(), offset = journalOffset();
  const pending = pendingRating();
  const spots = spotsFor(app.spots, app.viewDate(), app.state.kind);

  const calib = list.length < 3
    ? 'Note encore ' + (3 - list.length) + ' coucher' + (3 - list.length > 1 ? 's' : '') + ' pour que le score s’ajuste à ton ciel.'
    : offset === 0 ? 'Tes notes confirment le score, aucune correction appliquée.'
      : 'Le score est ajusté de ' + (offset > 0 ? '+' : '−') + Math.abs(offset) + ' points d’après tes ' + list.length + ' notes.';

  const entries = list.slice(0, 30).map(e =>
    '<li><div class="e-head"><b>' + (e.kind === 'set' ? 'Coucher' : 'Lever') + ' du ' + dayMonth(dateOf(e.date)) + '</b>' +
    '<button type="button" class="link" data-act="del-entry" data-date="' + esc(e.date) + '" data-kind="' + esc(e.kind) + '">Effacer</button></div>' +
    starsHtml(e.date, e.kind, e.rating) +
    '<input class="note" type="text" maxlength="200" placeholder="Une note sur ce soir-là" value="' + esc(e.note || '') + '" data-note="' + esc(e.date) + '|' + esc(e.kind) + '" aria-label="Note">' +
    (e.raw != null ? '<small>Score prévu : ' + e.raw + '</small>' : '') + '</li>').join('');

  const spotRows = spots.map(s =>
    '<li><div class="e-head"><b>' + esc(s.spot.name) + '</b><button type="button" class="link" data-act="del-spot" data-id="' + esc(s.spot.id) + '">Supprimer</button></div>' +
    '<p><span class="tag" data-level="' + s.align.level + '">' + s.align.text + '</span> Soleil ' + (app.state.kind === 'set' ? 'caché à ' : 'visible à ') + '<b>' + hm(s.real) + '</b>, pars à <b>' + hm(s.leave) + '</b></p>' +
    '<small>' + (s.measured ? 'Relief mesuré, arbres non comptés.' : 'Relief pas encore mesuré : il faut du réseau.') +
    (s.spot.facing != null ? ' Regarde vers ' + dirName(s.spot.facing) + '.' : '') + (s.spot.travel ? ' ' + s.spot.travel + ' min de trajet.' : '') + '</small></li>').join('');

  el.innerHTML = '<div class="page page-top">' +
    '<h1 class="tab-title">Carnet</h1>' +
    (pending ? '<section class="block ask"><h2>Note le dernier ' + (pending.kind === 'set' ? 'coucher' : 'lever') + '</h2>' + starsHtml(pending.str, pending.kind, 0) + '</section>' : '') +
    '<section class="block"><h2>Mes observations</h2><p class="muted">' + calib + '</p>' + (entries ? '<ul class="entries">' + entries + '</ul>' : '') + '</section>' +
    '<section class="block"><h2>Mes spots</h2>' +
      (spotRows ? '<ul class="entries">' + spotRows + '</ul>' : '<p class="muted">Ajoute tes lieux pour savoir si le soleil sera dans l’axe, et à quelle heure partir.</p>') +
      '<details class="more"><summary>Ajouter un spot</summary><form id="spotForm" class="form" novalidate>' +
        '<label>Nom<input name="name" required maxlength="40" placeholder="Mon point de vue"></label>' +
        '<label>Position<span class="inline"><input name="coords" inputmode="text" placeholder="48.8566, 2.3522"><button type="button" class="btn" data-act="locate">Ma position</button></span></label>' +
        '<label>Vue principale<select name="facing">' + FACINGS.map(f => '<option value="' + f[0] + '">' + f[1] + '</option>').join('') + '</select></label>' +
        '<label>Trajet en minutes<input name="travel" type="number" inputmode="numeric" min="0" max="600" value="10"></label>' +
        '<p class="error" id="spotError" role="alert"></p>' +
        '<button type="submit" class="btn">Ajouter ce spot</button></form></details></section>' +
    '<section class="block"><h2>Réglages</h2>' +
      '<p>Lieu : <b>' + esc(HOME.name) + '</b></p>' +
      '<form id="placeForm" class="form" novalidate><label>Chercher une ville<span class="inline"><input name="q" maxlength="80" placeholder="Nom de la ville"><button type="submit" class="btn">Chercher</button></span></label></form>' +
      '<div id="placeResults" class="places"></div>' +
      '<div class="actions"><button type="button" class="btn" data-act="here">Utiliser ma position</button></div>' +
      '<button type="button" class="switch-row" role="switch" aria-checked="' + soundOn() + '" data-act="sound"><span>Sons de l’interface</span><span class="switch"><i></i></span></button>' +
      '<p class="muted small">Sur iPhone, le bouton silencieux les coupe aussi.</p></section>' +
    '<section class="block"><h2>Sauvegarde</h2><p class="muted">Tes notes restent sur ce téléphone. Exporte-les de temps en temps.</p>' +
      '<div class="actions"><button type="button" class="btn" data-act="export">Exporter</button>' +
      '<label class="btn">Importer<input type="file" id="importFile" accept="application/json,.json" hidden></label></div></section>' +
    '<footer class="foot"><p>Calculs : SunCalc. Météo et relief : <a href="https://open-meteo.com/">Open-Meteo</a>. Heure locale du lieu.' +
      (wx.stamp ? ' Météo mise à jour à ' + hm(new Date(wx.stamp)) + '.' : '') + '</p>' +
      '<button type="button" class="link" data-act="refresh">Actualiser la météo</button>' +
      '<p><a class="link" href="infos.html">Mentions légales et confidentialité</a></p></footer>' +
    '</div>';
}
