# Reverse-engineering notes: PizzApp+

Target: **PizzApp+** by NFP Software (App Store id 1228158792), v1.9.7, a free Food & Drink app for iPhone and iPad.
Goal: understand what it does and build our own, broader version (Impasto).
Method: REA's black-box workflow ([morluto/rea](https://github.com/morluto/rea)): observe behaviour, record evidence, rebuild, compare.
No code or assets were copied. Impasto's text, icon and design are our own.

## What we could and could not inspect

| Source | Status | Why |
|---|---|---|
| App Store metadata (iTunes lookup API) | ✅ read | public |
| 4 iPhone + 4 iPad screenshots | ✅ read | public |
| App binary / bundle (IPA) | ❌ not available | App Store IPAs are FairPlay-encrypted and need an Apple ID and device to download |
| Android version (APK) | ❌ none found | no Google Play listing for this app |

The UI (segmented buttons, toggles that show "O", web-style fonts) suggests a **hybrid web app** such as Cordova or Ionic.
If so, its formulas ship as plain JavaScript inside the `.app` bundle, and that part is not encrypted.
To read the real formulas:

1. On an Apple-Silicon Mac, install PizzApp+ from the Mac App Store, if the developer allows iPad apps on Mac.
2. Run `rea analyze-javascript-application "/Applications/PizzApp+.app/Wrapper/<name>.app/www" --json` (or look at `public/`).
3. Compare the recovered formula with `web/engine.js` and update `K_YEAST` and the exponents.

Another option is to measure more outputs by hand and fit the model to them (see "Calibration data" below).

## Observed features (from screenshots)

- **Header:** "PizzApp 1.7", with a help `?` button and a hamburger menu.
- **Tabs:** *Neapolitan* and *Roman*.
- **Neapolitan inputs:** Dough Balls Num., Ball Weight, Water %, Salt % (each with an ⓘ button), RT leavening (h), RT (°C).
- **Yeast type:** CY, ADY, IDY, FSD, LSD.
- **Output:** "Main dough doses N g", with Flour, Water, Salt and Yeast shown as pills.
- **Value colours:** Water and Salt values turn green when they're in the recommended range.
- **Menu:** Open (with a saved-recipe count), Save, Share, Settings, Tools, About, Glossary, Rate.
- **Settings:** Two Balls Sizes, Flours Number, Fats, CT, Old Dough in, Old Dough out, Biga ("experimental"), Poolish, Wastage %, Display always on, Temperature °C/°F, Language.
- **Glossary:** CY, ADY, IDY, LSD (100%), FSD (50%), OD, Poolish, Biga, RT, CT, Roman, Neapolitan, W.
- **Roman style** (from the glossary): about 80% water and three stages (RT 1–2 h, CT 4 °C 24–72 h, RT 3–4 h).

## Calibration data

| Balls × g | Water | Salt | RT h | RT °C | Yeast | Flour | Water | Salt | Yeast |
|---|---|---|---|---|---|---|---|---|---|
| 1 × 250 | 60% | 3% | 8 | 20 | CY | 153 g | 92 g | 4.6 g | 0.76 g |

What this one data point tells us:

- **Salt and water are baker's percentages of flour.** Check: 4.6 / 153 = 3.0% and 92 / 153 = 60%.
- **Yeast counts toward the 250 g total.** Check: 153 + 92 + 4.6 + 0.76 ≈ 250.
- **The yeast is about 0.497% of flour.**

One point can't pin down a model with several parameters. Every extra row added to this table (other times, temperatures, hydrations and yeast types) tightens the fit.
`tests/engine.test.mjs` checks the row above.
