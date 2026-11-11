/* Reminder to add to the phone’s calendar (.ics file with an alarm). */
const stamp = ts => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function buildIcs({ uid, start, title, description, alarmMinutes = 60, durationMinutes = 45 }) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Afterglow//EN',
    'BEGIN:VEVENT',
    'UID:' + uid + '@afterglow',
    'DTSTAMP:' + stamp(Date.now()),
    'DTSTART:' + stamp(start),
    'DTEND:' + stamp(start + durationMinutes * 60000),
    'SUMMARY:' + esc(title),
    'DESCRIPTION:' + esc(description),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + esc(title),
    'TRIGGER:-PT' + alarmMinutes + 'M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n');
}
