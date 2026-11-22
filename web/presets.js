// Styles, ovens and defaults. All user-facing strings here are English message keys,
// translated at render time with t() (see i18n.js).

export const BASE = {
  balls: 1, ballWeight: 250, balls2: 1, ballWeight2: 300,
  hydration: 60, salt: 3, fat: 3, sugar: 1,
  rt1Hours: 8, rt2Hours: 0, ctHours: 24, ctTemp: 4, rtTemp: 20,
  yeastType: 'CY', starterHydration: 100, levainManual: false, levainPct: 20,
  flours: [{ name: 'Flour 1', pct: 100 }, { name: 'Flour 2', pct: 0 }, { name: 'Flour 3', pct: 0 }],
  bigaPct: 50, bigaHydration: 45, bigaYeastPct: null, bigaHours: 18, bigaTemp: 18, poolishPct: 30, poolishHours: 12,
  yeastManual: false, yeastPct: 0.3, method: null, source: null, recipeName: null, templateId: null,
  oldDoughIn: 10, oldDoughOut: 10,
  ovenTemp: 450, bakeSeconds: 80, flourW: 280,
  rt2Temp: null, ddt: 23,
};

export const STYLES = {
  neapolitan: {
    size: { round: true, factor: 0.34, choices: [25, 28, 30, 33, 35] },
    about: 'Soft, thin pizza from Naples with a puffy, airy rim (cornicione), baked in 60–90 seconds in a very hot oven.',
    traits: ["Water 58–65%", "Salt 2.5–3%", "Type 00 flour, W 250–300", "Stone 430–485 °C, 60–90 s", "No oil or sugar"],
    name: 'Neapolitan', piece: 'Dough balls', weight: 'Ball weight', rt1: 'RT leavening', rt2: 'Balls at RT after fridge',
    rt2OnlyWithCold: true, pizza: true, range: [55, 70], search: 'neapolitan pizza dough', tag: 'pizzanapoletana',
    defaults: { ddt: 23, rt2Hours: 4, ovenTemp: 450, bakeSeconds: 75, flourW: 260 },
  },
  contemporary: {
    size: { round: true, factor: 0.36, choices: [28, 30, 32, 34] },
    about: 'A modern Neapolitan with a tall, open, very light rim (canotto). More water and a longer, mostly cold fermentation, often with a biga or poolish.',
    traits: ["Water 68–78%", "Cold ferment 24–72 h", "Biga or poolish often used", "Flour W 300–340", "Stone 420–460 °C, 70–100 s"],
    name: 'Contemporary', piece: 'Dough balls', weight: 'Ball weight', rt1: 'Bulk at RT', rt2: 'Balls at RT',
    pizza: true, contemporary: true, forceCold: true, range: [65, 78], search: 'contemporary neapolitan pizza dough', tag: 'pizzacontemporanea',
    defaults: { ddt: 20, ballWeight: 270, hydration: 70, salt: 2.8, rt1Hours: 2, ctHours: 24, rt2Hours: 4, rtTemp: 21, ovenTemp: 440, bakeSeconds: 85, flourW: 300 },
  },
  detroit: {
    size: { factor: 0.55, choices: [[20, 25], [25, 35], [30, 40]] },
    about: 'A thick, rectangular pan pizza from Detroit with an airy crumb, cheese baked right to the edges into a crisp caramelised crust, and the sauce on top.',
    traits: ["Water 68–75%", "Oiled steel pan, 25 × 35 cm", "Cheese to the edges (frico)", "Home oven 250–290 °C, 12–15 min"],
    name: 'Detroit', piece: 'Pans', weight: 'Dough per pan', rt1: 'Bulk (RT)', rt2: 'Proof in pan',
    range: [65, 78], search: 'detroit style pizza dough', tag: 'detroitstylepizza',
    defaults: { ddt: 24, ballWeight: 520, hydration: 70, salt: 2.2, fat: 2, rt1Hours: 2, ctHours: 24, rt2Hours: 2.5, rtTemp: 22, yeastType: 'IDY' },
  },
  roman: {
    size: { factor: 0.6, choices: [[30, 40], [35, 45], [40, 60]] },
    about: 'Pizza in teglia: a very wet dough with a long cold rise, baked in an oiled rectangular pan for a crisp base and a light, honeycombed crumb. Sold by the slice in Rome.',
    traits: ["Water 75–90%", "Cold rise 24–72 h", "Strong flour, W 300+", "Oiled pan", "250–300 °C, 15–20 min"],
    name: 'Roman pan', piece: 'Pans', weight: 'Dough per pan', rt1: 'RT before fridge', rt2: 'RT after fridge',
    range: [70, 90], forceFat: true, forceCold: true, fatLabel: 'Oil', search: 'pizza in teglia roman pan pizza dough', tag: 'pizzainteglia',
    defaults: { ddt: 21, ballWeight: 600, hydration: 80, salt: 2.5, fat: 3, rt1Hours: 2, ctHours: 48, rt2Hours: 3, yeastType: 'IDY' },
  },
  focaccia: {
    size: { factor: 0.65, choices: [[20, 30], [25, 35], [30, 40]] },
    about: 'Oiled, dimpled flatbread from Liguria, with a crisp, golden base and a soft, open crumb.',
    traits: ["Water 70–85%", "Olive oil in and on the dough", "Proofed in the tray", "220–250 °C, 20–30 min"],
    name: 'Focaccia', piece: 'Trays', weight: 'Dough per tray', rt1: 'Bulk (RT)', rt2: 'Proof in tray',
    range: [65, 85], forceFat: true, fatLabel: 'Olive oil', search: 'focaccia recipe', tag: 'focaccia',
    defaults: { ddt: 24, ballWeight: 800, hydration: 75, salt: 2.5, fat: 5, rt1Hours: 3, rt2Hours: 2, ctHours: 18, yeastType: 'IDY' },
  },
  baguette: {
    about: 'Long, thin French bread with a crackling crust and an open, creamy crumb. A poolish adds flavour.',
    traits: ["Water 65–75%", "Salt about 2%", "Poolish for flavour", "240–250 °C with steam, 20–25 min"],
    name: 'Baguette', piece: 'Baguettes', weight: 'Weight each', rt1: 'Bulk (RT)', rt2: 'Final proof',
    range: [65, 78], search: 'baguette poolish recipe', tag: 'baguette',
    defaults: { ddt: 24, balls: 3, ballWeight: 350, hydration: 70, salt: 2, rt1Hours: 3, rt2Hours: 1, rtTemp: 22, yeastType: 'CY', poolishPct: 40, poolishHours: 12 },
  },
  bread: {
    about: 'A naturally leavened loaf made with a sourdough starter: deep flavour, a chewy crust and an open crumb.',
    traits: ["Water 70–85%", "Levain 10–25% of the flour", "Bulk 4–6 h, cold retard overnight", "Dutch oven 240–250 °C, 40–45 min"],
    name: 'Sourdough loaf', piece: 'Loaves', weight: 'Weight each', rt1: 'Bulk (RT)', rt2: 'Final proof',
    range: [65, 90], forceCold: true, search: 'sourdough bread recipe', tag: 'sourdoughbread',
    defaults: { ddt: 25, ballWeight: 900, hydration: 75, salt: 2, rt1Hours: 5, rt2Hours: 1, ctHours: 14, rtTemp: 24, yeastType: 'LSD', starterHydration: 100 },
  },
};

