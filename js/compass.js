/* Boussole en direct, à partir de l'orientation du téléphone. */
let listener = null, eventName = null, smooth = null;

export const compassSupported = () => 'DeviceOrientationEvent' in window;

export async function startCompass(onHeading) {
  stopCompass();
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return 'unsupported';
  if (typeof DOE.requestPermission === 'function') {
    try {
      if (await DOE.requestPermission() !== 'granted') return 'denied';
    } catch (e) { return 'denied'; }
  }
  smooth = null;
  listener = e => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
    if (h == null) return;
    /* lissage en passant par le chemin angulaire le plus court */
    smooth = smooth == null ? h : (smooth + (((h - smooth + 540) % 360) - 180) * .18 + 360) % 360;
    onHeading(smooth);
  };
  eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(eventName, listener);
  return 'ok';
}

export function stopCompass() {
  if (listener) window.removeEventListener(eventName, listener);
  listener = null;
}
