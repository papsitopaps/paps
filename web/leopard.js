// Leoparding coach: scores a Neapolitan recipe + bake setup for "leopard" spotting
// (small dark char spots on a light, airy cornicione). Pure functions, no DOM.
//
// What drives leoparding, and how each factor is scored, is written up in
// docs/leoparding.md. The thresholds are practical ranges, not lab constants.

const band = (v, good, ok) =>
  v >= good[0] && v <= good[1] ? 'good' : (v >= ok[0] && v <= ok[1] ? 'ok' : 'bad');

const POINTS = { good: 1, ok: 0.5, bad: 0 };

/** Flour strength (W) needed for a fermentation of `hours` real hours. */
/**
 * Recommended hydration for Neapolitan-style pizza.
 * Baseline: AVPN guideline of 1 L water per 1.7–1.8 kg flour (about 56–59%) for a
 * wood oven at about 485 °C and 60–90 s bake. Adjustments follow common pizzaiolo practice:
 *  - cooler oven means a longer bake that dries the dough, so add water;
 *  - warm kitchen means dough slackens and ferments faster, so less water;
 *  - weak flour can't hold much water; long ferments slacken dough.
 * Contemporary (canotto) style sits about 8 points higher.
 */
export function recommendHydration({ contemporary = false, ovenTemp = 450, roomTemp = 21, flourW = 280, hours = 24 }) {
  const reasons = [];
  let base;
  if (ovenTemp >= 450) { base = 60; reasons.push(`${Math.round(ovenTemp)} °C oven, a 60–90 s bake: classic AVPN range`); }
  else if (ovenTemp >= 400) { base = 63; reasons.push(`${Math.round(ovenTemp)} °C oven: a slightly longer bake, so a little more water`); }
  else if (ovenTemp >= 330) { base = 66; reasons.push(`${Math.round(ovenTemp)} °C oven: a 2–3 min bake dries the dough, so more water`); }
  else { base = 69; reasons.push(`${Math.round(ovenTemp)} °C home oven: a 5–8 min bake needs a wetter dough to stay soft`); }
  if (contemporary) { base += 8; reasons.push('contemporary style: wetter for a big, airy rim'); }

  let adj = 0;
  if (roomTemp > 22) { const d = Math.min(3, (roomTemp - 22) * 0.5); adj -= d; reasons.push(`warm kitchen (${Math.round(roomTemp)} °C): −${d.toFixed(1)} pts, as dough slackens faster`); }
  else if (roomTemp < 18) { const d = Math.min(2, (18 - roomTemp) * 0.5); adj += d; reasons.push(`cool kitchen (${Math.round(roomTemp)} °C): +${d.toFixed(1)} pts`); }
  if (flourW < 240) { adj -= 3; reasons.push(`weak flour (W ${flourW}): −3 pts`); }
  else if (flourW < 280) { adj -= 1; reasons.push(`medium flour (W ${flourW}): −1 pt`); }
  else if (flourW > 330) { adj += 2; reasons.push(`strong flour (W ${flourW}): +2 pts`); }
  if (hours > 48) { adj -= 1; reasons.push(`long ferment (${Math.round(hours)} h): −1 pt`); }

  const target = Math.round(base + adj);
  return { target, min: target - 2, max: target + 2, reasons };
}

export const flourStrengthFor = hours => Math.round(220 + 2 * hours);

/**
 * @param r recipe (needs hydration, salt, sugar, fat, rt1Hours, ctHours, rt2Hours, rtTemp,
 *          ovenTemp, bakeSeconds, flourW)
 * @param ctx { contemporary, cold, fats, sugar, preferment }
 */
