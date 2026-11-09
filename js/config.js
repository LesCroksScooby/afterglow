/* Lieu choisi dans l'appli (Carnet > Réglages). Tant qu'aucun lieu n'est choisi, on affiche DEFAULT. */
import { store } from './store.js';

const KEY = 'soleil-lieu-v1';
const DEFAULT = { name: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' };
const saved = store.get(KEY, null);

export const HOME = { ...DEFAULT, ...(saved || {}), chosen: !!saved };
export const TZ = HOME.tz;
export const saveLocation = place => store.set(KEY, place);
export const WX_TTL = 20 * 60 * 1000;   // la météo est rechargée au bout de 20 min
export const FETCH_TIMEOUT = 10000;     // au-delà, on garde les données en mémoire
