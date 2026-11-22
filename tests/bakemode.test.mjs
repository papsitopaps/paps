import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeSteps, completeStep, currentStep, buildIcs, countdown, waterFor } from '../web/bakemode.js';
import { yeastRate, freshYeastPct, fermentationUnits, computeDough, hoursForYeast } from '../web/engine.js';

const H = 3600e3;
const steps = [{ label: 'Mix dough', hours: 2 }, { label: 'Into the fridge', hours: 24 }, { label: 'Balls at RT', hours: 4 }, { label: 'Bake', hours: 0, bake: true }];

test('steps are laid out back to back and re-timed when one finishes early', () => {
  const t0 = Date.UTC(2026, 10, 22, 10);
  const s = timeSteps(steps, t0);
  assert.deepEqual(s.map(x => (x.start - t0) / H), [0, 2, 26, 30]);
  assert.equal(currentStep(s), 0);
  const after = completeStep(s, 0, t0 + 1.5 * H); // dough ready 30 min early
  assert.equal(currentStep(after), 1);
  assert.deepEqual(after.map(x => (x.start - t0) / H), [0, 1.5, 25.5, 29.5]);
  assert.equal(currentStep(completeStep(completeStep(completeStep(after, 1, t0), 2, t0), 3, t0)), -1);
});

test('calendar file has one event with an alarm per remaining step', () => {
  const ics = buildIcs(timeSteps(steps, Date.UTC(2026, 10, 22, 10)), { title: 'Prozimi · Neapolitan', uid: 'x', nowMs: 0 });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 4);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 4);
  assert.ok(ics.includes('DTSTART:20261122T100000Z'));
  assert.ok(ics.includes('SUMMARY:Prozimi · Neapolitan: Into the fridge'));
});

test('countdown text', () => {
  assert.equal(countdown(65_000, 0), '1:05');
  assert.equal(countdown(3_725_000, 0), '1:02:05');
  assert.equal(countdown(0, 90_000), '+1:30');
});

test('water temperature for a target dough temperature', () => {
  assert.equal(waterFor({ target: 23, room: 22, flour: 22, mixer: 'hand' }), 24);
  assert.equal(waterFor({ target: 23, room: 22, mixer: 'spiral' }), 14);
  assert.equal(waterFor({ target: 25, room: 24, mixer: 'stand', levain: 24 }), 22); // 4×25 − 24 − 24 − 6 − 24
});

test('temperature model: fridge is about 18× slower than 20 °C, warm is faster', () => {
  assert.equal(yeastRate(20), 1);
  assert.ok(yeastRate(4) > 0.04 && yeastRate(4) < 0.08, `4 °C rate ${yeastRate(4)}`);
  assert.ok(yeastRate(26) > 1.3 && yeastRate(26) < 1.5);
  assert.equal(yeastRate(0), 0);
  assert.equal(yeastRate(46), 0);
});

test('each stage counts at its own temperature', () => {
  const cold = fermentationUnits([{ hours: 2, temp: 20 }, { hours: 24, temp: 4 }, { hours: 4, temp: 20 }]);
  const warmFinish = fermentationUnits([{ hours: 2, temp: 20 }, { hours: 24, temp: 4 }, { hours: 4, temp: 26 }]);
  assert.ok(warmFinish > cold);
  const base = { balls: 1, ballWeight: 250, hydration: 60, salt: 3, fat: 0, rt1Hours: 2, ctHours: 24, ctTemp: 4, rt2Hours: 4, rtTemp: 20, yeastType: 'CY', flours: [], forceCold: true };
  const a = computeDough(base, {}).yeast, b = computeDough({ ...base, rt2Temp: 26 }, {}).yeast;
  assert.ok(b < a, 'a warmer final stage needs less yeast');
});

test('yeast amounts stay in the range home pizza makers use', () => {
  const y = (stages, extra = {}) => freshYeastPct({ hydration: 60, salt: 3, units: fermentationUnits(stages), ...extra });
  const idy = cy => cy / 3;
  // 24 h in the fridge plus 2 h + 4 h at room temperature: commonly 0.1–0.3% instant dry yeast
  const c24 = idy(y([{ hours: 2, temp: 20 }, { hours: 24, temp: 4 }, { hours: 4, temp: 20 }]));
  assert.ok(c24 > 0.1 && c24 < 0.3, `24 h cold: ${c24}% IDY`);
  // 24 h at 18 °C: classic long room-temperature Neapolitan, commonly 0.1–0.25% fresh yeast
  const rt24 = y([{ hours: 24, temp: 18 }]);
  assert.ok(rt24 > 0.08 && rt24 < 0.25, `24 h at 18 °C: ${rt24}% CY`);
  // reference point is unchanged
  assert.equal(freshYeastPct({ hydration: 60, salt: 3, hours: 8, temp: 20 }).toFixed(3), '0.497');
  assert.ok(Math.abs(hoursForYeast({ hydration: 60, salt: 3, cyPct: 0.497, temp: 20 }) - 8) < 0.01);
});
