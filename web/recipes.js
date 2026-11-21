// Built-in recipe library. Each entry loads into the calculator: `style` picks the tab,
// `r` overrides the style's defaults, `s` switches on the settings it needs.
// Method steps are paraphrased; anything the source did not state is listed under `assumed`.

export const LIBRARY = [
  {
    id: 'contemporary-biga-50',
    name: 'Contemporary Neapolitan · 50% biga',
    style: 'contemporary',
    source: 'Shared by koukis_g on Instagram',
    summary: '285 g balls · 71% water · 50% biga at 45% · 32–48 h fridge at 8–10 °C · flour blend about W 300',
    r: {
      balls: 4, ballWeight: 285, hydration: 71, salt: 2.8,
      rt1Hours: 1.5, ctHours: 40, ctTemp: 9, rt2Hours: 3, rtTemp: 20,
      yeastType: 'CY', yeastManual: false,
      bigaPct: 50, bigaHydration: 45, bigaYeastPct: 0.5, bigaHours: 20, bigaTemp: 9,
      flourW: 300, ovenTemp: 440, bakeSeconds: 85,
    },
    s: { biga: true },
    method: [
      'Biga: half of the flour (type 00) at 45% water. Let it ferment about 20 h at 9 °C. Set the biga yeast so the biga is at its best at that point.',
      'Final mix: the other half of the flour (type 0 with wheat germ; the blend averages about W 300). Bring the total hydration to 70–72%, lower in summer and higher in winter.',
      'Aim for a final dough temperature of 19–21 °C. It makes the next stages easier to control.',
      'Rest 30–40 min without folds, then divide and ball.',
      'Leave the balls at room temperature until the first signs of fermentation, then refrigerate them for 32–48 h at 8–10 °C.',
      'Keep the yeast low and the fridge at 8–10 °C. Yeast, time and dough temperature need to work together.',
      'A 285 g ball should open smoothly to 31–33 cm, with a well-risen, airy rim.',
    ],
    assumed: ['Salt 2.8%', '3 h at room temperature before baking', 'Biga yeast 0.5% fresh yeast (the source says to adjust it)'],
  },
  {
    id: 'focaccia-biga-50',
    name: 'Focaccia · 50% biga',
    style: 'focaccia',
    source: 'Shared by koukis_g on Instagram',
    summary: '2 kg flour · 86% water · 3.75% salt · 4% olive oil · biga at 60% · 18 h fridge at 6–8 °C',
    r: {
      balls: 2, ballWeight: 1943, hydration: 86, salt: 3.75, fat: 4,
      rt1Hours: 2, ctHours: 18, ctTemp: 7, rt2Hours: 2, rtTemp: 21,
      yeastType: 'IDY', yeastManual: true, yeastPct: 0.5,
      bigaPct: 50, bigaHydration: 60, bigaYeastPct: 0.1, bigaHours: 20, bigaTemp: 10,
    },
    s: { biga: true },
    method: [
      'Biga: 1 kg type 00 flour (W 320 or more), 600 g water and 1 g dry yeast. The source also adds 10 g dried sourdough, or 2 g more yeast if you have none. Mix by hand just until combined.',
      'Let the biga ripen 20 h at 10 °C, or 2 h at room temperature and then in the fridge.',
      'Final dough: add the ripe biga to 1 kg type 0 flour (W 290) with 10 g dry yeast and 70% of the water. Knead 5 min.',
      'Add the 75 g salt, then the rest of the water gradually on fast speed, and finally the 80 g olive oil. The dough should be very elastic and well hydrated.',
      'Aim for a final dough temperature of 20–22 °C.',
      'Rest 2 h at room temperature, portion into trays, then refrigerate 18 h at 6–8 °C.',
    ],
    assumed: ['2 trays of about 1.94 kg', '2 h proof in the tray before baking'],
  },
];
