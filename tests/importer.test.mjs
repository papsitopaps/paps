import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe, searchLinks } from '../web/importer.js';
import { rebalanceFlours, normalizeFlours } from '../web/presets.js';

test('reads a focaccia biga recipe pasted from an Instagram comment', () => {
  const r = parseRecipe(`Biga / Pre-ferment
• 1 kg “00” flour W320+
• 600 g water
• 1 g dry yeast
• 10 g dry sourdough (optional – if not available, use 2 g yeast)
Mix by hand until combined. Rest 20 hours at 10C.
Final Dough
• 1 kg flour 0 W290
• 10 g dry yeast
• 1120 g water
• 75 g salt
• 80 g olive oil`);
  assert.equal(r.grams.flour, 2000);
  assert.equal(r.grams.water, 1720);
  assert.equal(r.grams.salt, 75);
  assert.equal(r.grams.oil, 80);
  assert.equal(r.grams.IDY, 11);
  assert.equal(r.yeastType, 'IDY');
  assert.equal(Math.round(r.hydration), 86);
  assert.ok(r.lines.some(l => l.kind === 'ignore'), 'dried sourdough is reported as not used');
});

test('reads Italian, Spanish, Greek and Japanese ingredient lists', () => {
  assert.deepEqual(parseRecipe('Farina 00 1000g\nAcqua 650 g\nSale 28g\nLievito di birra fresco 2 g').grams.CY, 2);
  const es = parseRecipe('500 g de harina\n350 ml de agua\n10 g de sal\n3 g de levadura seca');
  assert.equal(es.grams.water, 350); assert.equal(es.grams.IDY, 3);
  const el = parseRecipe('Αλεύρι 1000 γρ\nΝερό 700 γρ\nΑλάτι 25 γρ\nΠροζύμι 200 γρ');
  assert.equal(el.grams.levain, 200); assert.equal(el.yeastType, null);
  assert.ok(Math.abs(el.hydration - 800 / 1100 * 100) < 1e-9, 'levain flour and water count toward hydration');
  assert.equal(parseRecipe('強力粉 500g\n水 350g\n塩 10g\nドライイースト 3g').grams.IDY, 3);
});

test('text without gram weights is not a recipe', () => {
  assert.equal(parseRecipe('50% of the flour goes into a biga at 45% hydration').found, false);
});

test('search links cover the recipe sites', () => {
  const ids = searchLinks('detroit style pizza dough', 'detroitstylepizza').map(l => l.id);
  assert.deepEqual(ids, ['ooni', 'gozney', 'reddit', '50top', 'instagram', 'youtube']);
});

test('flour blend always adds up to 100%', () => {
  const sum = (f, n) => f.slice(0, n).reduce((a, x) => a + x.pct, 0);
  const base = [{ name: 'A', pct: 70 }, { name: 'B', pct: 30 }, { name: 'C', pct: 0 }];
  const two = rebalanceFlours(base, 2, 0, 80);
  assert.deepEqual(two.slice(0, 2).map(f => f.pct), [80, 20]);
  const three = rebalanceFlours([{ pct: 50 }, { pct: 30 }, { pct: 20 }], 3, 1, 50);
  assert.equal(sum(three, 3), 100);
  assert.deepEqual(three.map(f => f.pct), [35.5, 50, 14.5]); // others keep their 50:20 ratio
  const zeros = rebalanceFlours([{ pct: 100 }, { pct: 0 }, { pct: 0 }], 3, 0, 40);
  assert.deepEqual(zeros.map(f => f.pct), [40, 30, 30]);
  assert.equal(sum(rebalanceFlours(base, 2, 1, 150), 2), 100);
  assert.equal(sum(normalizeFlours([{ pct: 50 }, { pct: 30 }, { pct: 20 }], 2), 2), 100);
});

test('pizza and pan size recommendations', async () => {
  const { sizeFor, weightFor } = await import('../web/presets.js');
  assert.deepEqual(sizeFor('neapolitan', 250), { round: true, cm: 31, inch: 12 });
  assert.equal(sizeFor('contemporary', 285).cm, 32); // the shared recipe: 285 g opens to 31–33 cm
  assert.equal(weightFor('detroit', [25, 35]), 480);
  const pan = sizeFor('detroit', 480);
  assert.ok(Math.abs(pan.w * pan.l - 875) < 60, 'round trip back to about a 25 × 35 cm pan');
  assert.equal(sizeFor('bread', 900), null);
  for (const cm of [25, 30, 33]) assert.ok(Math.abs(sizeFor('neapolitan', weightFor('neapolitan', cm)).cm - cm) <= 1);
});
