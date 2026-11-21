import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendPlans, atNight, PLAN_RULES } from '../web/planner.js';

const total = p => p.delay + p.rt1Hours + p.ctHours + p.rt2Hours;

test('two days ahead: long cold ferment is recommended and fits the window', () => {
  const { plans } = recommendPlans({ style: 'contemporary', hours: 50 });
  assert.equal(plans[0].id, 'cold');
  assert.ok(plans[0].recommended);
  assert.ok(plans[0].ctHours >= 24 && plans[0].ctHours <= 48);
  for (const p of plans) assert.ok(total(p) <= 50 - 0.5 + 1e-9, `${p.id} ${total(p)}`);
});

test('a week ahead: plans wait before starting instead of over-fermenting', () => {
  const { plans } = recommendPlans({ style: 'neapolitan', hours: 24 * 7 });
  const cold = plans.find(p => p.id === 'cold');
  assert.equal(cold.ctHours, PLAN_RULES.neapolitan.cold.ideal[1]);
  assert.ok(cold.delay > 0);
  const room = plans.find(p => p.id === 'room');
  assert.equal(room.rt1Hours + room.rt2Hours, PLAN_RULES.neapolitan.rt.max);
});

test('same evening: room-temperature plan only', () => {
  const { plans } = recommendPlans({ style: 'neapolitan', hours: 9 });
  assert.deepEqual(plans.map(p => p.id), ['room']);
  assert.equal(plans[0].rt1Hours, 8.5);
});

test('too little time gives a rushed plan with a warning', () => {
  const { plans } = recommendPlans({ style: 'contemporary', hours: 4 });
  assert.equal(plans[0].id, 'rushed');
  assert.ok(plans[0].warning);
});

test('levain or pre-ferment lead time is taken out of the window', () => {
  const a = recommendPlans({ style: 'bread', hours: 24 }).plans.find(p => p.id === 'cold');
  const b = recommendPlans({ style: 'bread', hours: 24, lead: 6 }).plans.find(p => p.id === 'cold');
  assert.ok(b.ctHours + b.delay < a.ctHours + a.delay);
});

test('night detection', () => {
  assert.ok(atNight(new Date(2026, 0, 1, 23, 30)));
  assert.ok(atNight(new Date(2026, 0, 1, 3, 0)));
  assert.ok(!atNight(new Date(2026, 0, 1, 7, 0)));
});