// Pizza ovens. Temperatures are the stone (floor) temperature measured with an IR thermometer.
export const OVENS = {
  gas: {
    name: 'Gas pizza oven (up to 500 °C)', hint: 'For example an Ooni Koda or a Gozney Roccbox or Dome.', max: 500,
    presets: { neapolitan: { ovenTemp: 450, bakeSeconds: 75 }, contemporary: { ovenTemp: 440, bakeSeconds: 85 } },
    tips: [
      ['Preheat', 'Run the burner on full for 25–30 min. Check the centre of the stone with an IR thermometer and launch at about 430–460 °C. These ovens can reach 500 °C, but above about 470 °C the base burns before the rim sets.'],
      ['Turning', 'The flame comes from one side or the back, so the rim nearest it spots first. Give the pizza a quarter turn every 15–20 s with a small turning peel.'],
      ['Flame for leoparding', 'Keep the flame high for the whole bake. In 60–90 s the rim puffs and spots before the base burns.', ['neapolitan']],
      ['Flame for leoparding', 'Keep the flame high for the first 30–40 s so the rim puffs and spots, then turn it to medium for the last 20–30 s so the thick rim bakes through without burning the spots.', ['contemporary']],
      ['Between pizzas', 'Give the stone 1–2 min with the flame on high to recover to launch temperature, and re-check it with the IR thermometer.'],
    ],
  },
  wood: {
    name: 'Wood or pellet pizza oven (up to 500 °C)', max: 520,
    presets: { neapolitan: { ovenTemp: 470, bakeSeconds: 70 }, contemporary: { ovenTemp: 450, bakeSeconds: 80 } },
    tips: [['Fire', 'Keep a live flame rolling over the dome. Launch on a floor at about 430–450 °C, then dome the pizza for a few seconds to set the spots.']],
  },
  electric: {
    name: 'Electric pizza oven (up to 400–450 °C)', max: 460,
    presets: { neapolitan: { ovenTemp: 400, bakeSeconds: 100 }, contemporary: { ovenTemp: 400, bakeSeconds: 110 } },
    tips: [['Top element', 'Set the top element to maximum and the stone a little lower. The top heat does the leoparding.']],
  },
  home: {
    name: 'Home oven with steel or stone (up to 300 °C)', max: 320,
    presets: { neapolitan: { ovenTemp: 290, bakeSeconds: 300 }, contemporary: { ovenTemp: 290, bakeSeconds: 330 } },
    tips: [['Steel and grill', 'Preheat a baking steel on the top rack for 45 min, then finish under the grill (broiler) for the last minute to get some spotting.']],
  },
};

