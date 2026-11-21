# Impasto formulas

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
CY% = K · (1 + S/200) · (1 + Fat/300) / ((4.2·H − 80 − 0.0305·H²) · T^2.5 · t^1.2)
```

- *H* is hydration in %, clamped to 50–100.
- *S* and *Fat* are in %.
- *T* is room temperature in °C.
- *t* is fermentation hours expressed as hours at room temperature.

The structure is the classic empirical formula for Neapolitan dough:

- **Time and temperature:** yeast falls steeply with both.
- **Salt and fat:** slightly more yeast is needed.
- **Hydration:** a quadratic term.

`K = 6.6069e5` is calibrated so the reference case (250 g ball, 60% water, 3% salt, 8 h at 20 °C) gives 0.497% (0.76 g).
The result is clamped to 0.005–5%.

## 3. Cold fermentation

Fridge hours are converted to equivalent room-temperature hours, using the same temperature sensitivity as the yeast model:

```
t_eq = t_RT1 + t_RT2 + t_CT · (T_CT / T_RT)^(2.5/1.2)
```

Example: 24 h at 4 °C counts as about 0.84 h at 20 °C.

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
| Water temperature | `3·DDT − room − flour − friction`. With a levain it becomes `4·DDT − room − flour − friction − levain`. |

All sourdough and pre-ferment numbers are starting points. Flour, starter strength and kitchen conditions vary.
