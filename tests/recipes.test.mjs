import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDough } from '../web/engine.js';
import { LIBRARY } from '../web/recipes.js';

const BASE = {
  balls: 1, ballWeight: 250, balls2: 0, ballWeight2: 0, hydration: 60, salt: 3, fat: 0, sugar: 0,
  rt1Hours: 8, rt2Hours: 0, ctHours: 0, ctTemp: 4, rtTemp: 20, yeastType: 'CY', starterHydration: 100,
  levainManual: false, levainPct: 20, flours: [{ name: 'A', pct: 100 }], bigaPct: 50, bigaHydration: 45,
  bigaYeastPct: null, bigaHours: 18, bigaTemp: 18, poolishPct: 30, poolishHours: 12, oldDoughIn: 10, oldDoughOut: 10,
  yeastManual: false, yeastPct: 0.3,
};
const load = id => { const t = LIBRARY.find(x => x.id === id); return [{ ...BASE, ...t.r, forceFat: t.style === 'focaccia', forceCold: true }, { floursCount: 1, ...t.s }]; };

test('focaccia library recipe reproduces the original grams', () => {
  const o = computeDough(...load('focaccia-biga-50'));
  assert.equal(Math.round(o.flourTotal), 2000);
  assert.equal(Math.round(o.preferment.flour), 1000);
  assert.equal(Math.round(o.preferment.water), 600);
  assert.equal(o.preferment.yeast.toFixed(1), '1.0');
  assert.equal(Math.round(o.flour), 1000);
  assert.equal(Math.round(o.water), 1120);
  assert.equal(Math.round(o.salt), 75);
  assert.equal(Math.round(o.fat), 80);
  assert.equal(Math.round(o.yeast), 10);
  assert.ok(o.yeastManual && o.yeastHours > 0);
});

test('contemporary library recipe: 50% biga at 45%, 71% total hydration, 285 g balls', () => {
  const o = computeDough(...load('contemporary-biga-50'));
  assert.equal(Math.round(o.dough), 4 * 285);
  assert.ok(Math.abs(o.preferment.flour - o.flourTotal / 2) < 1e-9);
  assert.ok(Math.abs(o.preferment.water / o.preferment.flour - 0.45) < 1e-9);
  assert.ok(Math.abs((o.water + o.preferment.water) / o.flourTotal - 0.71) < 1e-9);
  assert.equal(o.preferment.hours, 20);
  assert.equal(o.preferment.temp, 9);
});

test('default biga yeast is 1% fresh yeast, converted for dry yeast', () => {
  const cy = computeDough({ ...BASE, yeastType: 'CY' }, { biga: true });
  const idy = computeDough({ ...BASE, yeastType: 'IDY' }, { biga: true });
  assert.ok(Math.abs(cy.preferment.yeastPct - 1) < 1e-9);
  assert.ok(Math.abs(idy.preferment.yeastPct - 1 / 3) < 1e-9);
});
