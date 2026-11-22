import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toOz, fromOz, ozText, fraction, volume, kindFor } from '../web/units.js';
import { parseRecipe, parseQty } from '../web/importer.js';
import { normalizeFlours, rebalanceFlours } from '../web/presets.js';

test('ounces round-trip', () => {
  assert.ok(Math.abs(toOz(250) - 8.818) < 0.001);
  assert.ok(Math.abs(fromOz(toOz(283)) - 283) < 1e-9);
  assert.deepEqual(ozText(1000), { n: 35.3, d: 1 });
});

test('kitchen fractions', () => {
  assert.equal(fraction(2.26), '2 ¼');
  assert.equal(fraction(0.5), '½');
  assert.equal(fraction(1.97), '2');
  assert.equal(fraction(0.66), '⅔');
});

test('volumes by ingredient', () => {
  assert.deepEqual(volume(480, 'flour'), { n: '4', unit: 'cup', plural: true });
  assert.deepEqual(volume(118.3, 'water'), { n: '½', unit: 'cup', plural: false });
  assert.deepEqual(volume(12, 'salt'), { n: '2', unit: 'tsp' });
  assert.deepEqual(volume(27, 'oil'), { n: '2', unit: 'tbsp' });
  assert.equal(volume(10, null), null);
  assert.equal(kindFor('Flour', 'g-rye'), 'rye');
  assert.equal(kindFor('Olive oil'), 'oil');
});

test('importer reads cups, spoons and ounces', () => {
  assert.equal(parseQty('2 1/2'), 2.5);
  assert.equal(parseQty('1½'), 1.5);
  const r = parseRecipe('3 1/2 cups bread flour\n1 ½ cups water\n2 tsp salt\n1 oz olive oil');
  assert.equal(r.grams.flour, 420);
  assert.equal(r.grams.salt, 12);
  assert.ok(Math.abs(r.grams.oil - 28.35) < 0.01);
  assert.ok(Math.abs(r.hydration - 84.5) < 0.1);
  assert.equal(parseRecipe('1000 g flour\n700 g water').hydration, 70);
});

test('four-flour blends add up to 100%', () => {
  const three = [{ name: 'A', pct: 50 }, { name: 'B', pct: 30 }, { name: 'C', pct: 20 }];
  const four = normalizeFlours(three, 4);
  assert.equal(four.length, 4);
  const b = rebalanceFlours(four, 4, 3, 10);
  assert.equal(b.slice(0, 4).reduce((a, f) => a + f.pct, 0), 100);
  assert.equal(b[3].pct, 10);
});
