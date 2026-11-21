# Impasto — dough calculator

A dough calculator for **pizza (Neapolitan, Roman pan), focaccia, baguettes and sourdough bread**.
It is an installable web app (PWA), so one codebase runs:

- **in the browser**
- **on macOS**: Safari → File → *Add to Dock*, or Chrome → *Install*
- **on iPhone and iPad**: Share → *Add to Home Screen*

It works offline.

How the numbers are worked out is in [`docs/formulas.md`](docs/formulas.md) and [`docs/leoparding.md`](docs/leoparding.md).

## Features

- **Styles:** Neapolitan, Contemporary (canotto), Roman pan, Focaccia, Baguette and Sourdough loaf, each with its own defaults and fermentation stages.
- **Amounts:** pieces × weight, two piece sizes, wastage, and a blend of up to 3 flours.
- **Ingredients:** water, salt, oil/fat, sugar/malt.
- **Fermentation:** room temperature plus fridge (CT) hours, with the yeast amount following time and temperature.
- **Leaveners:** fresh, active dry and instant yeast, plus firm and liquid sourdough with adjustable starter hydration.
  - Levain can be set automatically or by hand, and then shows the hours it supports.
- **Pre-ferments and old dough:** poolish, biga, and old dough in or out.
- **Bake planner:** pick a bake time and get the start time of each step.
- **Sourdough lab:** levain build (ratio, hydration, time to peak), bulk fermentation estimate with aliquot-jar target, and starter hydration converter.
- **Tools:** yeast converter, dough weight for a pan, and water temperature for a target dough temperature.
- **Recipes:** save, open and share as a link.
- **Pizza oven presets:** Ooni Koda 16 (gas, up to 500 °C) is the default, with wood-fired, electric and home-oven options. Each preset sets the stone temperature, bake time and technique tips.
- **Leoparding coach:** scores Neapolitan and Contemporary recipes and bake setups for leopard spotting, lists the biggest fixes, and adds technique tips. See [`docs/leoparding.md`](docs/leoparding.md).
- **Hydration advisor:** suggests a hydration from your oven temperature, kitchen temperature, flour strength and fermentation time, starting from the AVPN guideline.
- **Bake log:** saves each bake with its exact recipe, process, notes, ratings, the oven temperature you actually used and a photo. Search past bakes, load one back into the calculator, or export and import them as JSON for backup.
- **Display:** °C/°F, light/dark theme, keep screen on, glossary.

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
