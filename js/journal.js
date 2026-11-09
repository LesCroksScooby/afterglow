/* Carnet d'observations : tes notes corrigent le score avec le temps. */
import { store } from './store.js';
import { calibrationOffset } from './score.js';

const KEY = 'soleil-carnet-v1';
export const loadJournal = () => store.get(KEY, []);
export const journalOffset = () => calibrationOffset(loadJournal());
export const entryFor = (date, kind) => loadJournal().find(e => e.date === date && e.kind === kind) || null;

export function saveEntry(entry) {
  const list = loadJournal().filter(e => !(e.date === entry.date && e.kind === entry.kind));
  list.push(entry);
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  store.set(KEY, list);
}

export function removeEntry(date, kind) {
  store.set(KEY, loadJournal().filter(e => !(e.date === date && e.kind === kind)));
}

/* Remplace le carnet par une sauvegarde, après vérification du contenu. Renvoie le nombre de notes, ou null. */
export function importJournal(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  const list = Array.isArray(data) ? data : data && data.journal;
  if (!Array.isArray(list)) return null;
  const clean = list.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (e.kind === 'set' || e.kind === 'rise') &&
    Number.isInteger(e.rating) && e.rating >= 1 && e.rating <= 5);
  store.set(KEY, clean.map(e => ({
    date: e.date, kind: e.kind, rating: e.rating,
    raw: typeof e.raw === 'number' ? e.raw : null,
    note: typeof e.note === 'string' ? e.note.slice(0, 200) : ''
  })));
  return clean.length;
}
