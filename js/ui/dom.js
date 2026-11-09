export const $ = (s, r = document) => r.querySelector(s);
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/* À utiliser pour tout texte saisi (noms de spots, notes, sauvegardes importées). */
export const esc = s => String(s).replace(/[&<>"']/g, c => MAP[c]);
export const row = (label, value, extra = '') =>
  '<div class="row"><dt>' + label + '</dt><dd>' + value + (extra ? '<small>' + extra + '</small>' : '') + '</dd></div>';

export function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('on'), 3600);
}
