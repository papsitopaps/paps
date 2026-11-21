import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDough, freshYeastPct, hoursForYeast, equivalentHours, convertYeast,
  levainBuild, convertStarter, starterPeakHours, bulkHours, panDough, waterTemp,
} from '../web/engine.js';

const base = {
  balls: 1, ballWeight: 250, balls2: 0, ballWeight2: 0, hydration: 60, salt: 3, fat: 0, sugar: 0,
  rt1Hours: 8, rt2Hours: 0, ctHours: 0, ctTemp: 4, rtTemp: 20, yeastType: 'CY',
  starterHydration: 100, levainManual: false, levainPct: 20,
  flours: [{ name: 'A', pct: 100 }], bigaPct: 50, bigaHydration: 45, poolishPct: 30, poolishHours: 12,
  oldDoughIn: 10, oldDoughOut: 10,
};
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const sumParts = o => o.flour + o.water + o.salt + o.fat + o.sugar + o.yeast +
  (o.levain?.mass || 0) + (o.preferment?.total || 0) + (o.oldDough?.mass || 0);

test('reproduces the PizzApp+ reference screenshot (250 g, 60%, 3%, 8 h @ 20 °C, CY)', () => {
  const o = computeDough(base, {});
  assert.equal(Math.round(o.flour), 153);
  assert.equal(Math.round(o.water), 92);
  assert.equal(o.salt.toFixed(1), '4.6');
  assert.equal(o.yeast.toFixed(2), '0.76');
});

test('ingredients always add up to the dough weight', () => {
  const cases = [
    [{}, {}],
    [{ yeastType: 'LSD' }, {}],
    [{ yeastType: 'FSD', starterHydration: 60 }, {}],
    [{ yeastType: 'IDY', fat: 4 }, { fats: true, poolish: true }],
    [{}, { biga: true }],
    [{}, { oldDoughIn: true }],
    [{ yeastType: 'LSD', levainManual: true, levainPct: 15 }, { oldDoughIn: true, wastage: 3 }],
  ];
  for (const [r, s] of cases) {
    const o = computeDough({ ...base, ...r }, s);
    near(sumParts(o), o.dough, 1e-6, JSON.stringify({ r, s }));
  }
});

test('more time, more warmth or more salt changes yeast the right way', () => {
  const y = p => freshYeastPct({ hydration: 60, salt: 3, hours: 8, temp: 20, ...p });
  assert.ok(y({ hours: 24 }) < y({}));
  assert.ok(y({ temp: 26 }) < y({}));
  assert.ok(y({ salt: 3.5 }) > y({}));
});

test('hoursForYeast inverts freshYeastPct', () => {
  const pct = freshYeastPct({ hydration: 65, salt: 2.5, hours: 10, temp: 22 });
  near(hoursForYeast({ hydration: 65, salt: 2.5, cyPct: pct, temp: 22 }), 10, 1e-6, 'hours');
});

test('cold hours count for much less than room hours', () => {
  const eq = equivalentHours(24, 4, 20);
  assert.ok(eq > 0.5 && eq < 2, `24 h at 4 °C ≈ ${eq} h at 20 °C`);
});

test('sourdough water and flour are counted in hydration', () => {
  const o = computeDough({ ...base, yeastType: 'LSD', levainManual: true, levainPct: 20 }, {});
  near(o.flour + o.levain.flour, o.flourTotal, 1e-9, 'flour');
  near((o.water + o.levain.water) / o.flourTotal, 0.6, 1e-9, 'hydration');
  near(o.levain.mass / o.flourTotal, 0.2, 1e-9, 'levain %');
  assert.equal(o.yeast, 0);
});

test('two sizes, wastage and old dough out scale the batch', () => {
  const o = computeDough({ ...base, balls: 4, balls2: 2, ballWeight2: 300 }, { twoSizes: true, wastage: 5, oldDoughOut: true });
  near(o.dough, (4 * 250 + 2 * 300) * 1.05 * 1.1, 1e-9, 'dough');
});

test('flour blend splits main flour', () => {
  const o = computeDough({ ...base, flours: [{ name: 'A', pct: 70 }, { name: 'B', pct: 30 }] }, { floursCount: 2 });
  near(o.flours[0].grams + o.flours[1].grams, o.flour, 1e-9, 'blend');
  assert.equal(o.warnings.filter(w => w.includes('blend')).length, 0);
});

test('tools', () => {
  near(convertYeast(10, 'CY', 'IDY'), 3.333, 0.01, 'CY→IDY');
  near(convertYeast(4, 'ADY', 'CY'), 10, 1e-9, 'ADY→CY');
  const lb = levainBuild({ target: 100, ratio: [1, 2, 2], starterHydration: 100 });
  near(lb.starter + lb.flour + lb.water, 100, 1e-9, 'levain build');
  near(lb.hydration, 100, 1e-9, 'levain hydration');
  near(starterPeakHours({ ratio: [1, 1, 1], temp: 24 }), 4, 1e-9, 'peak');
  assert.ok(starterPeakHours({ ratio: [1, 5, 5], temp: 24 }) > starterPeakHours({ ratio: [1, 2, 2], temp: 24 }));
  const sc = convertStarter({ mass: 100, from: 100, to: 50 });
  near(sc.addFlour, 50, 1e-9, 'stiffen starter');
  near(bulkHours({ levainPct: 20, doughTemp: 24 }), 5, 1e-9, 'bulk');
  near(panDough({ shape: 'rect', length: 40, width: 30, factor: 0.55 }).grams, 660, 1e-9, 'pan');
  near(waterTemp({ target: 24, room: 22, flour: 22, friction: 1 }), 27, 1e-9, 'water temp');
});
