// Impasto dough engine — pure functions, no DOM.
// Temperatures in °C. Percentages are baker's percentages (relative to total flour,
// including flour carried in by levain, pre-ferments and old dough).
// Every model and constant is explained in docs/formulas.md.

export const LEAVENERS = {
  CY:  { short: 'CY',  label: 'Fresh yeast',       factor: 1,     sourdough: false },
  ADY: { short: 'ADY', label: 'Active dry yeast',  factor: 0.4,   sourdough: false },
  IDY: { short: 'IDY', label: 'Instant dry yeast', factor: 1 / 3, sourdough: false },
  FSD: { short: 'FSD', label: 'Firm sourdough',    factor: 35,    sourdough: true, hydration: 50 },
  LSD: { short: 'LSD', label: 'Liquid sourdough',  factor: 40,    sourdough: true, hydration: 100 },
};

// Calibration constant for the fresh-yeast model: 60% water, 3% salt, 8 h at 20 °C
// with fresh yeast gives 0.497% of flour = 0.76 g in a 250 g ball.
export const K_YEAST = 6.6069e5;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hydrationTerm(h) {
  const H = clamp(h, 50, 100);
  return 4.2 * H - 80 - 0.0305 * H * H;
}

// Time spent cold, converted to equivalent hours at room temperature.
export function equivalentHours(hours, temp, roomTemp) {
  if (hours <= 0 || temp <= 0) return 0;
  return hours * Math.pow(temp / Math.max(roomTemp, 1), 2.5 / 1.2);
}

// Fresh-yeast (CY) percentage of flour for a fermentation of `hours` at `temp`.
export function freshYeastPct({ hydration, salt, fat = 0, hours, temp }) {
  const T = clamp(temp, 5, 40);
  const h = Math.max(hours, 1);
  const pct = (K_YEAST * (1 + salt / 200) * (1 + fat / 300)) /
    (hydrationTerm(hydration) * Math.pow(T, 2.5) * Math.pow(h, 1.2));
  return clamp(pct, 0.005, 5);
}

// Inverse of freshYeastPct: hours of RT fermentation a given CY % supports.
export function hoursForYeast({ hydration, salt, fat = 0, cyPct, temp }) {
  const T = clamp(temp, 5, 40);
  const x = (K_YEAST * (1 + salt / 200) * (1 + fat / 300)) / (hydrationTerm(hydration) * Math.pow(T, 2.5) * cyPct);
  return Math.pow(x, 1 / 1.2);
}

// Poolish yeast (% CY of poolish flour) for a poolish matured `hours` at ~18–20 °C.
export function poolishYeastPct(hours) {
  return clamp(1.5 * Math.pow(3 / Math.max(hours, 1), 1.95), 0.03, 3);
}

export function fermentationHours(r, s) {
  const cold = (s.ct || r.forceCold) ? equivalentHours(r.ctHours, r.ctTemp, r.rtTemp) : 0;
  return r.rt1Hours + (r.rt2Hours || 0) + cold;
}

