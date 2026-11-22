// Flour database and starter profiles. Pure functions, no DOM.
// Generic types use typical ranges; brand figures are the makers' published specs.
// Batches vary, so the app always says to check the bag.
import { starterPeakHours } from './engine.js';

// protein: % range, W: alveograph strength range (null when not published), water: typical hydration % range
export const FLOURS = [
  { id: 'g-00', group: 'Common types', name: '00 pizza flour', protein: [11.5, 12.5], W: [240, 280], water: [58, 65] },
  { id: 'g-00s', group: 'Common types', name: '00 strong flour (long fermentation)', protein: [12.5, 13.5], W: [300, 340], water: [62, 75] },
  { id: 'g-0', group: 'Common types', name: 'Type 0 flour', protein: [12, 13], W: [260, 320], water: [60, 72] },
  { id: 'g-1', group: 'Common types', name: 'Type 1 flour (partly wholemeal)', protein: [12, 13.5], W: [260, 300], water: [65, 76] },
  { id: 'g-manitoba', group: 'Common types', name: 'Manitoba (very strong)', protein: [13.5, 15], W: [350, 400], water: [65, 80] },
  { id: 'g-bread', group: 'Common types', name: 'Bread flour', protein: [12, 14], W: null, water: [65, 80] },
  { id: 'g-t65', group: 'Common types', name: 'French T65 flour', protein: [11, 12], W: null, water: [65, 75] },
  { id: 'g-ap', group: 'Common types', name: 'All-purpose flour', protein: [10, 11.7], W: null, water: [60, 68] },
  { id: 'g-ww', group: 'Common types', name: 'Wholemeal (whole wheat) flour', protein: [13, 14], W: null, water: [75, 90] },
  { id: 'g-semola', group: 'Common types', name: 'Semola rimacinata (durum wheat)', protein: [11, 13], W: null, water: [60, 70] },
  { id: 'g-rye', group: 'Common types', name: 'Rye flour', protein: [8, 11], W: null, water: [75, 90] },
  { id: 'b-caputo-pizzeria', group: 'Brands', name: 'Caputo Pizzeria (00, blue)', protein: [12.5, 12.5], W: [260, 270], water: [58, 65] },
  { id: 'b-caputo-cuoco', group: 'Brands', name: 'Caputo Saccorosso / Cuoco (00, red)', protein: [13, 13], W: [300, 320], water: [62, 72] },
  { id: 'b-caputo-nuvola', group: 'Brands', name: 'Caputo Nuvola (0)', protein: [12.5, 12.5], W: [260, 290], water: [62, 75] },
  { id: 'b-caputo-nuvola-super', group: 'Brands', name: 'Caputo Nuvola Super (0)', protein: [13.5, 13.5], W: [320, 340], water: [65, 78] },
  { id: 'b-caputo-manitoba', group: 'Brands', name: 'Caputo Manitoba Oro (0)', protein: [14, 14], W: [360, 380], water: [65, 80] },
  { id: 'b-pasini-verde', group: 'Brands', name: 'Molino Pasini Linea Pizzeria Verde (00)', protein: [11.5, 11.5], W: [280, 310], water: [58, 68] },
  { id: 'b-5s-napoletana', group: 'Brands', name: 'Le 5 Stagioni Pizza Napoletana (00)', protein: [13, 13], W: [310, 310], water: [60, 70] },
  { id: 'b-5s-superiore', group: 'Brands', name: 'Le 5 Stagioni Superiore (00, blue)', protein: [13, 13], W: [330, 330], water: [62, 75] },
  { id: 'b-5s-oro', group: 'Brands', name: 'Le 5 Stagioni Oro (00)', protein: [14, 14], W: [390, 390], water: [65, 80] },
  { id: 'b-dg-rossa', group: 'Brands', name: 'Dallagiovanna Rossa (00)', protein: [14, 14], W: [390, 390], water: [65, 80] },
  { id: 'b-dg-uniqua-blu', group: 'Brands', name: 'Dallagiovanna Uniqua Blu (1)', protein: [14, 14], W: [390, 390], water: [68, 82] },
  { id: 'b-dg-universal', group: 'Brands', name: 'Dallagiovanna Universal (00)', protein: [11.5, 11.5], W: [250, 250], water: [56, 64] },
  { id: 'b-ka-bread', group: 'Brands', name: 'King Arthur Bread Flour', protein: [12.7, 12.7], W: null, water: [65, 80] },
  { id: 'b-ka-ap', group: 'Brands', name: 'King Arthur All-Purpose Flour', protein: [11.7, 11.7], W: null, water: [60, 70] },
];

/** Default flour for each style. */
export const STYLE_FLOUR = {
  neapolitan: 'g-00', contemporary: 'g-00s', detroit: 'g-bread', roman: 'g-00s',
  focaccia: 'g-0', baguette: 'g-t65', bread: 'g-bread',
};

const mid = r => (r[0] + r[1]) / 2;

/** A flour by id, looking in the user's own flours too. */
export const flourById = (id, custom = []) => FLOURS.find(f => f.id === id) || custom.find(f => f.id === id) || null;

/**
 * Strength (W) used for a flour: the middle of its published range, or an estimate from
 * protein (about 25 W per 1% protein above ~1.6%) when W is not published.
 */
export function strengthOf(f) {
  if (!f) return null;
  if (f.W) return { W: Math.round(mid(f.W)), estimated: false };
  if (f.protein) return { W: Math.round(25 * mid(f.protein) - 40), estimated: true };
  return null;
}

/** Strength and typical water range of a blend [{ flour, pct }] (pct out of 100). */
export function blendInfo(entries) {
  const used = entries.filter(e => e.flour && e.pct > 0);
  const total = used.reduce((a, e) => a + e.pct, 0);
  if (!total) return null;
  let W = 0, wLo = 0, wHi = 0, estimated = false;
  for (const e of used) {
    const s = strengthOf(e.flour);
    W += (s?.W ?? 0) * e.pct / total;
    estimated ||= !!s?.estimated;
    wLo += e.flour.water[0] * e.pct / total; wHi += e.flour.water[1] * e.pct / total;
  }
  return { W: Math.round(W / 10) * 10, estimated, water: [Math.round(wLo), Math.round(wHi)] };
}

// ---------- Starter profiles ----------
export const newStarter = ({ id, name, hydration = 100, ratio = [1, 2, 2], flour = 'g-bread', notes = '' }) =>
  ({ id, name, hydration, ratio, flour, notes, feedings: [] });

/** Log a feeding (newest first, at most 60 kept). */
export function feedStarter(st, { at, ratio = st.ratio, temp = 22 }) {
  return { ...st, feedings: [{ at, ratio, temp }, ...st.feedings].slice(0, 60) };
}

/** When a feeding reaches its peak (ms). */
export const peakOf = feeding => feeding.at + starterPeakHours({ ratio: feeding.ratio, temp: feeding.temp }) * 3600e3;

/**
 * Where a starter is now: 'unfed' (never logged), 'rising' (before peak), 'peak' (within an hour
 * of peak), 'past' (up to 8 h after) or 'hungry' (later than that: feed it before use).
 */
export function starterStatus(st, now) {
  const f = st.feedings[0];
  if (!f) return { state: 'unfed' };
  const peak = peakOf(f);
  const d = (now - peak) / 3600e3;
  const state = d < -1 ? 'rising' : d <= 1 ? 'peak' : d <= 8 ? 'past' : 'hungry';
  return { state, peak, fedAt: f.at, hoursSinceFeed: (now - f.at) / 3600e3 };
}
