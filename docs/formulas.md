# Prozimi formulas

Everything lives in `web/engine.js`, and every formula is covered by `tests/engine.test.mjs`.
Notation:

- *F* is the total flour, including flour carried in by levain, pre-ferments and old dough.
- Percentages are baker's percentages of *F*.

## 1. From dough weight to flour

```
D = (n₁·w₁ + n₂·w₂) · (1 + wastage) · (1 + oldDoughOut)
F = D / (1 + h + s + fat + sugar + y)
```

*h*, *s*, *fat* and *sugar* are fractions of flour. *y* is the commercial yeast fraction: it is 0 for sourdough, because a levain is made only of flour and water, and both are already counted in *F* and *h*.
Each ingredient is then its percentage × *F*.
Whatever the levain, pre-ferment or old dough already supplies is subtracted, so the shown amounts always add up to exactly *D*.

## 2. Fresh-yeast model

```
CY% = 0.497% × hydration factor × salt factor × fat factor × (8 / P)^1.2
```

- **P** is the fermentation progress in *hours at 20 °C* (see section 3).
- **Hydration factor:** `hyd(60) / hyd(H)`, where `hyd(H) = 4.2·H − 80 − 0.0305·H²`, with H clamped to 50–100%. Wetter dough needs slightly less yeast.
- **Salt factor:** `(1 + S/200) / (1 + 3/200)`. More salt needs slightly more yeast.
- **Fat factor:** `1 + Fat/300`.

The reference point is 60% water, 3% salt and 8 h at 20 °C, which gives 0.497% fresh yeast, or 0.76 g in a 250 g ball.
Doubling the fermentation divides the yeast by 2^1.2 ≈ 2.3.
The result is clamped to 0.005–5%.

## 3. Temperature and stages

Each stage counts at its own temperature. Prozimi adds up `hours × rate(T)` over the stages: room temperature, then fridge, then the stage after the fridge (which has its own temperature).

`rate(T)` is the cardinal temperature model with inflection (Rosso et al., 1993), with typical cardinal temperatures for baker's yeast:

| Cardinal temperature | Value |
|---|---|
| Tmin | 0 °C |
| Topt | 32 °C |
| Tmax | 45 °C |

It is normalised so that rate(20 °C) = 1:

| Temperature | 2 °C | 4 °C | 8 °C | 15 °C | 18 °C | 22 °C | 24 °C | 26 °C | 30 °C |
|---|---|---|---|---|---|---|---|---|---|
| rate | 0.014 | 0.055 | 0.21 | 0.64 | 0.85 | 1.14 | 1.27 | 1.39 | 1.54 |

So a day in a 4 °C fridge counts like about 1.3 h at 20 °C. A warm 26 °C kitchen ferments about 40% faster than 20 °C.

Typical results:

| Fermentation | Fresh yeast (CY) | Instant dry yeast (IDY) |
|---|---|---|
| 24 h at 18 °C | 0.16% | 0.05% |
| 2 h + 24 h at 4 °C + 4 h | 0.55% | 0.18% |
| 2 h + 48 h at 4 °C + 4 h | 0.45% | 0.15% |

These are in the range home pizza makers commonly use. The tests check them.

## 4. Converting between leaveners (fresh yeast = 1)

| Type | Factor | Notes |
|---|---|---|
| ADY | 0.40 | active dry |
| IDY | 0.33 | instant dry |
| LSD | 40 | levain at 100% hydration; hydration adjustable |
| FSD | 35 | levain at 50% hydration; hydration adjustable |

Sourdough factors are rules of thumb. For example, 0.5% fresh yeast ≈ 20% levain gives a similar fermentation time.
A sourdough baker can also set the levain % by hand (*Set levain by hand*). The app then shows how many hours that levain supports, using the inverse formula `hoursForYeast`.

## 5. Pre-ferments

- **Poolish:** a share *p* of the flour, at 100% water. Its yeast (% of poolish flour) is `1.5 · (3 / hours)^1.95`, which gives about 1.5% at 3 h and about 0.1% at 12 h.
- **Biga:** a share *p* of the flour, at 45% water (adjustable up to 65%). Its yeast is set by the baker as a % of the biga flour, in the chosen yeast type (default 1% fresh yeast or the equivalent). Biga time and temperature are recorded for the timeline and planner.
- **Main-dough yeast** is reduced to (1 − p) of the model amount.

## 6. Yeast set by hand

**Set yeast by hand** fixes the main-dough yeast as a % of total flour, in the chosen type, for recipes that give an exact amount.
The app then shows how many room-temperature hours that yeast supports (the inverse of the yeast model).
It warns when that differs from your schedule by more than 2.5×.

## 7. Old dough

- **Old dough in:** this many % of *F*, assumed to have the same water and salt. Its flour, water and salt are subtracted from the main dough.
- **Old dough out:** the batch is scaled up by this many % to keep a piece for next time.

## 8. Sourdough lab

| Tool | Formula |
|---|---|
| Levain build | split the target by ratio a:b:c; hydration includes the starter's own water |
| Time to peak | `4 h · ((a+b+c)/(3a))^0.6 · 2^((24−T)/8)` (1:1:1 at 24 °C ≈ 4 h) |
| Bulk estimate | `5 h · (20 / levain%)^0.35 · 2^((24−T)/8)` (20% at 24 °C ≈ 5 h) |
| Aliquot target | `75% − 9 pts per °C above 21 °C`, clamped 25–100% |
| Starter hydration | add water to raise it, or flour to lower it |

## 9. Tools

| Tool | Formula |
|---|---|
| Pan dough | area × thickness factor (g/cm²) |
| Water temperature | `3·DDT − room − flour − friction`. With a levain it becomes `4·DDT − room − flour − friction − levain`. Mixer friction is 1 °C by hand, 6 °C for a stand mixer and 11 °C for a spiral mixer. The result appears in the recipe for each style's target dough temperature. |

All sourdough and pre-ferment numbers are starting points. Flour, starter strength and kitchen conditions vary.
