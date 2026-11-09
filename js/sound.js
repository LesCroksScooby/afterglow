/* Sons de l'interface, entièrement synthétisés : aucun fichier à charger, disponibles hors ligne.
   Chaque son est une liste de couches. n : souffle filtré (craie), t : note. */
import { store } from './store.js';

const KEY = 'soleil-sons-v1';
const STAR = [392, 440, 523.25, 587.33, 659.25];

const bell = (freq, at = 0, gain = .15, dur = .42) => [
  { t: 'sine', f: freq, gain, dur, at },
  { t: 'sine', f: freq * 2.01, gain: gain * .3, dur: dur * .5, at }
];

export const SOUNDS = {
  tap: [{ n: 'bandpass', f: 2400, q: 1.2, gain: .24, dur: .03 }, { t: 'triangle', f: 190, to: 120, gain: .16, dur: .05 }],
  tab: [{ n: 'bandpass', f: 1500, q: 1, gain: .17, dur: .04 }, { t: 'sine', f: 240, to: 170, gain: .18, dur: .07 }],
  tick: [{ n: 'bandpass', f: 3200, q: 3, gain: .1, dur: .014 }],
  set: [{ t: 'triangle', f: 520, to: 330, gain: .15, dur: .24 }, { t: 'sine', f: 260, to: 165, gain: .08, dur: .24 }],
  rise: [{ t: 'triangle', f: 330, to: 520, gain: .15, dur: .24 }, { t: 'sine', f: 165, to: 260, gain: .08, dur: .24 }],
  success: [...bell(523.25, 0, .13), ...bell(783.99, .08, .13)],
  error: [{ t: 'triangle', f: 150, to: 95, gain: .2, dur: .15 }],
  shimmer: [...bell(392, 0, .06, .9), ...bell(493.88, .07, .06, .9), ...bell(587.33, .14, .06, .9)],
  aligned: bell(880, 0, .12, .34)
};
STAR.forEach((f, i) => {
  SOUNDS['star' + (i + 1)] = i === 4 ? [...bell(f), ...bell(f * 1.5, .09, .1)] : bell(f);
});

let enabled = store.get(KEY, true);
let ctx = null, master = null, noise = null;
const shared = new WeakMap();

export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  store.set(KEY, on);
}

function noiseFor(ac) {
  if (shared.has(ac)) return shared.get(ac);
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * .1), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  shared.set(ac, buf);
  return buf;
}

/* Écrit un son dans un contexte audio. Séparé de play() pour pouvoir le contrôler hors temps réel. */
export function schedule(ac, dest, name, when = ac.currentTime, level = 1) {
  for (const l of SOUNDS[name] || []) {
    const start = when + (l.at || 0), end = start + l.dur;
    const env = ac.createGain();
    env.gain.setValueAtTime(.0001, start);
    env.gain.linearRampToValueAtTime(l.gain * level, start + .004);
    env.gain.exponentialRampToValueAtTime(.0001, end);
    env.connect(dest);
    let src;
    if (l.n) {
      src = ac.createBufferSource();
      src.buffer = noiseFor(ac);
      const filter = ac.createBiquadFilter();
      filter.type = l.n;
      filter.frequency.value = l.f;
      filter.Q.value = l.q;
      src.connect(filter).connect(env);
    } else {
      src = ac.createOscillator();
      src.type = l.t;
      src.frequency.setValueAtTime(l.f, start);
      if (l.to) src.frequency.exponentialRampToValueAtTime(l.to, end);
      src.connect(env);
    }
    src.start(start);
    src.stop(end + .02);
  }
}

function context() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = .8;
    master.connect(ctx.destination);
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

export function play(name, delay = 0) {
  if (!enabled) return;
  try {
    const ac = context();
    if (ac) schedule(ac, master, name, ac.currentTime + .005 + delay);
  } catch (e) { /* un son raté ne doit jamais bloquer l'appli */ }
}

/* Les navigateurs n'autorisent le son qu'après un geste : on prépare l'audio au premier appui. */
export function armSound() {
  const unlock = () => {
    if (enabled) { try { context(); } catch (e) { /* rien */ } }
    ['pointerdown', 'touchend', 'keydown'].forEach(n => document.removeEventListener(n, unlock));
  };
  ['pointerdown', 'touchend', 'keydown'].forEach(n => document.addEventListener(n, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (ctx && document.visibilityState !== 'visible') ctx.suspend().catch(() => {});
  });
}
