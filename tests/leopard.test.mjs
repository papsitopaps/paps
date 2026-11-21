import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leopardReport, recommendHydration, flourStrengthFor } from '../web/leopard.js';

const contemporary = {
  hydration: 70, salt: 2.8, sugar: 0, fat: 0, rt1Hours: 2, ctHours: 24, rt2Hours: 4, rtTemp: 21,
  ovenTemp: 450, bakeSeconds: 80, flourW: 300,
};
const ctx = { contemporary: true, cold: true, rt2Counts: true, fats: false, sugar: false, preferment: 'poolish' };

test('AVPN-style wood oven recommends classic hydration', () => {
  const r = recommendHydration({ ovenTemp: 485, roomTemp: 21, flourW: 300, hours: 24 });
  assert.equal(r.target, 60);
  assert.ok(r.min >= 56 && r.max <= 64);
});

test('cooler ovens and contemporary style call for more water', () => {
  const wood = recommendHydration({ ovenTemp: 480 }).target;
  const electric = recommendHydration({ ovenTemp: 420 }).target;
  const home = recommendHydration({ ovenTemp: 280 }).target;
  assert.ok(wood < electric && electric < home);
  for (const ovenTemp of [480, 420, 350, 280]) {
    const c = recommendHydration({ contemporary: true, ovenTemp });
    assert.ok(c.target >= recommendHydration({ ovenTemp }).target + 7, `contemporary wetter at ${ovenTemp} °C`);
    assert.ok(c.reasons.every(r => !String(r.k || r).includes('AVPN')), 'contemporary advice does not quote the classic AVPN range');
  }
  assert.equal(recommendHydration({ contemporary: true, ovenTemp: 480 }).target, 70);
});

test('warm kitchen and weak flour lower the recommendation', () => {
  const base = recommendHydration({ ovenTemp: 450, roomTemp: 21, flourW: 300 }).target;
  assert.ok(recommendHydration({ ovenTemp: 450, roomTemp: 28, flourW: 300 }).target < base);
  assert.ok(recommendHydration({ ovenTemp: 450, roomTemp: 21, flourW: 220 }).target < base);
});

test('well set-up contemporary dough scores leopard-ready', () => {
  const rep = leopardReport(contemporary, ctx);
  assert.ok(rep.score >= 85, `score ${rep.score}`);
  assert.equal(rep.fixes.length, 0);
});

test('cold oven, sugar and a short ferment are flagged, worst first', () => {
  const rep = leopardReport({ ...contemporary, ovenTemp: 300, sugar: 2, rt1Hours: 4, ctHours: 0, rt2Hours: 0 },
    { ...ctx, cold: false, sugar: true, preferment: null });
  assert.ok(rep.score < 50, `score ${rep.score}`);
  assert.equal(rep.fixes[0].id, 'oven');
  for (const id of ['oven', 'sugarfat', 'time']) assert.ok(rep.fixes.some(f => f.id === id), id);
});

test('cold balls straight from the fridge are flagged', () => {
  const rep = leopardReport({ ...contemporary, rt2Hours: 1 }, ctx);
  assert.equal(rep.items.find(i => i.id === 'temper').status, 'bad');
});

test('flour strength target grows with fermentation time', () => {
  assert.ok(flourStrengthFor(48) > flourStrengthFor(24));
  const weak = leopardReport({ ...contemporary, flourW: 220, ctHours: 60 }, ctx);
  assert.equal(weak.items.find(i => i.id === 'flour').status, 'bad');
});

test('a long room-temperature-only ferment is not rated as good as a cold one', () => {
  const warm = leopardReport({ ...contemporary, rt1Hours: 21, ctHours: 0, rt2Hours: 3 }, { ...ctx, cold: false });
  assert.equal(warm.items.find(i => i.id === 'time').status, 'ok');
  assert.ok(warm.score < leopardReport(contemporary, ctx).score);
});

test('technique tips are specific to the style', async () => {
  const { techniqueFor } = await import('../web/leopard.js');
  const nea = techniqueFor('neapolitan').map(([, b]) => b).join(' ');
  const con = techniqueFor('contemporary').map(([, b]) => b).join(' ');
  assert.ok(!/contemporary|canotto/i.test(nea), 'Neapolitan tips do not mention the contemporary style');
  assert.ok(/canotto/i.test(con));
  assert.equal(techniqueFor('contemporary').filter(([a]) => a === 'Opening the ball').length, 1);
});
