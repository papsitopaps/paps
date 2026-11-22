// Weight and volume units. Recipes are always stored in grams; this only changes how they are shown.
// Pure functions, no DOM.

export const G_PER_OZ = 28.349523125;
export const ML_PER_CUP = 236.588; // US cup
export const TSP_PER_CUP = 48, TBSP_PER_CUP = 16;

/**
 * Grams in one US cup, per ingredient (spooned and levelled flour, fine table salt).
 * Cups are approximate: flour can vary by 20% depending on how the cup is filled.
 * Fresh yeast, old dough and pre-ferments have no reliable volume, so they stay in weight.
 */
export const G_PER_CUP = {
  flour: 120, wholemeal: 113, rye: 102, semola: 163,
  water: 236.6, salt: 288, IDY: 149, ADY: 149, oil: 216, butter: 227, sugar: 200, levain: 227,
};

export const toOz = g => g / G_PER_OZ;
export const fromOz = oz => oz * G_PER_OZ;

/** Ounces, rounded to suit the amount. */
export function ozText(g) {
  const oz = toOz(g);
  const d = oz >= 10 ? 1 : oz >= 1 ? 2 : oz >= 0.1 ? 2 : 3;
  return { n: Math.round(oz * 10 ** d) / 10 ** d, d };
}

const FRAC = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];

/** A number as a whole part and a kitchen fraction, e.g. 2.3 → "2 ¼" (only the fractions in `allowed`). */
export function fraction(v, allowed = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1]) {
  let whole = Math.floor(v);
  const rest = v - whole;
  const [f] = allowed.map(a => [a, Math.abs(a - rest)]).sort((a, b) => a[1] - b[1])[0];
  if (f === 1) { whole += 1; return String(whole); }
  const sym = FRAC.find(([x]) => Math.abs(x - f) < 1e-9)[1];
  return whole ? (sym ? `${whole} ${sym}` : String(whole)) : (sym || '0');
}

const fractionValue = v => {
  const allowed = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
  const w = Math.floor(v); return w + allowed.reduce((a, x) => Math.abs(x - (v - w)) < Math.abs(a - (v - w)) ? x : a, 0);
};

/**
 * Volume for `g` grams of an ingredient kind: { n, unit: 'cup' | 'tbsp' | 'tsp', plural }.
 * Cups from ¼ cup up, tablespoons from 1 tbsp, else teaspoons (to the nearest ⅛).
 * Returns null when the ingredient has no volume.
 */
export function volume(g, kind) {
  const per = G_PER_CUP[kind];
  if (!per || !(g > 0)) return null;
  const cups = g / per;
  if (cups >= 0.245) {
    // Round down to a measuring cup, then make up the rest with tablespoons.
    const sizes = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
    const whole = Math.floor(cups + 1e-9);
    const part = sizes.filter(x => x <= cups - whole + 1e-9).pop();
    let base = whole + part;
    let tb = Math.round((cups - base) * TBSP_PER_CUP * 2) / 2;
    if (tb >= 3.5) { base = fractionValue(cups); tb = 0; } // close to the next cup size: just round
    const out = { n: fraction(base, [0, ...sizes.slice(1), 1]), unit: 'cup', plural: base > 1.12 };
    if (tb >= 1) out.extra = { n: fraction(tb, [0, 1 / 2, 1]), unit: 'tbsp' };
    return out;
  }
  const tbsp = cups * TBSP_PER_CUP;
  if (tbsp >= 1) return { n: fraction(tbsp, [0, 1 / 2, 1]), unit: 'tbsp' };
  const tsp = cups * TSP_PER_CUP;
  if (tsp < 1 / 16) return { n: '<⅛', unit: 'tsp' };
  return { n: fraction(tsp, [0, 1 / 8, 1 / 4, 1 / 2, 3 / 4, 1]), unit: 'tsp' };
}

/** Which volume kind an ingredient row uses (flour id helps: rye and wholemeal are lighter). */
export function kindFor(name, flourId) {
  if (name === 'Water') return 'water';
  if (name === 'Salt') return 'salt';
  if (name === 'Sugar') return 'sugar';
  if (name === 'Oil' || name === 'Olive oil' || name === 'Fat' || name === 'Fat / oil') return 'oil';
  if (name === 'Butter') return 'butter';
  if (name === 'Flour' || flourId !== undefined) {
    if (flourId === 'g-rye') return 'rye';
    if (flourId === 'g-ww') return 'wholemeal';
    if (flourId === 'g-semola') return 'semola';
    return 'flour';
  }
  return null;
}
