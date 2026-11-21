# Prozimi — dough calculator

**Prozimi** (Greek *προζύμι*, sourdough starter) is a dough calculator for **pizza (Neapolitan, contemporary, Detroit, Roman pan), focaccia, baguettes and sourdough bread**, made for home bakers with a high-temperature pizza oven.
It is available in **English, Greek (Ελληνικά), Spanish (Español) and Japanese (日本語)**.
It is an installable web app (PWA), so one codebase runs:

- **in the browser**
- **on macOS**: Safari → File → *Add to Dock*, or Chrome → *Install*
- **on iPhone and iPad**: Share → *Add to Home Screen*

It works offline.

How the numbers are worked out is in [`docs/formulas.md`](docs/formulas.md) and [`docs/leoparding.md`](docs/leoparding.md).

## Features

- **Styles:** Neapolitan, Contemporary (canotto), Detroit, Roman pan, Focaccia, Baguette and Sourdough loaf. Each has a short description and its main characteristics at the top, plus its own defaults and fermentation stages.
- **Amounts:** pieces × weight, two piece sizes, wastage, and a blend of up to 3 flours that always adds up to 100%.
- **Ingredients:** water, salt, oil/fat, sugar/malt.
- **Fermentation:** room temperature plus fridge (CT) hours, with the yeast amount following time and temperature.
- **Leaveners:** fresh, active dry and instant yeast, plus firm and liquid sourdough with adjustable starter hydration.
  - Levain can be set automatically or by hand, and then shows the hours it supports.
- **Pre-ferments and old dough:** poolish, biga, and old dough in or out.
- **Bake planner:** enter when you can start and when you want to bake. Prozimi suggests plans that fit (long cold ferment, room temperature only, or rushed). Each shows the time split, yeast amount, leoparding score and a clock-time timeline with night steps flagged. One tap applies a plan. See [`docs/planner.md`](docs/planner.md).
- **Sourdough lab:** levain build (ratio, hydration, time to peak), bulk fermentation estimate with aliquot-jar target, and starter hydration converter.
- **Tools:** yeast converter, dough weight for a pan, and water temperature for a target dough temperature.
- **Recipes:** save, open and share as a link. A **Recipe library** has proven recipes (contemporary Neapolitan with 50% biga, focaccia with 50% biga, Detroit-style pan pizza) with their method. One tap loads them.
- **Biga and yeast control:** biga yeast %, time and temperature, and **Set yeast by hand** for recipes that give exact yeast amounts.
- **Made for high-temperature pizza ovens:** the default is a gas pizza oven reaching about 500 °C (such as an Ooni Koda or a Gozney Roccbox or Dome). Wood or pellet, electric and home-oven presets are also available. Each preset sets the stone temperature, bake time and technique tips.
- **Leoparding coach:** scores Neapolitan and Contemporary recipes and bake setups for leopard spotting, lists the biggest fixes, and adds technique tips. See [`docs/leoparding.md`](docs/leoparding.md).
- **Hydration advisor:** suggests a hydration from your oven temperature, kitchen temperature, flour strength and fermentation time, starting from the AVPN guideline.
- **Bake log:** saves each bake with its exact recipe, process, notes, ratings, the oven temperature you actually used and a photo. Search past bakes, load one back into the calculator, or export and import them as JSON for backup.
- **Find and import recipes:** search Ooni, Gozney, Reddit, 50 Top Pizza, Instagram and YouTube for the current style, then paste any recipe with gram weights (in English, Italian, Spanish, Greek or Japanese) to load it into the calculator.
- **Languages:** English, Greek, Spanish and Japanese, picked from the device language and changeable in Settings.
- **Display:** light/dark/automatic switch in the top bar, °C/°F, keep screen on, glossary.

## Translations

All text is written in English with `{placeholders}` and translated in `web/locales/el.js`, `es.js` and `ja.js` (see `web/i18n.js`). `npm test` fails if any text the app can show is missing from a language, or if a translation's placeholders differ from the English.
To list missing keys for a language, run:

```bash
node tests/i18n-keys.mjs el
```

## Run

```bash
npm start
```

Then open http://localhost:8080.

## Test

```bash
npm test
```

## Deploy

`.github/workflows/pages.yml` publishes `web/` to GitHub Pages on every push to `main`.
Enable it in the repository under **Settings → Pages → Source: GitHub Actions**.
