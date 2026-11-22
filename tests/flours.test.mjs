import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOURS, STYLE_FLOUR, flourById, strengthOf, blendInfo, newStarter, feedStarter, peakOf, starterStatus } from '../web/flours.js';
import { STYLES } from '../web/presets.js';

test('flour database is well formed and every style has a default flour', () => {
  const ids = new Set();
  for (const f of FLOURS) {
    assert.ok(!ids.has(f.id), `duplicate ${f.id}`); ids.add(f.id);
    assert.ok(f.protein[0] <= f.protein[1] && f.protein[0] > 5 && f.protein[1] < 16, f.id);
    assert.ok(f.water[0] < f.water[1] && f.water[0] >= 50 && f.water[1] <= 95, f.id);
    if (f.W) assert.ok(f.W[0] <= f.W[1] && f.W[0] >= 150 && f.W[1] <= 420, f.id);
  }
  for (const k of Object.keys(STYLES)) assert.ok(flourById(STYLE_FLOUR[k]), `default flour for ${k}`);
});

test('strength uses published W, or estimates it from protein', () => {
  assert.deepEqual(strengthOf(flourById('b-caputo-pizzeria')), { W: 265, estimated: false });
  const bread = strengthOf(flourById('g-bread'));
  assert.ok(bread.estimated && bread.W >= 270 && bread.W <= 300, `bread ≈ W ${bread.W}`);
});

test('blend strength and water are weighted by percentage', () => {
  const pizzeria = flourById('b-caputo-pizzeria'), cuoco = flourById('b-caputo-cuoco');
  const b = blendInfo([{ flour: pizzeria, pct: 50 }, { flour: cuoco, pct: 50 }]);
  assert.equal(b.W, 290); // (265 + 310) / 2 = 287.5 → nearest 10
  assert.deepEqual(b.water, [60, 69]);
  assert.equal(blendInfo([{ flour: null, pct: 100 }]), null);
  assert.equal(flourById('my-1', [{ id: 'my-1', name: 'Mine', protein: [13, 13], W: null, water: [60, 70] }]).name, 'Mine');
});

test('starter status follows its feedings', () => {
  const t0 = Date.UTC(2026, 10, 22, 8);
  let st = newStarter({ id: 's', name: 'Rye', ratio: [1, 1, 1] });
  assert.equal(starterStatus(st, t0).state, 'unfed');
  st = feedStarter(st, { at: t0, temp: 24 });
  const peak = peakOf(st.feedings[0]);
  assert.equal((peak - t0) / 3600e3, 4); // 1:1:1 at 24 °C peaks in about 4 h
  assert.equal(starterStatus(st, t0 + 1 * 3600e3).state, 'rising');
  assert.equal(starterStatus(st, peak).state, 'peak');
  assert.equal(starterStatus(st, peak + 4 * 3600e3).state, 'past');
  assert.equal(starterStatus(st, peak + 12 * 3600e3).state, 'hungry');
  for (let i = 0; i < 70; i++) st = feedStarter(st, { at: t0 + i });
  assert.equal(st.feedings.length, 60);
});