export const DEFAULT_SETTINGS = {
  twoSizes: false, floursCount: 1, fats: false, sugar: false, ct: false,
  oldDoughIn: false, oldDoughOut: false, biga: false, poolish: false,
  wastage: 0, keepAwake: false, unit: 'C', theme: 'auto', oven: 'gas', lang: null, mixer: 'hand',
};

/**
 * Set flour i of an n-flour blend to `value` % and rebalance the others so the blend
 * always adds up to 100%. The others keep their proportions to each other; if they are
 * all zero, the remainder is shared equally. Values are rounded to 0.5%.
 */
export function rebalanceFlours(flours, n, i, value) {
  const half = v => Math.round(v * 2) / 2;
  const out = flours.map(f => ({ ...f }));
  if (n <= 1) { out[0].pct = 100; return out; }
  const v = half(Math.min(100, Math.max(0, value)));
  const others = [...Array(n).keys()].filter(j => j !== i);
  const rest = 100 - v;
  const sum = others.reduce((a, j) => a + (Number(out[j].pct) || 0), 0);
  others.forEach(j => { out[j].pct = half(sum > 0 ? rest * (Number(out[j].pct) || 0) / sum : rest / others.length); });
  out[i].pct = v;
  // Put any rounding difference on the last of the other flours.
  const diff = 100 - out.slice(0, n).reduce((a, f) => a + f.pct, 0);
  out[others[others.length - 1]].pct = half(out[others[others.length - 1]].pct + diff);
  return out;
}

/** Make an n-flour blend add up to 100% (used when the number of flours changes). */
export function normalizeFlours(flours, n) {
  const sum = flours.slice(0, n).reduce((a, f) => a + (Number(f.pct) || 0), 0);
  if (Math.abs(sum - 100) < 0.01) return flours.map(f => ({ ...f }));
  return rebalanceFlours(flours, n, 0, n === 1 ? 100 : Math.min(100, Number(flours[0].pct) || 100));
}

// ---------- Pizza and pan size ----------
// `factor` is dough per area (g/cm²), including the rim: about 0.34 for a classic Neapolitan
// (250 g → 31 cm), 0.36 for contemporary (285 g → 32 cm), 0.55–0.65 for pan styles.
export const CM_PER_IN = 2.54;
const inch = cm => Math.round(cm / CM_PER_IN * 2) / 2;

/** Size a piece of dough makes: { round, cm, inch } for round pizzas, or a 3:4 pan { w, l, wi, li, area }. */
export function sizeFor(style, grams) {
  const sz = STYLES[style]?.size; if (!sz || !(grams > 0)) return null;
  const area = grams / sz.factor;
  if (sz.round) { const cm = 2 * Math.sqrt(area / Math.PI); return { round: true, cm: Math.round(cm), inch: inch(cm) }; }
  const w = Math.sqrt(area * 3 / 4), l = Math.sqrt(area * 4 / 3);
  return { round: false, area: Math.round(area), w: Math.round(w), l: Math.round(l), wi: inch(w), li: inch(l) };
}

/** Dough weight (g, rounded to 5) for a round pizza of `cm` across, or a pan of [w, l] cm. */
export function weightFor(style, size) {
  const sz = STYLES[style]?.size; if (!sz) return null;
  const area = Array.isArray(size) ? size[0] * size[1] : Math.PI * (size / 2) ** 2;
  return Math.round(area * sz.factor / 5) * 5;
}
export const inchesOf = inch;
