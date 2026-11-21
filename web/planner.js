// Bake planner: given the hours between "start" and "bake", suggest fermentation
// schedules for a style. Pure functions, no DOM. Rules are in docs/planner.md.

// Per style: a room-temperature-only schedule and a cold (fridge) schedule.
//  rt:   rt2 = fixed final stage (balls/proof), min..max = total hours that work at room temp
//  cold: rt1 before the fridge, rt2 after it, fridge between ctMin and ctMax, ideally within ideal[]
export const PLAN_RULES = {
  neapolitan:   { rt: { rt2: 0, min: 4, max: 24 },  cold: { rt1: 2, rt2: 4, ctMin: 10, ideal: [24, 48], ctMax: 72 } },
  contemporary: { rt: { rt2: 3, min: 6, max: 24 },  cold: { rt1: 2, rt2: 4, ctMin: 10, ideal: [24, 48], ctMax: 72 } },
  roman:        { rt: { rt2: 3, min: 6, max: 24 },  cold: { rt1: 2, rt2: 3, ctMin: 12, ideal: [24, 72], ctMax: 96 } },
  focaccia:     { rt: { rt2: 2, min: 3, max: 16 },  cold: { rt1: 1, rt2: 2.5, ctMin: 8, ideal: [18, 48], ctMax: 72 } },
  baguette:     { rt: { rt2: 1, min: 3, max: 16 },  cold: { rt1: 1, rt2: 1.5, ctMin: 8, ideal: [12, 24], ctMax: 48 } },
  bread:        { rt: { rt2: 2, min: 6, max: 16 },  cold: { rt1: 5, rt2: 1, ctMin: 8, ideal: [12, 16], ctMax: 48 } },
};

const r1 = h => Math.round(h * 2) / 2; // half-hour steps

/**
 * @param style  key of PLAN_RULES
 * @param hours  hours from start to bake
 * @param lead   hours needed before mixing (levain build or pre-ferment)
 * @param prep   hours for mixing, kneading and balling
 * @returns plans, best first; each { id, title, why, rt1Hours, ctHours, rt2Hours, delay, recommended, warning }
 *          delay = hours to wait after "start" before beginning (when there is more time than the plan needs)
 */
export function recommendPlans({ style, hours, lead = 0, prep = 0.5 }) {
  const rules = PLAN_RULES[style] || PLAN_RULES.neapolitan;
  const A = hours - lead - prep;
  const plans = [];
  if (!(A > 0)) return { usable: Math.max(0, A), plans, tooShort: true };

  // Cold plan
  const c = rules.cold;
  const coldSpace = A - c.rt1 - c.rt2;
  if (coldSpace >= c.ctMin) {
    const ct = r1(Math.min(coldSpace, c.ideal[1]));
    const delay = r1(Math.max(0, coldSpace - ct));
    const inIdeal = ct >= c.ideal[0] - 1;
    plans.push({
      id: 'cold', title: inIdeal ? 'Long cold ferment' : 'Short cold ferment',
      why: inIdeal
        ? 'Best flavour, extensibility and leoparding. Most of the work happens slowly in the fridge.'
        : `Fits your window, but ${c.ideal[0]}–${c.ideal[1]} h in the fridge would give more flavour and colour.`,
      rt1Hours: c.rt1, ctHours: ct, rt2Hours: c.rt2, delay, quality: inIdeal ? 3 : 2,
    });
  }

  // Room-temperature plan
  const t = rules.rt;
  if (A >= t.min) {
    const total = Math.min(A, t.max);
    const delay = r1(A - total);
    plans.push({
      id: 'room', title: 'Room temperature only',
      why: style === 'neapolitan'
        ? 'Classic single-stage Neapolitan rise. Simple, no fridge needed. Keep the room steady.'
        : 'No fridge needed. Less flavour than a cold ferment, and more sensitive to kitchen temperature.',
      rt1Hours: r1(total - t.rt2), ctHours: 0, rt2Hours: t.rt2, delay,
      quality: style === 'neapolitan' && total >= 8 ? 2.5 : (total >= 8 ? 2 : 1.5),
    });
  }

  // Not enough time for either: a rushed plan with a warning
  if (!plans.length) {
    const rt2 = Math.min(t.rt2, Math.max(0, A - 1) / 2);
    plans.push({
      id: 'rushed', title: 'Rushed same-day dough',
      why: 'Very short. The yeast goes up a lot, so expect less flavour and a paler rim. Keep the dough warm (24–26 °C).',
      rt1Hours: r1(Math.max(1, A - rt2)), ctHours: 0, rt2Hours: r1(rt2), delay: 0, quality: 1,
      warning: `Less than ${t.min} h: if you can, bake later or start earlier.`,
    });
  }

  plans.sort((a, b) => b.quality - a.quality);
  plans[0].recommended = true;
  return { usable: A, plans, tooShort: false };
}

// Does a moment fall in the night (23:00–07:00 local)?
export const atNight = date => { const h = date.getHours(); return h >= 23 || h < 7; };
