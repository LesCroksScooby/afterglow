/* Line icons drawn for the app (they inherit the text colour). */
const P = {
  sunset: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 8V4M4.5 10.5 6 12M19.5 10.5 18 12M9 21h6"/>',
  week: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  book: '<path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 17a2 2 0 0 1 2-2h13M9 8h6"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v7h14v-7"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  partly: '<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.5v1M2.5 8.5h1M4.3 4.3l.7.7M12.7 4.3l-.7.7M9 19h9a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 9 11.5 3.8 3.8 0 0 0 9 19z"/>',
  cloud: '<path d="M7 19h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 10.5 4.3 4.3 0 0 0 7 19z"/>',
  rain: '<path d="M7 15h10a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 6.2 7.6 3.8 3.8 0 0 0 7 15zM8 18l-1 3M13 18l-1 3M18 18l-1 3"/>',
  snow: '<path d="M7 14h10a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 6.2 6.6 3.8 3.8 0 0 0 7 14zM8 18h.01M12 20h.01M16 18h.01"/>',
  fog: '<path d="M4 9h16M6 13h12M4 17h16"/>',
  storm: '<path d="M7 14h10a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 6.2 6.6 3.8 3.8 0 0 0 7 14zM13 12l-3 5h4l-2 4"/>',
  star: '<path d="m12 3.5 2.6 5.6 6 .7-4.4 4.2 1.2 6L12 17l-5.4 3 1.2-6-4.4-4.2 6-.7z"/>',
  aim: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="5"/>'
};
export const icon = (name, cls = '') =>
  '<svg class="ic ' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
