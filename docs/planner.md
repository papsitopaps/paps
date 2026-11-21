# Bake planner

Code: `web/planner.js`. Tests: `tests/planner.test.mjs`.

Enter **when you can start** (now, by default) and **when you want to bake**. Prozimi then works out how many hours there are between the two.

## Working out the time

1. **Lead time comes off first.** That's the levain build for sourdough (time to peak at 1:2:2), or the poolish or biga, plus 30 minutes for mixing and balling.
2. **The rest is split by the style's rules:**

| Style | Room temp only (total) | Cold plan: before fridge / fridge / after fridge | Ideal fridge |
|---|---|---|---|
| Neapolitan | 4–24 h | 2 h / 10–72 h / 4 h | 24–48 h |
| Detroit | 4–16 h (incl. 2.5 h in the pan) | 1.5 h / 12–96 h / 2.5 h | 24–72 h |
| Contemporary | 6–24 h (incl. 3 h balls) | 2 h / 10–72 h / 4 h | 24–48 h |
| Roman pan | 6–24 h | 2 h / 12–96 h / 3 h | 24–72 h |
| Focaccia | 3–16 h | 1 h / 8–72 h / 2.5 h | 18–48 h |
| Baguette | 3–16 h | 1 h / 8–48 h / 1.5 h | 12–24 h |
| Sourdough loaf | 6–16 h | 5 h bulk / 8–48 h / 1 h | 12–16 h |

## Choosing a plan

- **Cold plan:** recommended whenever it fits, because flavour, extensibility and leoparding are better and the dough is less sensitive to kitchen temperature.
- **More time than needed:** the fridge time is capped at the top of the ideal range, and the plan tells you to start later.
- **Too little time:** you get a rushed same-day plan with a warning.

## What each plan shows

- the yeast or levain the plan needs (from the yeast model)
- for pizza, the leoparding score
- a clock-time timeline, with steps that fall between 23:00 and 07:00 flagged

**Use this plan** copies the hours into the calculator and turns cold fermentation on or off to match.
