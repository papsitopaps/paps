// Guided bake mode helpers: step timing, calendar export, water temperature. Pure functions.

/**
 * Lay out steps one after another from `startMs`.
 * @param steps [{ label, hours, bake? }]
 * @returns the same steps with `start` (ms) added
 */
export function timeSteps(steps, startMs) {
  let t = startMs;
  return steps.map(s => { const out = { ...s, start: t }; t += (s.hours || 0) * 3600e3; return out; });
}

/**
 * Mark step `i` as done at `nowMs` and re-time everything after it from now,
 * so the plan follows what really happened (a dough that was ready early or late).
 */
export function completeStep(steps, i, nowMs) {
  const out = steps.map(s => ({ ...s }));
  out[i].done = true;
  out[i].doneAt = nowMs;
  let t = nowMs;
  for (let j = i + 1; j < out.length; j++) { out[j].start = t; t += (out[j].hours || 0) * 3600e3; }
  return out;
}

/** Index of the step in progress: the first one not done (or -1 when all are done). */
export const currentStep = steps => steps.findIndex(s => !s.done);

const pad = n => String(n).padStart(2, '0');
const icsDate = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * Calendar file (iCalendar, RFC 5545) with one event per step and an alert at its start.
 * Works with Apple Calendar, Google Calendar and Outlook, so reminders arrive with the app closed.
 */
export function buildIcs(steps, { title = 'Prozimi', nowMs = Date.now(), uid = 'prozimi' } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prozimi//Bake plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  steps.forEach((s, i) => {
    if (s.done) return;
    const end = s.start + Math.max((s.hours || 0) * 3600e3, 15 * 60e3);
    lines.push('BEGIN:VEVENT', `UID:${uid}-${i}@prozimi`, `DTSTAMP:${icsDate(nowMs)}`,
      `DTSTART:${icsDate(s.start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsText(`${title}: ${s.label}`)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(s.label)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Countdown text h:mm:ss (or m:ss) until `targetMs`; negative values are shown as overdue with a leading "+". */
export function countdown(targetMs, nowMs) {
  const late = nowMs > targetMs;
  let s = Math.round(Math.abs(targetMs - nowMs) / 1000);
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return `${late ? '+' : ''}${h ? `${h}:${pad(m)}` : m}:${pad(s)}`;
}

// ---------- Water temperature ----------
// Mixer heat added during kneading (°C), used for the desired-dough-temperature rule.
export const MIXERS = { hand: 1, stand: 6, spiral: 11 };

/**
 * Water temperature to reach a target dough temperature: 3 × target − room − flour − friction,
 * or with a levain 4 × target − room − flour − friction − levain (levain at room temperature).
 */
export function waterFor({ target, room, flour = room, mixer = 'hand', levain = null }) {
  const friction = MIXERS[mixer] ?? MIXERS.hand;
  return levain == null ? 3 * target - room - flour - friction : 4 * target - room - flour - friction - levain;
}