/** Compute every ingredient for a recipe `r` under settings `s`. */
export function computeDough(r, s) {
  const warnings = [];
  const h = r.hydration / 100;
  const sl = r.salt / 100;
  const ft = (s.fats || r.forceFat) ? r.fat / 100 : 0;
  const sg = (s.sugar || r.forceSugar) ? (r.sugar || 0) / 100 : 0;
  const lv = LEAVENERS[r.yeastType] || LEAVENERS.CY;

  const hours = fermentationHours(r, s);
  const cyPct = freshYeastPct({ hydration: r.hydration, salt: r.salt, fat: ft * 100, hours, temp: r.rtTemp });
  const cy = cyPct / 100;

  const pieces = r.balls * r.ballWeight + (s.twoSizes ? r.balls2 * r.ballWeight2 : 0);
  const odOut = s.oldDoughOut ? r.oldDoughOut / 100 : 0;
  const dough = pieces * (1 + (s.wastage || 0) / 100) * (1 + odOut);

  // Pre-ferment (poolish wins if both are switched on).
  let pf = null;
  if (s.poolish && r.poolishPct > 0) pf = { kind: 'poolish', share: r.poolishPct / 100, hyd: 1, yeastCy: poolishYeastPct(r.poolishHours) / 100 };
  else if (s.biga && r.bigaPct > 0) pf = { kind: 'biga', share: r.bigaPct / 100, hyd: r.bigaHydration / 100 };
  const mainShare = pf ? 1 - pf.share : 1;
  const pfFactor = lv.sourdough ? 1 : lv.factor; // pre-ferments use commercial yeast (fresh if sourdough is selected)
  // Pre-ferment yeast as a fraction of its own flour, in the yeast type used for it.
  // Biga: set by the baker (default 1% fresh-yeast equivalent). Poolish: from its time.
  if (pf) pf.yeast = pf.kind === 'biga' ? (r.bigaYeastPct ?? pfFactor) / 100 : pf.yeastCy * pfFactor;

  // Levain as % of total flour: either derived from the yeast model or set by hand.
  let levainPct = 0, starterHyd = 0;
  if (lv.sourdough) {
    starterHyd = (r.starterHydration ?? lv.hydration) / 100;
    levainPct = r.levainManual ? r.levainPct / 100 : cy * lv.factor * mainShare;
  }
  // Commercial yeast in the main dough: from the model, or set by hand as % of total flour.
  const yeastManual = !lv.sourdough && r.yeastManual;
  const yeastFrac = lv.sourdough ? 0 : yeastManual ? r.yeastPct / 100 : cy * lv.factor * mainShare;
  const pfYeastFrac = pf ? pf.yeast * pf.share : 0;

  // Flour + water carried by levain are already part of h, so the levain adds no extra mass.
  const flourTotal = dough / (1 + h + sl + ft + sg + yeastFrac + pfYeastFrac);

  let levain = null;
  if (lv.sourdough) {
    const mass = levainPct * flourTotal;
    const lf = mass / (1 + starterHyd);
    levain = { mass, flour: lf, water: mass - lf, pct: levainPct * 100, hydration: starterHyd * 100 };
  }

  let od = null;
  if (s.oldDoughIn && r.oldDoughIn > 0) {
    const mass = (r.oldDoughIn / 100) * flourTotal;
    const f = mass / (1 + h + sl);
    od = { mass, flour: f, water: f * h, salt: f * sl };
  }

  let pre = null;
  if (pf) {
    const f = pf.share * flourTotal;
    pre = {
      kind: pf.kind, flour: f, water: f * pf.hyd, yeast: f * pf.yeast, yeastPct: pf.yeast * 100,
      yeastType: lv.sourdough ? 'CY' : r.yeastType,
      hours: pf.kind === 'poolish' ? r.poolishHours : (r.bigaHours ?? 16), temp: pf.kind === 'biga' ? (r.bigaTemp ?? 18) : null,
    };
    pre.total = pre.flour + pre.water + pre.yeast;
    if (pf.kind === 'poolish' && r.poolishHours > 12) warnings.push('Poolish over 12 h: use a strong flour (W > 300).');
    if (pf.kind === 'biga') warnings.push('Use a strong flour (about W 320 or more) for the biga.');
  }

  const flour = flourTotal - (pre?.flour || 0) - (levain?.flour || 0) - (od?.flour || 0);
  let water = h * flourTotal - (pre?.water || 0) - (levain?.water || 0) - (od?.water || 0);
  if (water < 0) { warnings.push('Levain or pre-ferment carries more water than the dough allows. Lower its share or raise hydration.'); water = 0; }
  if (flour < 0) warnings.push('Levain, pre-ferment and old dough hold more flour than the recipe.');
  const salt = sl * flourTotal - (od?.salt || 0);
  const fat = ft * flourTotal;
  const sugar = sg * flourTotal;
  const yeast = lv.sourdough ? 0 : yeastFrac * flourTotal;

  const blend = s.floursCount > 1 ? r.flours.slice(0, s.floursCount) : [{ name: 'Flour', pct: 100 }];
  const flours = blend.map(f => ({ name: f.name, pct: f.pct, grams: Math.max(flour, 0) * f.pct / 100 }));
  const pctSum = blend.reduce((a, f) => a + Number(f.pct), 0);
  if (Math.abs(pctSum - 100) > 0.01) warnings.push(`The flour blend adds up to ${pctSum}%, not 100%.`);

  // Hours of room-temperature fermentation that hand-set yeast supports.
  let yeastHours = null;
  if (yeastManual && r.yeastPct > 0) {
    yeastHours = hoursForYeast({ hydration: r.hydration, salt: r.salt, fat: ft * 100, cyPct: (r.yeastPct / lv.factor) / mainShare, temp: r.rtTemp });
  }

  // Sourdough: estimated hours the chosen levain supports (handy when set by hand).
  let levainHours = null;
  if (lv.sourdough && levainPct > 0) {
    levainHours = hoursForYeast({ hydration: r.hydration, salt: r.salt, fat: ft * 100, cyPct: (levainPct / lv.factor) * 100, temp: r.rtTemp });
  }

  return {
    dough, pieces, flourTotal, flour, flours, water, salt, fat, sugar, yeast,
    yeastType: r.yeastType, yeastPctCY: cyPct, hours,
    preferment: pre, levain, levainHours, yeastHours, yeastManual, oldDough: od,
    oldDoughOut: s.oldDoughOut ? dough - dough / (1 + odOut) : 0,
    warnings,
  };
}