export function leopardReport(r, ctx) {
  const items = [];
  const add = (id, label, weight, status, value, advice) => items.push({ id, label, weight, status, value, advice });
  const contemporary = !!ctx.contemporary;

  // 1. Hydration, judged against the range recommended for this oven, kitchen and flour.
  const total0 = r.rt1Hours + (ctx.cold ? r.ctHours : 0) + (ctx.cold || ctx.rt2Counts ? r.rt2Hours : 0);
  const rec = recommendHydration({ contemporary, ovenTemp: r.ovenTemp, roomTemp: r.rtTemp, flourW: r.flourW, hours: total0 });
  const hyd = band(r.hydration, [rec.min, rec.max], [rec.min - 3, rec.max + 3]);
  add('hydration', 'Hydration', 15, hyd, `${r.hydration}% (aim ${rec.min}–${rec.max}%)`,
    hyd === 'good' ? 'Right for your oven and kitchen. There is enough steam to puff the rim and char the bubble tips.'
      : r.hydration < rec.min
        ? `Raise toward ${rec.target}%. A drier dough browns evenly instead of spotting.`
        : `Come down toward ${rec.target}%. Too wet for this setup gives large, pale blisters and a dough that's hard to handle.`);

  // 2. Fermentation time (maturity)
  const total = r.rt1Hours + (ctx.cold ? r.ctHours : 0) + (ctx.cold || ctx.rt2Counts ? r.rt2Hours : 0);
  const time = band(total, [24, 72], [12, 96]);
  add('time', 'Fermentation time', 15, time, `${Math.round(total)} h total`,
    time === 'good' ? 'A long, slow ferment breaks down starch and builds the fine bubbles that leopard.'
      : total < 24 ? 'Go to 24–48 h, mostly in the fridge. Young dough gives few, large blisters and a pale rim.'
        : 'Over 72 h the gluten weakens and the rim can tear or go flat. Shorten it, or use a stronger flour.');

  // 3. Tempering after the fridge
  if (ctx.cold) {
    const temper = band(r.rt2Hours, [3, 6], [2, 8]);
    add('temper', 'Balls at room temp after the fridge', 12, temper, `${r.rt2Hours} h`,
      temper === 'good' ? 'Balls reach about 18–20 °C, so the rim inflates evenly in the oven.'
        : r.rt2Hours < 3 ? 'Give them 3–5 h out of the fridge. Cold balls blister unevenly and stay pale.'
          : 'More than 6 h out risks over-proofing: slack balls tear and lose their spots.');
  }

  // 4. Oven temperature
  const oven = band(r.ovenTemp, [420, 480], [390, 500]);
  add('oven', 'Stone temperature', 18, oven, `${Math.round(r.ovenTemp)} °C`,
    oven === 'good' ? 'Hot enough to char the bubble tips before the rest of the rim colours.'
      : r.ovenTemp < 420 ? 'Launch on a stone at 420–480 °C (measure it with an IR thermometer). Cooler stones brown the rim evenly instead of spotting it.'
        : 'Above 480 °C the base and tips burn before the crumb sets. Let the stone drop a little, or launch on a cooler spot.');

  // 5. Bake time
  const bake = band(r.bakeSeconds, [60, 100], [45, 120]);
  add('bake', 'Bake time', 8, bake, `${r.bakeSeconds} s`,
    bake === 'good' ? 'Short and fierce: spots form and the inside stays soft.'
      : r.bakeSeconds < 60 ? 'Under 60 s often leaves raw dough under the spots. Bake a bit cooler and longer.'
        : 'A long bake dries the rim and turns spots into an even tan. Bake hotter and shorter.');

  // 6. Sugar and fat
  const sugarOn = ctx.sugar && (r.sugar || 0) > 0;
  const fatOn = ctx.fats && (r.fat || 0) > 0;
  const sf = sugarOn ? 'bad' : (fatOn ? 'ok' : 'good');
  add('sugarfat', 'Sugar and oil', 10, sf, sugarOn ? `${r.sugar}% sugar` : (fatOn ? `${r.fat}% oil` : 'none'),
    sf === 'good' ? 'A plain flour, water, salt and yeast dough leopards best.'
      : sugarOn ? 'Remove sugar and malt. They brown the whole rim at these temperatures and hide the spots.'
        : 'Oil softens the crust and evens out browning. Leave it out for maximum leoparding.');

  // 7. Flour strength for the fermentation length
  const need = flourStrengthFor(total);
  const w = r.flourW >= need && r.flourW <= need + 90 ? 'good' : (r.flourW >= need - 30 && r.flourW <= need + 130 ? 'ok' : 'bad');
  add('flour', 'Flour strength', 12, w, `W ${r.flourW} (aim ${need}+)`,
    w === 'good' ? 'Strong enough to hold gas through the whole ferment.'
      : r.flourW < need ? `For ${Math.round(total)} h use a flour around W ${need}–${need + 40} (about 12.5–13.5% protein).`
        : 'This flour is stronger than the ferment needs, so the rim may be tight and chewy. Ferment longer or blend in a softer flour.');

  // 8. Pre-ferment (contemporary style)
  if (contemporary) {
    const pf = ctx.preferment ? 'good' : 'ok';
    add('preferment', 'Pre-ferment', 5, pf, ctx.preferment || 'none',
      pf === 'good' ? 'Poolish or biga gives extensibility and a lighter, more spotted rim.'
        : 'A 20–40% poolish (Settings → Poolish) gives a more open, leopard-prone rim.');
  }

  // 9. Salt
  const salt = band(r.salt, [2.5, 3.2], [2, 3.6]);
  add('salt', 'Salt', 3, salt, `${r.salt}%`,
    salt === 'good' ? 'Normal salt keeps fermentation steady and the gluten firm.' : 'Keep salt at 2.5–3.2% of the flour.');

  // 10. Room temperature
  const rt = band(r.rtTemp, [18, 23], [15, 26]);
  add('rt', 'Room temperature', 2, rt, `${Math.round(r.rtTemp)} °C`,
    rt === 'good' ? 'A steady 18–23 °C keeps the ferment predictable.' : 'Aim for 18–23 °C, or adjust the hours to match your kitchen.');

  const max = items.reduce((a, i) => a + i.weight, 0);
  const got = items.reduce((a, i) => a + i.weight * POINTS[i.status], 0);
  const score = Math.round((got / max) * 100);
  const grade = score >= 85 ? 'Leopard-ready' : score >= 65 ? 'Close' : score >= 45 ? 'Needs work' : 'Unlikely to leopard';
  const fixes = items.filter(i => i.status !== 'good').sort((a, b) => b.weight * (1 - POINTS[b.status]) - a.weight * (1 - POINTS[a.status]));
  return { score, grade, items, fixes };
}

// Technique notes that the numbers can't capture.
export const LEOPARD_TECHNIQUE = [
  ['Bench flour', 'Use as little as possible, and use semolina on the peel. Loose flour on the rim burns black and bitter, and looks like fake leoparding.'],
  ['Opening the ball', 'Press from the centre outwards to push gas into the rim, and never flatten the cornicione. For the contemporary style, leave a wide border (3–4 cm) untouched.'],
  ['Ball readiness', 'Bake when the ball is relaxed and slightly domed, with small bubbles underneath. Over-proofed balls are slack and pale; under-proofed ones give a few big blisters.'],
  ['Dough skin', 'Keep the balls in airtight trays. A dried-out skin browns evenly instead of spotting.'],
  ['Floor and flame', 'Launch onto a stone at about 420–460 °C with a strong flame. Turn after 20–30 s. At the end, lift the pizza toward the dome for a few seconds to set the spots.'],
  ['Flour choice', 'Use a 00 flour with about 12.5–13.5% protein. Swapping in 10–20% type 1 or wholemeal adds enzymes and colour.'],
];
