// Collects every translatable message key the app can show. Used by tests/i18n.test.mjs
// and by `node tests/i18n-keys.mjs` to list keys missing from a locale.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEAVENERS, computeDough } from '../web/engine.js';
import { leopardReport, recommendHydration, LEOPARD_TECHNIQUE } from '../web/leopard.js';
import { recommendPlans, PLAN_RULES } from '../web/planner.js';
import { LIBRARY } from '../web/recipes.js';
import { GLOSSARY } from '../web/glossary.js';
import { STYLES, OVENS, BASE } from '../web/presets.js';
import { searchLinks } from '../web/importer.js';

const keys = new Map(); // key -> placeholder names
const add = m => {
  if (m == null || m === '') return;
  const k = typeof m === 'object' ? m.k : m;
  keys.set(k, [...k.matchAll(/\{(\w+)\}/g)].map(x => x[1]).sort());
};

// 1. Literal t('...') / t("...") calls in the UI code.
const src = readFileSync(fileURLToPath(new URL('../web/app.js', import.meta.url)), 'utf8');
for (const m of src.matchAll(/\bt[x]?\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) add(JSON.parse('"' + m[2].replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'));
// Row names and other keys passed as plain data in app.js
for (const k of ['Flour', 'Water', 'Salt', 'Fat', 'Sugar', 'Old dough', 'Poolish (all)', 'Biga (all)', 'Levain ({v}%)', 'Yeast · {type}',
  'Oil / fat', 'Fresh yeast', 'Active dry yeast', 'Instant dry yeast', 'Levain', 'Imported recipe', 'Room temp rise', 'Fat / oil',
  'Storage is full. The bake was saved without its photo.', 'That file is not an image this browser can read.', 'poolish', 'biga', 'none',
  'Flour 1', 'Flour 2', 'Flour 3']) add(k);

// 2. Data modules.
for (const st of Object.values(STYLES)) { ['name', 'piece', 'weight', 'rt1', 'rt2', 'fatLabel', 'about'].forEach(f => add(st[f])); st.traits.forEach(add); }
for (const o of Object.values(OVENS)) { add(o.name); add(o.hint); o.tips.forEach(([a, b]) => { add(a); add(b); }); }
for (const l of Object.values(LEAVENERS)) add(l.label);
for (const r of LIBRARY) { add(r.name); add(r.summary); add(r.source); r.method.forEach(add); (r.assumed || []).forEach(add); }
GLOSSARY.forEach(([a, b]) => { add(a); add(b); });
LEOPARD_TECHNIQUE.forEach(([a, b]) => { add(a); add(b); });
searchLinks('x', 'y').forEach(l => add(l.name));

// 3. Messages produced at runtime by the pure modules, over a grid of inputs.
const r0 = { ...BASE, sugar: 0, fat: 0, flours: [{ name: 'A', pct: 100 }] };
for (const contemporary of [false, true]) for (const cold of [false, true]) for (const hyd of [50, 62, 72, 90])
  for (const oven of [250, 350, 410, 450, 495, 520]) for (const hours of [4, 20, 30, 80, 100]) for (const flourW of [200, 260, 300, 360, 500])
    for (const extra of [{}, { sugar: 2, salt: 1.5, rtTemp: 12, bakeSeconds: 40, rt2Hours: 1 }, { fat: 3, salt: 4, rtTemp: 28, bakeSeconds: 200, rt2Hours: 10 }]) {
      const r = { ...r0, hydration: hyd, ovenTemp: oven, flourW, rt1Hours: hours, ctHours: cold ? hours : 0, rt2Hours: 4, ...extra };
      const rep = leopardReport(r, { contemporary, cold, rt2Counts: true, fats: true, sugar: true, preferment: cold ? 'biga' : null });
      add(rep.grade); rep.items.forEach(i => { add(i.label); add(i.value); add(i.advice); });
      recommendHydration({ contemporary, ovenTemp: oven, roomTemp: extra.rtTemp ?? 21, flourW, hours: hours * 2 }).reasons.forEach(add);
    }
for (const style of Object.keys(PLAN_RULES)) for (const hours of [1, 3, 5, 9, 15, 20, 30, 50, 100, 200])
  recommendPlans({ style, hours }).plans.forEach(p => { add(p.title); add(p.why); add(p.warning); });
const engineCases = [[{}, { poolish: true }], [{ poolishHours: 20 }, { poolish: true }], [{}, { biga: true }],
  [{ hydration: 40, bigaPct: 100, bigaHydration: 60 }, { biga: true }], [{ levainManual: true, levainPct: 300, yeastType: 'LSD' }, {}],
  [{ flours: [{ name: 'A', pct: 50 }, { name: 'B', pct: 20 }] }, { floursCount: 2 }]];
for (const [r, s] of engineCases) computeDough({ ...r0, ...r }, s).warnings.forEach(add);

export const KEYS = keys;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lang = process.argv[2];
  const dict = lang ? (await import(`../web/locales/${lang}.js`)).default : {};
  const missing = [...keys.keys()].filter(k => !(k in dict));
  console.log(JSON.stringify(missing, null, 1));
  console.error(`${keys.size} keys, ${missing.length} missing${lang ? ` in ${lang}` : ''}`);
}