// ---------- Tools ----------
export function convertYeast(grams, from, to) {
  return (grams / LEAVENERS[from].factor) * LEAVENERS[to].factor;
}

export function panDough({ shape, length, width, diameter, factor }) {
  const area = shape === 'round' ? Math.PI * (diameter / 2) ** 2 : length * width;
  return { area, grams: area * factor };
}

// Water temperature for a desired dough temperature (°C); `friction` = mixer heat.
export function waterTemp({ target, room, flour, friction, levainTemp = null }) {
  return levainTemp == null ? target * 3 - room - flour - friction : target * 4 - room - flour - friction - levainTemp;
}

// ---------- Sourdough ----------

// Levain build from a ratio starter:flour:water (e.g. 1:5:5) to reach `target` grams.
export function levainBuild({ target, ratio, starterHydration = 100, temp = 24 }) {
  const [a, b, c] = ratio;
  const parts = a + b + c;
  const starter = target * a / parts;
  const flour = target * b / parts;
  const water = target * c / parts;
  // Starter flour/water also count toward the levain's hydration.
  const sf = starter / (1 + starterHydration / 100);
  const hydration = ((water + (starter - sf)) / (flour + sf)) * 100;
  return { starter, flour, water, hydration, peakHours: starterPeakHours({ ratio, temp }) };
}

// Hours to peak: about 4 h for 1:1:1 at 24 °C, slower with dilution and with cold.
export function starterPeakHours({ ratio, temp }) {
  const [a, b, c] = ratio;
  const dilution = (a + b + c) / (3 * a);
  return 4 * Math.pow(dilution, 0.6) * Math.pow(2, (24 - temp) / 8);
}

// Change a starter's hydration by adding flour or water.
export function convertStarter({ mass, from, to }) {
  const flour = mass / (1 + from / 100);
  const water = mass - flour;
  const targetWater = flour * to / 100;
  if (targetWater >= water) return { addWater: targetWater - water, addFlour: 0, total: flour + targetWater };
  const targetFlour = water / (to / 100);
  return { addWater: 0, addFlour: targetFlour - flour, total: targetFlour + water };
}

// Bulk fermentation estimate: ~5 h with 20% levain at 24 °C dough temperature.
export function bulkHours({ levainPct, doughTemp }) {
  return 5 * Math.pow(20 / Math.max(levainPct, 1), 0.35) * Math.pow(2, (24 - doughTemp) / 8);
}

// Target rise in an aliquot jar at the end of bulk (warmer dough, less rise).
export function aliquotRise(doughTemp) {
  return clamp(Math.round(75 - (doughTemp - 21) * 9), 25, 100);
}

export const cToF = c => c * 9 / 5 + 32;
export const fToC = f => (f - 32) * 5 / 9;
