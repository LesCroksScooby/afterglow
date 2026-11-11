/* Place chosen in the app (Journal > Settings). Until one is chosen, DEFAULT is shown. */
import { store } from './store.js';

const KEY = 'afterglow-place-v1';
const DEFAULT = { name: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' };
const saved = store.get(KEY, null);

export const HOME = { ...DEFAULT, ...(saved || {}), chosen: !!saved };
export const TZ = HOME.tz;
export const saveLocation = place => store.set(KEY, place);
export const WX_TTL = 20 * 60 * 1000;   // the weather is reloaded after 20 min
export const FETCH_TIMEOUT = 10000;     // beyond that, the saved data is kept
