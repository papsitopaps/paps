// Read ingredient weights from pasted recipe text (Instagram captions, Reddit posts, web pages).
// Pure function: returns grams per ingredient and baker's percentages. Pre-ferments are merged
// into the totals, since most posts list biga/poolish ingredients as separate lines.

const UNIT = String.raw`(kg|kilos?|kilograms?|g|gr|grams?|grammi|gramos|γρ\.?|γραμμάρια|グラム|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?)`;
const QTY = new RegExp(String.raw`(\d+(?:[.,]\d+)?)\s*${UNIT}(?![a-zα-ω])`, 'i');

// Order matters: the first group whose pattern matches a line wins.
const KINDS = [
  ['ignore', /dry\s*sourdough|sourdough\s*powder|lievito\s*madre\s*essiccato|masa\s*madre\s*deshidratada/i],
  ['levain', /levain|sourdough|starter|lievito\s*madre|pasta\s*madre|masa\s*madre|prozimi|προζύμι|サワー種|ルヴァン|天然酵母/i],
  ['ady', /active\s*dry|lievito\s*secco\s*attivo|levadura\s*seca\s*activa/i],
  ['idy', /instant|dry\s*yeast|dried\s*yeast|lievito\s*(di\s*birra\s*)?secco|levadura\s*seca|ξηρή\s*μαγιά|ドライイースト|インスタント/i],
  ['cy', /yeast|lievito|levadura|levure|μαγιά|イースト|酵母/i],
  ['flour', /flour|farina|harina|farine|semola|semolina|αλεύρι|σιμιγδάλι|小麦粉|強力粉|中力粉|薄力粉|粉/i],
  ['water', /water|acqua|agua|eau|νερό|水/i],
  ['salt', /salt|sale|sal\b|sel\b|αλάτι|塩/i],
  ['oil', /oil|olio|aceite|huile|λάδι|オイル|油|butter|burro|mantequilla|βούτυρο|バター/i],
  ['sugar', /sugar|honey|malt|zucchero|miele|malto|azúcar|miel|ζάχαρη|μέλι|砂糖|はちみつ|モルト/i],
];

/**
 * @param text pasted recipe
 * @returns { found, grams: {flour, water, salt, oil, sugar, levain, CY, ADY, IDY}, lines, total,
 *            hydration, salt%, oil%, sugar%, yeastType, yeastPct, levainPct }  (percentages of flour)
 */
export function parseRecipe(text, starterHydration = 100) {
  const g = { flour: 0, water: 0, salt: 0, oil: 0, sugar: 0, levain: 0, CY: 0, ADY: 0, IDY: 0 };
  const lines = [];
  for (const raw of String(text).split(/\r?\n|•|·|;/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(QTY);
    if (!m) continue;
    let qty = parseFloat(m[1].replace(',', '.'));
    const unit = m[2].toLowerCase();
    if (/^(kg|kilo|kilos|kilogram|kilograms)$/.test(unit) || /^(l|liter|liters|litre|litres)$/.test(unit)) qty *= 1000;
    // Classify on the text without the quantity, and ignore anything in brackets (alternatives).
    const label = line.replace(QTY, ' ').replace(/\([^)]*\)/g, ' ');
    const kind = (KINDS.find(([, re]) => re.test(label)) || [null])[0];
    if (!kind || kind === 'ignore') { lines.push({ line, kind: kind || 'unknown', grams: qty }); continue; }
    const key = { cy: 'CY', ady: 'ADY', idy: 'IDY' }[kind] || kind;
    g[key] += qty;
    lines.push({ line, kind: key, grams: qty });
  }
  const levFlour = g.levain / (1 + starterHydration / 100);
  const flourTotal = g.flour + levFlour;
  const waterTotal = g.water + (g.levain - levFlour);
  const yeastType = ['IDY', 'ADY', 'CY'].reduce((a, k) => (g[k] > g[a] ? k : a), 'IDY');
  const yeastGrams = g[yeastType];
  const total = Object.values(g).reduce((a, v) => a + v, 0);
  const pct = v => (flourTotal ? (v / flourTotal) * 100 : 0);
  return {
    found: flourTotal > 0,
    grams: g, lines, total, flourTotal,
    hydration: pct(waterTotal), salt: pct(g.salt), oil: pct(g.oil), sugar: pct(g.sugar),
    yeastType: g.levain > 0 && yeastGrams === 0 ? null : yeastType, yeastPct: pct(yeastGrams),
    levainPct: pct(g.levain),
  };
}

/** Links that search recipe sites for a style. `q` is an English search phrase, `tag` an Instagram hashtag. */
export function searchLinks(q, tag) {
  const e = encodeURIComponent;
  const site = s => `https://www.google.com/search?q=${e(`site:${s} ${q}`)}`;
  return [
    { id: 'ooni', name: 'Ooni recipes', url: site('ooni.com') },
    { id: 'gozney', name: 'Gozney recipes', url: site('gozney.com') },
    { id: 'reddit', name: 'Reddit r/Pizza and r/Breadit', url: `https://www.reddit.com/search/?q=${e(q)}` },
    { id: '50top', name: '50 Top Pizza (award-winning pizzerias)', url: site('50toppizza.it') },
    { id: 'instagram', name: 'Instagram', extra: `#${tag}`, url: `https://www.instagram.com/explore/tags/${e(tag)}/` },
    { id: 'youtube', name: 'YouTube', url: `https://www.youtube.com/results?search_query=${e(q)}` },
  ];
}
