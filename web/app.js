import {
  LEAVENERS, computeDough, convertYeast, panDough, waterTemp, cToF, fToC,
  levainBuild, convertStarter, bulkHours, aliquotRise, starterPeakHours,
} from './engine.js';
import { leopardReport, recommendHydration, LEOPARD_TECHNIQUE } from './leopard.js';
import { listBakes, getBake, putBake, deleteBake, importBakes, newId, shrinkPhoto } from './bakelog.js';
import { GLOSSARY } from './glossary.js';

const VERSION = '1.1';
const STORE_KEY = 'impasto:v1';
const SAVED_KEY = 'impasto:saved:v1';

// ---------- Styles (presets) ----------
const BASE = {
  balls: 1, ballWeight: 250, balls2: 1, ballWeight2: 300,
  hydration: 60, salt: 3, fat: 3, sugar: 1,
  rt1Hours: 8, rt2Hours: 0, ctHours: 24, ctTemp: 4, rtTemp: 20,
  yeastType: 'CY', starterHydration: 100, levainManual: false, levainPct: 20,
  flours: [{ name: 'Flour 1', pct: 100 }, { name: 'Flour 2', pct: 0 }, { name: 'Flour 3', pct: 0 }],
  bigaPct: 50, bigaHydration: 45, poolishPct: 30, poolishHours: 12,
  oldDoughIn: 10, oldDoughOut: 10,
  ovenTemp: 450, bakeSeconds: 80, flourW: 280,
};

export const STYLES = {
  neapolitan: {
    name: 'Neapolitan', piece: 'Dough balls', weight: 'Ball weight', rt1: 'RT leavening', rt2: 'Balls at RT after fridge',
    rt2OnlyWithCold: true, pizza: true, range: [55, 70],
    defaults: { rt2Hours: 4, ovenTemp: 450, bakeSeconds: 75, flourW: 260 },
  },
  contemporary: {
    name: 'Contemporary', piece: 'Dough balls', weight: 'Ball weight', rt1: 'Bulk at RT', rt2: 'Balls at RT',
    pizza: true, contemporary: true, forceCold: true, range: [65, 78],
    defaults: { ballWeight: 270, hydration: 70, salt: 2.8, rt1Hours: 2, ctHours: 24, rt2Hours: 4, rtTemp: 21, ovenTemp: 440, bakeSeconds: 85, flourW: 300 },
  },
  roman: {
    name: 'Roman pan', piece: 'Pans', weight: 'Dough per pan', rt1: 'RT before fridge', rt2: 'RT after fridge',
    range: [70, 90], forceFat: true, forceCold: true, fatLabel: 'Oil',
    defaults: { ballWeight: 600, hydration: 80, salt: 2.5, fat: 3, rt1Hours: 2, ctHours: 48, rt2Hours: 3, yeastType: 'IDY' },
  },
  focaccia: {
    name: 'Focaccia', piece: 'Trays', weight: 'Dough per tray', rt1: 'Bulk (RT)', rt2: 'Proof in tray',
    range: [65, 85], forceFat: true, fatLabel: 'Olive oil',
    defaults: { ballWeight: 800, hydration: 75, salt: 2.5, fat: 5, rt1Hours: 3, rt2Hours: 2, ctHours: 18, yeastType: 'IDY' },
  },
  baguette: {
    name: 'Baguette', piece: 'Baguettes', weight: 'Weight each', rt1: 'Bulk (RT)', rt2: 'Final proof',
    range: [65, 78],
    defaults: { balls: 3, ballWeight: 350, hydration: 70, salt: 2, rt1Hours: 3, rt2Hours: 1, rtTemp: 22, yeastType: 'CY', poolishPct: 40, poolishHours: 12 },
  },
  bread: {
    name: 'Sourdough loaf', piece: 'Loaves', weight: 'Weight each', rt1: 'Bulk (RT)', rt2: 'Final proof',
    range: [65, 90], forceCold: true,
    defaults: { ballWeight: 900, hydration: 75, salt: 2, rt1Hours: 5, rt2Hours: 1, ctHours: 14, rtTemp: 24, yeastType: 'LSD', starterHydration: 100 },
  },
};

// Pizza ovens. Temperatures are the stone (floor) temperature measured with an IR thermometer.
export const OVENS = {
  koda16: {
    name: 'Ooni Koda 16 (gas, up to 500 °C)', max: 500,
    presets: { neapolitan: { ovenTemp: 450, bakeSeconds: 75 }, contemporary: { ovenTemp: 440, bakeSeconds: 85 } },
    tips: [
      ['Preheat', 'Run the burner on full for 25–30 min. Check the centre of the stone with an IR thermometer and launch at about 430–460 °C. The Koda 16 can reach 500 °C, but above about 470 °C the base burns before the rim sets.'],
      ['L-shaped burner', 'The flame runs along the left side and back, so turn the pizza a quarter turn every 15–20 s to spot the rim evenly. Use a small turning peel.'],
      ['Flame for leoparding', 'Keep the flame high for the first 30–40 s so the rim puffs and spots. For a contemporary pizza, turn it to medium for the last 20–30 s to dry the crumb without burning the spots.'],
      ['Between pizzas', 'Give the stone 1–2 min with the flame on high to recover to launch temperature, and re-check it with the IR thermometer.'],
    ],
  },
  wood: {
    name: 'Wood-fired oven (up to 500 °C)', max: 520,
    presets: { neapolitan: { ovenTemp: 470, bakeSeconds: 70 }, contemporary: { ovenTemp: 450, bakeSeconds: 80 } },
    tips: [['Fire', 'Keep a live flame rolling over the dome. Launch on a floor at about 430–450 °C, then dome the pizza for a few seconds to set the spots.']],
  },
  electric: {
    name: 'Electric pizza oven (up to 400–450 °C)', max: 460,
    presets: { neapolitan: { ovenTemp: 400, bakeSeconds: 100 }, contemporary: { ovenTemp: 400, bakeSeconds: 110 } },
    tips: [['Top element', 'Set the top element to maximum and the stone a little lower. The top heat does the leoparding.']],
  },
  home: {
    name: 'Home oven with steel or stone (up to 300 °C)', max: 320,
    presets: { neapolitan: { ovenTemp: 290, bakeSeconds: 300 }, contemporary: { ovenTemp: 290, bakeSeconds: 330 } },
    tips: [['Steel and grill', 'Preheat a baking steel on the top rack for 45 min, then finish under the grill (broiler) for the last minute to get some spotting.']],
  },
};

const DEFAULT_SETTINGS = {
  twoSizes: false, floursCount: 1, fats: false, sugar: false, ct: false,
  oldDoughIn: false, oldDoughOut: false, biga: false, poolish: false,
  wastage: 0, keepAwake: false, unit: 'C', theme: 'auto', oven: 'koda16',
};

const freshRecipe = (key, oven = (state?.settings?.oven || 'koda16')) =>
  structuredClone({ ...BASE, ...STYLES[key].defaults, ...(OVENS[oven]?.presets[key] || {}) });

// ---------- State ----------
let state = load() || { style: 'neapolitan', recipes: {}, settings: { ...DEFAULT_SETTINGS } };
state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
for (const k of Object.keys(STYLES)) state.recipes[k] = { ...freshRecipe(k), ...(state.recipes[k] || {}) };
if (!STYLES[state.style]) state.style = 'neapolitan';
let view = 'calc';
let logId = null;      // bake being viewed or edited
let logDraft = null;   // unsaved bake in the editor
let logQuery = '';

function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } }
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }
function savedList() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } }
function setSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch {} }

const S = () => state.settings;
const R = () => state.recipes[state.style];
const ST = () => STYLES[state.style];
const coldOn = (st = ST(), s = S()) => !!(st.forceCold || s.ct);
// Recipe plus the style's always-on features, as the engine expects it.
function calcInput(r = R(), st = ST(), s = S()) {
  const x = { ...r, forceFat: !!st.forceFat, forceCold: !!st.forceCold };
  if (!st.rt2 || (st.rt2OnlyWithCold && !coldOn(st, s))) x.rt2Hours = 0;
  return x;
}
function leopardFor(r = R(), st = ST(), s = S()) {
  if (!st.pizza) return null;
  const x = calcInput(r, st, s);
  return leopardReport(x, {
    contemporary: !!st.contemporary, cold: coldOn(st, s), rt2Counts: !st.rt2OnlyWithCold,
    fats: s.fats || st.forceFat, sugar: s.sugar,
    preferment: s.poolish ? 'poolish' : s.biga ? 'biga' : null,
  });
}
function hydrationAdvice(r = R(), st = ST(), s = S()) {
  if (!st.pizza) return null;
  const x = calcInput(r, st, s);
  const hours = x.rt1Hours + (coldOn(st, s) ? x.ctHours : 0) + x.rt2Hours;
  return recommendHydration({ contemporary: !!st.contemporary, ovenTemp: r.ovenTemp, roomTemp: r.rtTemp, flourW: r.flourW, hours });
}

// ---------- Helpers ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round = (v, d) => Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : 0;
function grams(v) {
  if (!Number.isFinite(v)) return '–';
  if (v >= 50) return `${Math.round(v)} g`;
  if (v >= 1) return `${round(v, 1)} g`;
  return `${round(v, 2)} g`;
}
const tUnit = () => `°${S().unit}`;
const toDisp = c => S().unit === 'F' ? cToF(c) : c;
const fromDisp = v => S().unit === 'F' ? fToC(v) : v;
const tempStr = c => `${Math.round(toDisp(c))}${tUnit()}`;
const fmtHours = h => h >= 10 ? `${Math.round(h)} h` : `${round(h, 1)} h`;
const fmtDate = t => new Date(t).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ICON = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1.2 2.6 2.5 3 0-3-1-5.5 0-8z"/></svg>',
};

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function applyTheme() {
  const th = S().theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
}

let wakeLock = null;
async function applyWakeLock() {
  try {
    if (S().keepAwake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    } else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}
document.addEventListener('visibilitychange', applyWakeLock);

// ---------- Field definitions ----------
function fieldDefs() {
  const s = S(), r = R(), st = ST();
  const lv = LEAVENERS[r.yeastType];
  const cold = coldOn();
  const temp = (key, label, min, max) => ({ key, label, step: 1, min, max, temp: true, fmt: v => `${Math.round(v)}°` });
  const out = [{ sub: 'Dough' },
    { key: 'balls', label: st.piece, step: 1, min: 1, max: 999, fmt: v => `${v}` },
    { key: 'ballWeight', label: st.weight, step: 5, min: 10, max: 20000, fmt: v => `${v} g` },
  ];
  if (s.twoSizes) out.push(
    { key: 'balls2', label: `${st.piece} · size 2`, step: 1, min: 0, max: 999, fmt: v => `${v}` },
    { key: 'ballWeight2', label: `${st.weight} · size 2`, step: 5, min: 10, max: 20000, fmt: v => `${v} g` },
  );
  out.push(
    { key: 'hydration', label: 'Water', step: 1, min: 40, max: 120, fmt: v => `${v}%`, range: st.range, advisor: !!st.pizza },
    { key: 'salt', label: 'Salt', step: 0.1, min: 0, max: 5, fmt: v => `${round(v, 1)}%`, range: [1.8, 3.2] },
  );
  if (s.fats || st.forceFat) out.push({ key: 'fat', label: st.fatLabel || 'Fat / oil', step: 0.5, min: 0, max: 20, fmt: v => `${round(v, 1)}%` });
  if (s.sugar) out.push({ key: 'sugar', label: 'Sugar / malt', step: 0.5, min: 0, max: 20, fmt: v => `${round(v, 1)}%` });

  out.push({ sub: 'Fermentation' });
  out.push({ key: 'rt1Hours', label: st.rt1, step: 1, min: 1, max: 72, fmt: v => `${v} h` }, temp('rtTemp', 'Room temp', 1, 40));
  if (cold) out.push({ key: 'ctHours', label: 'Fridge', step: 1, min: 0, max: 120, fmt: v => `${v} h` }, temp('ctTemp', 'Fridge temp', 1, 12));
  if (st.rt2 && (!st.rt2OnlyWithCold || cold)) out.push({ key: 'rt2Hours', label: st.rt2, step: 0.5, min: 0, max: 24, fmt: v => `${v} h` });

  out.push({ sub: 'Leavening' }, { yeast: true });
  if (lv.sourdough) {
    out.push({ key: 'starterHydration', label: 'Starter hydration', step: 5, min: 40, max: 200, fmt: v => `${v}%` });
    out.push({ toggle: 'levainManual', label: 'Set levain by hand' });
    if (r.levainManual) out.push({ key: 'levainPct', label: 'Levain · % of flour', step: 1, min: 1, max: 60, fmt: v => `${v}%` });
  }

  if (st.pizza) {
    out.push({ sub: 'Bake' });
    out.push(temp('ovenTemp', 'Oven (stone)', 150, (OVENS[s.oven] || OVENS.koda16).max), { key: 'bakeSeconds', label: 'Bake time', step: 5, min: 30, max: 900, fmt: v => `${v} s` });
    out.push({ key: 'flourW', label: 'Flour strength (W)', step: 10, min: 120, max: 450, fmt: v => `W ${v}` });
  }
  if (s.floursCount > 1) {
    out.push({ sub: 'Flour blend' });
    for (let i = 0; i < s.floursCount; i++) out.push({ flour: i });
  }
  if (s.poolish) out.push({ sub: 'Poolish' }, { key: 'poolishPct', label: 'Flour in poolish', step: 5, min: 5, max: 100, fmt: v => `${v}%` }, { key: 'poolishHours', label: 'Poolish time', step: 1, min: 2, max: 24, fmt: v => `${v} h` });
  else if (s.biga) out.push({ sub: 'Biga' }, { key: 'bigaPct', label: 'Flour in biga', step: 5, min: 5, max: 100, fmt: v => `${v}%` }, { key: 'bigaHydration', label: 'Biga water', step: 1, min: 40, max: 60, fmt: v => `${v}%` });
  if (s.oldDoughIn || s.oldDoughOut) out.push({ sub: 'Old dough' });
  if (s.oldDoughIn) out.push({ key: 'oldDoughIn', label: 'Old dough in', step: 1, min: 1, max: 50, fmt: v => `${v}%` });
  if (s.oldDoughOut) out.push({ key: 'oldDoughOut', label: 'Keep for next time', step: 1, min: 1, max: 50, fmt: v => `${v}%` });
  return out;
}

function valueOf(def) { const v = R()[def.key]; return def.temp ? Math.round(toDisp(v)) : v; }

function tileHTML(d) {
  const v = valueOf(d);
  const unit = d.temp ? `<span class="unit">${tUnit()}</span>` : '';
  return `<div class="tile" data-tile="${d.key}">
    <label for="f-${d.key}">${esc(d.label)}${unit}</label>
    <div class="tile-row">
      <input id="f-${d.key}" class="val" inputmode="decimal" autocomplete="off" value="${esc(d.fmt(v))}" data-key="${d.key}">
      <div class="steps" data-key="${d.key}">
        <button type="button" data-dir="-1" aria-label="Decrease ${esc(d.label)}">${ICON.minus}</button>
        <button type="button" data-dir="1" aria-label="Increase ${esc(d.label)}">${ICON.plus}</button>
      </div>
    </div>${d.advisor ? '<div class="advice" id="hyd-advice"></div>' : ''}</div>`;
}

function renderCalc() {
  const r = R();
  const groups = [];
  for (const d of fieldDefs()) {
    if (d.sub) { groups.push({ title: d.sub, html: [] }); continue; }
    const g = groups[groups.length - 1];
    if (d.yeast) g.html.push(`<div class="tile wide"><span class="label" id="lbl-yeast">Type</span>
      <div class="seg" role="group" aria-labelledby="lbl-yeast">${Object.values(LEAVENERS).map(l =>
        `<button type="button" data-yeast="${l.short}" aria-pressed="${r.yeastType === l.short}" title="${esc(l.label)}">${l.short}</button>`).join('')}</div>
      <span class="hint">${esc(LEAVENERS[r.yeastType].label)}</span></div>`);
    else if (d.toggle) g.html.push(`<label class="tile wide switch-row"><span>${esc(d.label)}</span>
      <span class="switch"><input type="checkbox" data-rtoggle="${d.toggle}" ${r[d.toggle] ? 'checked' : ''}><span></span></span></label>`);
    else if (d.flour != null) {
      const f = r.flours[d.flour];
      g.html.push(`<div class="tile"><input type="text" class="flour-name" data-flour-name="${d.flour}" value="${esc(f.name)}" aria-label="Flour ${d.flour + 1} name">
        <div class="tile-row"><input class="val" inputmode="decimal" value="${f.pct}%" data-flour="${d.flour}" aria-label="${esc(f.name)} percent">
        <div class="steps" data-flour="${d.flour}"><button type="button" data-dir="-1" aria-label="Less">${ICON.minus}</button><button type="button" data-dir="1" aria-label="More">${ICON.plus}</button></div></div></div>`);
    } else g.html.push(tileHTML(d));
  }
  $('#view').innerHTML = `<div class="calc">
    <div class="inputs">${groups.map(g => `<section class="group" aria-label="${esc(g.title)}"><h2 class="eyebrow">${esc(g.title)}</h2><div class="tiles">${g.html.join('')}</div></section>`).join('')}</div>
    <div class="results" id="results" aria-live="polite"></div></div>`;
  refreshRanges();
  renderResults();
}

function refreshRanges() {
  for (const d of fieldDefs().filter(d => d.range)) {
    const i = document.getElementById(`f-${d.key}`); if (!i) continue;
    const v = valueOf(d);
    i.classList.toggle('ok', v >= d.range[0] && v <= d.range[1]);
    i.classList.toggle('off', !(v >= d.range[0] && v <= d.range[1]));
  }
  const box = document.getElementById('hyd-advice');
  const adv = hydrationAdvice();
  if (box && adv) {
    const inRange = R().hydration >= adv.min && R().hydration <= adv.max;
    box.innerHTML = `<span><b>${inRange ? 'On target' : `Suggested ${adv.min}–${adv.max}%`}</b> for your oven, kitchen and flour</span>
      ${inRange ? '' : `<button type="button" class="chip" data-sethyd="${adv.target}">Use ${adv.target}%</button>`}
      <details><summary>Why</summary><ul>${adv.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  }
}

function ring(score) {
  const C = 2 * Math.PI * 26;
  const tone = score >= 85 ? 'good' : score >= 65 ? 'mid' : 'low';
  return `<svg class="ring ${tone}" viewBox="0 0 64 64" role="img" aria-label="Leopard score ${score} out of 100">
    <circle cx="32" cy="32" r="26" class="track"/><circle cx="32" cy="32" r="26" class="arc" stroke-dasharray="${(score / 100) * C} ${C}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle">${score}</text></svg>`;
}

function leopardCardHTML(rep) {
  const top = rep.fixes.slice(0, 3);
  return `<section class="card leopard">
    <header class="card-head">${ring(rep.score)}<div><p class="eyebrow">${ICON.flame} Leoparding coach</p><h3>${esc(rep.grade)}</h3></div></header>
    ${top.length ? `<ol class="fixes">${top.map(i => `<li class="${i.status}"><b>${esc(i.label)}</b> · ${esc(i.value)}<br>${esc(i.advice)}</li>`).join('')}</ol>`
      : '<p class="note">Every factor is in range. The rest is technique: see the tips below.</p>'}
    <details><summary>All factors</summary><ul class="checks">${rep.items.map(i =>
      `<li class="${i.status}"><span class="dot" aria-hidden="true"></span><span><b>${esc(i.label)}</b> <span class="muted">${esc(i.value)}</span><br>${esc(i.advice)}</span></li>`).join('')}</ul></details>
    <details><summary>Technique tips</summary><dl class="tips">${[...(OVENS[S().oven] || OVENS.koda16).tips, ...LEOPARD_TECHNIQUE].map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></details>
  </section>`;
}

function ingredientRows(out, r, st) {
  const lv = LEAVENERS[r.yeastType];
  const F = out.flourTotal || 1;
  const rows = [];
  if (out.flours.length > 1) out.flours.forEach(f => rows.push([f.name, f.grams]));
  else rows.push(['Flour', out.flour]);
  rows.push(['Water', out.water], ['Salt', out.salt]);
  if (lv.sourdough) rows.push([`Levain (${round(out.levain.pct, 1)}%)`, out.levain.mass]);
  else rows.push([`Yeast · ${lv.short}`, out.yeast]);
  if (out.fat > 0) rows.push([st.fatLabel || 'Fat', out.fat]);
  if (out.sugar > 0) rows.push(['Sugar', out.sugar]);
  if (out.oldDough) rows.push(['Old dough', out.oldDough.mass]);
  if (out.preferment) rows.push([out.preferment.kind === 'poolish' ? 'Poolish (all)' : 'Biga (all)', out.preferment.total]);
  return rows.map(([name, g]) => ({ name, g, pct: (g / F) * 100 }));
}

function renderResults() {
  const r = R(), s = S(), st = ST();
  const out = computeDough(calcInput(), s);
  const rows = ingredientRows(out, r, st);
  const pieces = `${r.balls} × ${r.ballWeight} g${s.twoSizes && r.balls2 ? ` + ${r.balls2} × ${r.ballWeight2} g` : ''}`;
  let html = `<section class="hero">
    <p class="eyebrow">${esc(st.name)} · ${esc(pieces)}</p>
    <p class="total"><span>${Math.round(out.dough)}</span> g dough</p>
    <ul class="ingredients">${rows.map(x => `<li><span class="name">${esc(x.name)}</span><span class="pct">${round(x.pct, x.pct < 1 ? 2 : 1)}%</span><span class="g">${grams(x.g)}</span>
      <span class="fill" style="--w:${Math.min(100, x.pct).toFixed(1)}%"></span></li>`).join('')}</ul>
    <div class="actions"><button class="btn primary" data-act="log-new">Log this bake</button><button class="btn" data-act="save">Save recipe</button><button class="btn" data-act="share">Share</button></div>
  </section>`;

  const rep = leopardFor();
  if (rep) html += leopardCardHTML(rep);

  if (out.preferment) {
    const p = out.preferment;
    html += `<section class="card"><h3>${p.kind === 'poolish' ? 'Poolish' : 'Biga'} · make first${p.hours ? `, ${p.hours} h ahead` : ''}</h3><table>
      <tr><td>Flour</td><td>${grams(p.flour)}</td></tr><tr><td>Water</td><td>${grams(p.water)}</td></tr>
      <tr><td>Yeast (${p.yeastType})</td><td>${grams(p.yeast)}</td></tr><tr><td>Total</td><td>${grams(p.total)}</td></tr></table>
      <p class="note">Mix all of it into the main dough.</p></section>`;
  }
  if (out.levain) {
    const L = out.levain;
    html += `<section class="card"><h3>Levain</h3><table>
      <tr><td>Levain at ${round(L.hydration, 0)}% hydration</td><td>${grams(L.mass)}</td></tr>
      <tr><td>Flour in it</td><td>${grams(L.flour)}</td></tr><tr><td>Water in it</td><td>${grams(L.water)}</td></tr>
      ${out.levainHours ? `<tr><td>Fermentation it supports at ${tempStr(r.rtTemp)}</td><td>≈ ${fmtHours(out.levainHours)}</td></tr>` : ''}
      </table><p class="note">Its flour and water already count toward the dough's hydration. Plan the build in the <a href="#" data-go="sourdough">Sourdough lab</a>.</p></section>`;
  }
  html += `<section class="card"><h3>Formula</h3><table>
    <tr><td>Total flour</td><td>${grams(out.flourTotal)}</td></tr>
    <tr><td>Total water</td><td>${grams(out.flourTotal * r.hydration / 100)}</td></tr>
    <tr><td>Fermentation, as hours at room temp</td><td>${fmtHours(out.hours)}</td></tr>
    <tr><td>Fresh-yeast equivalent</td><td>${round(out.yeastPctCY, 3)}%</td></tr>
    ${out.oldDoughOut ? `<tr><td>Set aside for next batch</td><td>${grams(out.oldDoughOut)}</td></tr>` : ''}
    ${s.wastage ? `<tr><td>Wastage allowance</td><td>${s.wastage}%</td></tr>` : ''}
    </table>${out.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('')}</section>`;
  html += scheduleHTML(out);
  $('#results').innerHTML = html;
}

// ---------- Schedule ----------
let bakeAt = null;
function scheduleSteps(out, r = R(), st = ST(), s = S()) {
  const steps = [];
  if (out.levain) steps.push(['Build levain', starterPeakHours({ ratio: [1, 2, 2], temp: r.rtTemp })]);
  if (out.preferment) steps.push([`Mix ${out.preferment.kind}`, out.preferment.kind === 'poolish' ? r.poolishHours : 16]);
  steps.push([`Mix dough · ${st.rt1}`, r.rt1Hours]);
  if (coldOn(st, s)) steps.push(['Into the fridge', r.ctHours]);
  const x = calcInput(r, st, s);
  if (x.rt2Hours > 0) steps.push([st.rt2, x.rt2Hours]);
  steps.push(['Bake', 0]);
  return steps;
}
function scheduleHTML(out) {
  const steps = scheduleSteps(out);
  const total = steps.reduce((a, [, h]) => a + h, 0);
  let t = bakeAt ? new Date(bakeAt - total * 3600e3) : null;
  const fmt = d => d.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const rows = steps.map(([name, h]) => {
    const cell = t ? fmt(t) : '';
    if (t) t = new Date(t.getTime() + h * 3600e3);
    return `<li><span class="when">${cell}</span><span>${esc(name)}${h ? ` <span class="muted">${fmtHours(h)}</span>` : ''}</span></li>`;
  }).join('');
  return `<section class="card"><h3>Plan</h3>
    <label class="inline-field" for="bake-at">Bake at <input type="datetime-local" id="bake-at" value="${bakeAt ? toLocalInput(new Date(bakeAt)) : ''}"></label>
    <ol class="timeline${bakeAt ? ' timed' : ''}">${rows}</ol><p class="note">Total ≈ ${fmtHours(total)}${bakeAt ? '' : '. Pick a bake time to see when to start each step.'}</p></section>`;
}
function toLocalInput(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- Value changes ----------
function findDef(key) { return fieldDefs().find(d => d.key === key); }

function setValue(key, displayValue) {
  const d = findDef(key); if (!d) return;
  let v = Number(String(displayValue).replace(',', '.').replace(/[^\d.\-]/g, ''));
  if (!Number.isFinite(v)) v = valueOf(d);
  if (d.temp) v = Math.min(d.max, Math.max(d.min, fromDisp(v)));
  else v = Math.min(d.max, Math.max(d.min, v));
  R()[key] = round(v, 2);
  persist();
  const input = document.getElementById(`f-${key}`);
  if (input) input.value = d.fmt(valueOf(d));
  refreshRanges();
  renderResults();
}
function bump(key, dir) {
  const d = findDef(key); if (!d) return;
  if (d.temp) { const c = R()[key] + dir * (S().unit === 'F' ? 5 / 9 : 1) * (key === 'ovenTemp' ? 5 : 1); setValue(key, toDisp(c)); }
  else setValue(key, valueOf(d) + dir * d.step);
}
function bumpFlour(i, dir) { const f = R().flours[i]; f.pct = Math.min(100, Math.max(0, f.pct + dir * 5)); persist(); renderCalc(); }

let holdTimer = null;
function stopHold() { clearTimeout(holdTimer); clearInterval(holdTimer); holdTimer = null; }
document.addEventListener('pointerup', stopHold);
document.addEventListener('pointercancel', stopHold);

// ---------- Views ----------
const PAGE_TITLES = {
  settings: 'Settings', tools: 'Tools', sourdough: 'Sourdough lab', glossary: 'Glossary', about: 'About', open: 'Saved recipes',
  shared: 'Share', help: 'How to use', log: 'Bake log', 'log-edit': 'Log a bake', 'log-detail': 'Bake',
};

function renderTabs() {
  const tabs = $('#tabs');
  tabs.hidden = view !== 'calc';
  tabs.innerHTML = Object.entries(STYLES).map(([k, st]) =>
    `<button role="tab" data-style="${k}" aria-selected="${k === state.style}">${esc(st.name)}</button>`).join('');
}

async function render() {
  renderTabs();
  $('#saved-count').textContent = savedList().length;
  applyTheme();
  if (view === 'calc') { $('#page-title').textContent = ''; renderCalc(); return; }
  $('#page-title').textContent = PAGE_TITLES[view] || '';
  const body = view.startsWith('log') ? await LOG_PAGES[view]() : PAGES[view]();
  const backTo = view === 'log-detail' || view === 'log-edit' ? (logDraft && !logId ? 'calc' : 'log') : 'calc';
  $('#view').innerHTML = `<div class="page"><button class="btn ghost back" data-go="${backTo}">${ICON.back}${backTo === 'log' ? 'Bake log' : 'Calculator'}</button>${body}</div>`;
  if (view === 'tools') updateTools();
  if (view === 'sourdough') updateLab();
}

const toggleRow = (key, label, hint = '') => `<label class="row"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span>
  <span class="switch"><input type="checkbox" data-setting="${key}" ${S()[key] ? 'checked' : ''}><span></span></span></label>`;

const PAGES = {
  settings: () => `<div class="list">
    ${toggleRow('twoSizes', 'Two piece sizes')}
    <div class="row"><label for="set-flours">Number of flours</label><select id="set-flours" data-setting="floursCount">${[1, 2, 3].map(n => `<option ${S().floursCount == n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${toggleRow('fats', 'Fats / oil', 'Always on for Roman and focaccia.')}
    ${toggleRow('sugar', 'Sugar / malt')}
    ${toggleRow('ct', 'Cold fermentation', 'Always on for Contemporary, Roman and sourdough loaf.')}
    ${toggleRow('oldDoughIn', 'Old dough in')}
    ${toggleRow('oldDoughOut', 'Old dough out')}
    ${toggleRow('biga', 'Biga', 'Stiff pre-ferment. Turns poolish off.')}
    ${toggleRow('poolish', 'Poolish', 'Liquid pre-ferment. Turns biga off.')}
    <div class="row"><label for="set-waste">Wastage</label><select id="set-waste" data-setting="wastage">${[0, 1, 2, 3, 4, 5, 7, 10].map(n => `<option value="${n}" ${S().wastage == n ? 'selected' : ''}>${n}%</option>`).join('')}</select></div>
    <div class="row"><label for="set-oven">Pizza oven<small>Sets the oven temperature, bake time and tips for Neapolitan and Contemporary.</small></label><select id="set-oven" data-setting="oven">${Object.entries(OVENS).map(([k, o]) => `<option value="${k}" ${S().oven === k ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></div>
    ${toggleRow('keepAwake', 'Keep screen on')}
    <div class="row"><span>Temperature</span><div class="seg small">${['C', 'F'].map(u => `<button data-unit="${u}" aria-pressed="${S().unit === u}">°${u}</button>`).join('')}</div></div>
    <div class="row"><label for="set-theme">Appearance</label><select id="set-theme" data-setting="theme">${['auto', 'light', 'dark'].map(t => `<option value="${t}" ${S().theme === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
    </div>
    <p><button class="btn danger" data-act="reset">Reset ${esc(ST().name)} to defaults</button></p>`,

  tools: () => `
    <h3>Yeast converter</h3>
    <div class="list"><div class="row"><span><input type="number" id="ty-g" value="10" min="0" step="0.1" aria-label="Grams"> g</span>
      <select id="ty-from" aria-label="Yeast type">${Object.values(LEAVENERS).filter(l => !l.sourdough).map(l => `<option value="${l.short}">${l.label}</option>`).join('')}</select></div>
      <div class="row"><span>Equals</span><span class="tool-out" id="ty-out"></span></div></div>

    <h3>Dough for a pan</h3>
    <div class="list">
      <div class="row"><label for="tp-shape">Shape</label><select id="tp-shape"><option value="rect">Rectangular</option><option value="round">Round</option></select></div>
      <div class="row" id="tp-rect"><span>Size (cm)</span><span><input type="number" id="tp-l" value="40" class="narrow" aria-label="Length"> × <input type="number" id="tp-w" value="30" class="narrow" aria-label="Width"></span></div>
      <div class="row" id="tp-round" hidden><label for="tp-d">Diameter (cm)</label><input type="number" id="tp-d" value="28"></div>
      <div class="row"><label for="tp-f">Thickness factor (g/cm²)<small>Roman pan 0.55–0.65 · focaccia 0.6–0.7 · thin round 0.35–0.4</small></label><input type="number" id="tp-f" value="0.55" step="0.05"></div>
      <div class="row"><span class="tool-out" id="tp-out"></span><button class="btn primary" id="tp-use">Use for ${esc(ST().name)}</button></div>
    </div>

    <h3>Water temperature</h3>
    <div class="list">
      <div class="row"><label for="tw-t">Target dough temp (${tUnit()})</label><input type="number" id="tw-t" value="${Math.round(toDisp(24))}"></div>
      <div class="row"><label for="tw-r">Room (${tUnit()})</label><input type="number" id="tw-r" value="${Math.round(toDisp(22))}"></div>
      <div class="row"><label for="tw-f">Flour (${tUnit()})</label><input type="number" id="tw-f" value="${Math.round(toDisp(22))}"></div>
      <div class="row"><label for="tw-x">Mixer friction (${tUnit()})<small>By hand ≈ 1 °C · stand mixer ≈ 5–10 °C · spiral ≈ 10–14 °C</small></label><input type="number" id="tw-x" value="${S().unit === 'F' ? 2 : 1}"></div>
      <div class="row"><span>Water at</span><span class="tool-out" id="tw-out"></span></div>
    </div>`,

  sourdough: () => {
    const out = computeDough(calcInput(), S());
    const target = out.levain ? Math.ceil(out.levain.mass * 1.1) : 100;
    return `<p class="note">Tools for working with a starter. The levain target is your current recipe's levain plus 10%, to allow for what sticks to the jar.</p>
    <h3>Levain build</h3>
    <div class="list">
      <div class="row"><label for="lb-t">Levain needed (g)</label><input type="number" id="lb-t" value="${target}"></div>
      <div class="row"><span>Ratio starter : flour : water</span><span><input type="number" id="lb-a" value="1" class="narrow" aria-label="Starter part"> : <input type="number" id="lb-b" value="2" class="narrow" aria-label="Flour part"> : <input type="number" id="lb-c" value="2" class="narrow" aria-label="Water part"></span></div>
      <div class="row"><label for="lb-h">Starter hydration (%)</label><input type="number" id="lb-h" value="100"></div>
      <div class="row"><label for="lb-temp">Kitchen temp (${tUnit()})</label><input type="number" id="lb-temp" value="${Math.round(toDisp(R().rtTemp))}"></div>
      <div class="row block"><table id="lb-out"></table></div>
    </div>
    <h3>Bulk fermentation estimate</h3>
    <div class="list">
      <div class="row"><label for="bk-l">Levain (% of flour)</label><input type="number" id="bk-l" value="${out.levain ? Math.round(out.levain.pct) : 20}"></div>
      <div class="row"><label for="bk-t">Dough temp (${tUnit()})</label><input type="number" id="bk-t" value="${Math.round(toDisp(24))}"></div>
      <div class="row block"><table id="bk-out"></table>
      <p class="note">Put a small piece of dough in a straight-sided jar (an aliquot jar). End bulk when it has risen by the target. The warmer the dough, the less it should rise.</p></div>
    </div>
    <h3>Change starter hydration</h3>
    <div class="list">
      <div class="row"><label for="sc-m">Starter (g)</label><input type="number" id="sc-m" value="100"></div>
      <div class="row"><label for="sc-f">From (%)</label><input type="number" id="sc-f" value="100"></div>
      <div class="row"><label for="sc-t">To (%)</label><input type="number" id="sc-t" value="50"></div>
      <div class="row"><span>Add</span><span class="tool-out" id="sc-out"></span></div>
    </div>`;
  },

  glossary: () => `<dl class="gloss">${GLOSSARY.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`,

  about: () => `<div class="prose"><p><b>Impasto ${VERSION}</b> works out dough ingredients for pizza, focaccia, baguettes and sourdough bread. It suggests how much yeast or levain to use for the time and temperature you pick.</p>
    <p>For Neapolitan and Contemporary pizza it also suggests a hydration for your oven, kitchen and flour. A leoparding coach scores your recipe and bake setup.</p>
    <p>The <b>Bake log</b> keeps every bake with its exact recipe, notes, ratings and a photo. Recipes and bakes are stored only on this device. Use <i>Export</i> in the bake log to back them up or move them to another device.</p>
    <p>Install the app with <i>Add to Dock</i> (Safari on macOS), <i>Add to Home Screen</i> (iPhone and iPad), or the install button in Chrome and Edge. It works offline.</p>
    <p>The yeast, sourdough and leoparding models are informed approximations. Treat the numbers as a starting point and keep notes in the log.</p></div>`,

  help: () => `<ol class="prose">
    <li>Pick a style at the top.</li>
    <li>Set the number of pieces and their weight, then water and salt as a percentage of the flour.</li>
    <li>Set the fermentation time and temperature. The yeast or levain amount follows them.</li>
    <li>For pizza, enter your oven temperature, bake time and flour strength. Impasto suggests a hydration, and the <b>Leoparding coach</b> tells you what to change.</li>
    <li>Turn on extras in <b>Settings</b>: a flour blend, oil, sugar, cold fermentation, biga or poolish, or old dough.</li>
    <li>Choose <b>Log this bake</b> when you bake. Later, open the <b>Bake log</b> to see exactly what you used, or load it again.</li>
    </ol><p class="note">Hold − or + to change a value quickly, or type a number into the box.</p>`,

  open: () => {
    const list = savedList();
    const form = `<form class="list" id="save-form"><div class="row">
      <input type="text" id="save-name" aria-label="Recipe name" value="${esc(`${ST().name} ${new Date().toLocaleDateString()}`)}" class="grow">
      <button class="btn primary" type="submit">Save current recipe</button></div></form>`;
    if (!list.length) return `${form}<p class="note">No saved recipes yet. Saved recipes are templates you reuse. Each actual bake goes in the Bake log.</p>`;
    return `${form}<div class="list">${list.map((it, i) => `<div class="row"><span><b>${esc(it.name)}</b><small>${esc(STYLES[it.style]?.name || '')} · ${new Date(it.at).toLocaleDateString()}</small></span>
      <span class="btns"><button class="btn" data-load="${i}">Open</button><button class="btn danger" data-del="${i}" aria-label="Delete ${esc(it.name)}">Delete</button></span></div>`).join('')}</div>`;
  },

  shared: () => `<p>Copy this text to share the recipe:</p><textarea id="share-text" rows="10" aria-label="Recipe to share"></textarea>`,
};

// ---------- Bake log ----------
function summarize(r, st, s) {
  const out = computeDough(calcInput(r, st, s), s);
  return {
    dough: out.dough, hours: out.hours, yeastPctCY: out.yeastPctCY,
    rows: ingredientRows(out, r, st).map(x => ({ name: x.name, g: x.g, pct: x.pct })),
    preferment: out.preferment, levain: out.levain,
    schedule: scheduleSteps(out, r, st, s),
  };
}

function newBakeFromCurrent() {
  const st = ST(), r = structuredClone(R()), s = structuredClone(S());
  const now = bakeAt || Date.now();
  const rep = leopardFor(r, st, s);
  return {
    id: newId(), createdAt: Date.now(), bakedAt: now, style: state.style, styleName: st.name,
    name: `${st.name} · ${new Date(now).toLocaleDateString([], { day: 'numeric', month: 'short' })}`,
    recipe: r, settings: s, summary: summarize(r, st, s),
    leopardScore: rep ? rep.score : null, rating: 0, leopardRating: 0, ovenActual: st.pizza ? r.ovenTemp : null,
    notes: '', photo: null,
  };
}

const stars = (name, value, label) => `<fieldset class="stars"><legend>${esc(label)}</legend>${[1, 2, 3, 4, 5].map(n =>
  `<label><input type="radio" name="${name}" value="${n}" ${value === n ? 'checked' : ''}><span aria-hidden="true">★</span><span class="sr">${n} of 5</span></label>`).join('')}</fieldset>`;
const starText = n => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';

function recipeFacts(b) {
  const r = b.recipe, s = b.settings, st = STYLES[b.style] || {};
  const lv = LEAVENERS[r.yeastType] || LEAVENERS.CY;
  const cold = !!(st.forceCold || s.ct);
  const facts = [
    ['Pieces', `${r.balls} × ${r.ballWeight} g${s.twoSizes && r.balls2 ? ` + ${r.balls2} × ${r.ballWeight2} g` : ''}`],
    ['Hydration', `${r.hydration}%`], ['Salt', `${r.salt}%`],
    ['Leavening', lv.label + (lv.sourdough ? ` (starter ${r.starterHydration}%)` : '')],
    [st.rt1 || 'Room temp rise', `${r.rt1Hours} h at ${tempStr(r.rtTemp)}`],
  ];
  if (s.fats || st.forceFat) facts.splice(3, 0, [st.fatLabel || 'Fat', `${r.fat}%`]);
  if (s.sugar) facts.splice(3, 0, ['Sugar', `${r.sugar}%`]);
  if (cold) facts.push(['Fridge', `${r.ctHours} h at ${tempStr(r.ctTemp)}`]);
  if (st.rt2 && (!st.rt2OnlyWithCold || cold) && r.rt2Hours) facts.push([st.rt2, `${r.rt2Hours} h`]);
  if (s.poolish) facts.push(['Poolish', `${r.poolishPct}% of flour, ${r.poolishHours} h`]);
  else if (s.biga) facts.push(['Biga', `${r.bigaPct}% of flour at ${r.bigaHydration}%`]);
  if (s.floursCount > 1) facts.push(['Flour blend', r.flours.slice(0, s.floursCount).map(f => `${f.name} ${f.pct}%`).join(', ')]);
  if (st.pizza) facts.push(['Oven (planned)', tempStr(r.ovenTemp)], ['Bake time', `${r.bakeSeconds} s`], ['Flour strength', `W ${r.flourW}`]);
  return facts;
}

const LOG_PAGES = {
  log: async () => {
    const all = await listBakes();
    const q = logQuery.trim().toLowerCase();
    const list = q ? all.filter(b => `${b.name} ${b.styleName} ${b.notes}`.toLowerCase().includes(q)) : all;
    const tools = `<div class="log-tools">
      <input type="search" id="log-q" placeholder="Search bakes and notes" value="${esc(logQuery)}" aria-label="Search bakes">
      <button class="btn" data-act="export">Export</button>
      <label class="btn" for="log-import">Import</label><input type="file" id="log-import" accept="application/json,.json" hidden></div>`;
    if (!all.length) return `${tools}<div class="empty"><p><b>No bakes yet.</b></p><p class="note">On the calculator, choose <b>Log this bake</b> when you make a dough. Impasto saves the exact recipe, your notes, ratings and a photo, so you can see later what worked.</p>
      <button class="btn primary" data-go="calc">Go to the calculator</button></div>`;
    return `${tools}<p class="note">${all.length} bake${all.length === 1 ? '' : 's'} saved on this device.</p>
      <div class="bakes">${list.map(b => `<button class="bake" data-open-bake="${esc(b.id)}">
        ${b.photo ? `<img src="${b.photo}" alt="">` : `<span class="ph" aria-hidden="true">${ICON.flame}</span>`}
        <span class="meta"><b>${esc(b.name)}</b><small>${esc(fmtDate(b.bakedAt))}</small>
        <small>${esc(b.styleName)} · ${b.recipe.hydration}% · ${Math.round(b.summary.dough)} g${b.rating ? ` · <span class="stars-txt">${starText(b.rating)}</span>` : ''}</small></span>
        ${b.leopardScore != null ? `<span class="badge-score" title="Leopard score when logged">${b.leopardScore}</span>` : ''}
      </button>`).join('') || '<p class="note">No bakes match your search.</p>'}</div>`;
  },

  'log-edit': async () => {
    const b = logDraft;
    if (!b) return '<p class="note">Nothing to edit.</p>';
    const st = STYLES[b.style] || {};
    return `<form id="log-form" class="log-form">
      <div class="list">
        <div class="row"><label for="lg-name">Name</label><input type="text" id="lg-name" class="grow" value="${esc(b.name)}" required></div>
        <div class="row"><label for="lg-when">Baked</label><input type="datetime-local" id="lg-when" value="${toLocalInput(new Date(b.bakedAt))}"></div>
        ${st.pizza ? `<div class="row"><label for="lg-oven">Oven temp you actually used (${tUnit()})</label><input type="number" id="lg-oven" value="${b.ovenActual != null ? Math.round(toDisp(b.ovenActual)) : ''}"></div>` : ''}
      </div>
      <div class="list pad">${stars('lg-rating', b.rating, 'How did it turn out?')}${st.pizza ? stars('lg-leopard', b.leopardRating, 'Leoparding') : ''}</div>
      <div class="list pad"><label for="lg-notes" class="label">Notes</label>
        <textarea id="lg-notes" rows="5" placeholder="Flour brand, how the dough felt, oven behaviour, what you would change…">${esc(b.notes)}</textarea></div>
      <div class="list pad"><span class="label">Photo</span>
        ${b.photo ? `<img class="photo" src="${b.photo}" alt="Photo of this bake">` : ''}
        <div class="btns"><label class="btn" for="lg-photo">${b.photo ? 'Replace photo' : 'Add photo'}</label>${b.photo ? '<button type="button" class="btn danger" data-act="photo-remove">Remove</button>' : ''}</div>
        <input type="file" id="lg-photo" accept="image/*" hidden></div>
      <h3>Recipe saved with this bake</h3>${factsHTML(b)}
      <div class="btns sticky-actions"><button class="btn primary" type="submit">Save bake</button><button type="button" class="btn" data-go="${logId ? 'log-detail' : 'calc'}">Cancel</button></div>
    </form>`;
  },

  'log-detail': async () => {
    const b = await getBake(logId);
    if (!b) return '<p class="note">This bake no longer exists.</p>';
    return `<article class="bake-detail">
      ${b.photo ? `<img class="photo" src="${b.photo}" alt="Photo of ${esc(b.name)}">` : ''}
      <h2>${esc(b.name)}</h2>
      <p class="muted">${esc(fmtDate(b.bakedAt))} · ${esc(b.styleName)}</p>
      <div class="pills-row">${b.rating ? `<span class="pill-s">Result <b class="stars-txt">${starText(b.rating)}</b></span>` : ''}
        ${b.leopardRating ? `<span class="pill-s">Leoparding <b class="stars-txt">${starText(b.leopardRating)}</b></span>` : ''}
        ${b.leopardScore != null ? `<span class="pill-s">Coach score <b>${b.leopardScore}</b></span>` : ''}
        ${b.ovenActual != null ? `<span class="pill-s">Oven <b>${tempStr(b.ovenActual)}</b></span>` : ''}</div>
      ${b.notes ? `<section class="card"><h3>Notes</h3><p class="pre">${esc(b.notes)}</p></section>` : ''}
      <h3>Recipe</h3>${factsHTML(b)}
      <div class="btns"><button class="btn primary" data-act="bake-use">Use this recipe</button><button class="btn" data-act="bake-edit">Edit</button>
        <button class="btn danger" data-act="bake-delete">Delete</button></div>
    </article>`;
  },
};

function factsHTML(b) {
  const sum = b.summary;
  return `<section class="card"><h3>Ingredients · ${Math.round(sum.dough)} g</h3><table>${sum.rows.map(x =>
    `<tr><td>${esc(x.name)} <span class="muted">${round(x.pct, x.pct < 1 ? 2 : 1)}%</span></td><td>${grams(x.g)}</td></tr>`).join('')}</table>
    ${sum.preferment ? `<p class="note">${sum.preferment.kind === 'poolish' ? 'Poolish' : 'Biga'}: ${grams(sum.preferment.flour)} flour, ${grams(sum.preferment.water)} water, ${grams(sum.preferment.yeast)} yeast.</p>` : ''}
    ${sum.levain ? `<p class="note">Levain: ${grams(sum.levain.flour)} flour, ${grams(sum.levain.water)} water.</p>` : ''}</section>
    <section class="card"><h3>Process</h3><table>${recipeFacts(b).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></section>`;
}

async function saveLogForm() {
  const b = logDraft;
  b.name = $('#lg-name').value.trim() || b.name;
  if ($('#lg-when').value) b.bakedAt = new Date($('#lg-when').value).getTime();
  const oven = $('#lg-oven');
  if (oven && oven.value !== '') b.ovenActual = round(fromDisp(Number(oven.value)), 1);
  b.rating = Number(document.querySelector('input[name="lg-rating"]:checked')?.value || 0);
  b.leopardRating = Number(document.querySelector('input[name="lg-leopard"]:checked')?.value || 0);
  b.notes = $('#lg-notes').value;
  try { await putBake(b); toast('Bake saved'); }
  catch (e) { toast(e.message); }
  logId = b.id; logDraft = null; view = 'log-detail'; render(); window.scrollTo(0, 0);
}

async function exportBakes() {
  const all = await listBakes();
  if (!all.length) { toast('No bakes to export yet'); return; }
  const blob = new Blob([JSON.stringify({ app: 'impasto', version: 1, exportedAt: Date.now(), bakes: all }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `impasto-bakes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`Exported ${all.length} bake${all.length === 1 ? '' : 's'}`);
}

// ---------- Tools & lab ----------
const num = id => Number(document.getElementById(id)?.value);
function updateTools() {
  const from = $('#ty-from').value, g = num('ty-g');
  $('#ty-out').textContent = Object.values(LEAVENERS).filter(l => !l.sourdough && l.short !== from)
    .map(l => `${grams(convertYeast(g, from, l.short))} ${l.short}`).join(' · ');
  const shape = $('#tp-shape').value;
  $('#tp-rect').hidden = shape !== 'rect'; $('#tp-round').hidden = shape !== 'round';
  const p = panDough({ shape, length: num('tp-l'), width: num('tp-w'), diameter: num('tp-d'), factor: num('tp-f') });
  $('#tp-out').textContent = `${Math.round(p.grams)} g (${Math.round(p.area)} cm²)`;
  $('#tp-out').dataset.g = Math.round(p.grams);
  const fr = S().unit === 'F' ? num('tw-x') * 5 / 9 : num('tw-x');
  const w = waterTemp({ target: fromDisp(num('tw-t')), room: fromDisp(num('tw-r')), flour: fromDisp(num('tw-f')), friction: fr });
  $('#tw-out').textContent = tempStr(w);
}
function updateLab() {
  const ratio = [num('lb-a') || 1, num('lb-b') || 0, num('lb-c') || 0];
  const b = levainBuild({ target: num('lb-t'), ratio, starterHydration: num('lb-h'), temp: fromDisp(num('lb-temp')) });
  $('#lb-out').innerHTML = `<tr><td>Starter</td><td>${grams(b.starter)}</td></tr><tr><td>Flour</td><td>${grams(b.flour)}</td></tr>
    <tr><td>Water</td><td>${grams(b.water)}</td></tr><tr><td>Levain hydration</td><td>${Math.round(b.hydration)}%</td></tr>
    <tr><td>Ready (at peak) in about</td><td>${fmtHours(b.peakHours)}</td></tr>`;
  const t = fromDisp(num('bk-t'));
  $('#bk-out').innerHTML = `<tr><td>Bulk fermentation</td><td>≈ ${fmtHours(bulkHours({ levainPct: num('bk-l'), doughTemp: t }))}</td></tr>
    <tr><td>Aliquot jar target rise</td><td>${aliquotRise(t)}%</td></tr>`;
  const sc = convertStarter({ mass: num('sc-m'), from: num('sc-f'), to: num('sc-t') });
  $('#sc-out').textContent = sc.addFlour ? `${grams(sc.addFlour)} flour → ${grams(sc.total)}` : `${grams(sc.addWater)} water → ${grams(sc.total)}`;
}

// ---------- Save / share recipes ----------
function encodeRecipe() {
  const payload = { v: 1, style: state.style, r: R(), s: S() };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function applyRecipe(style, r, s) {
  if (!STYLES[style]) return false;
  state.style = style;
  state.recipes[style] = { ...freshRecipe(style), ...structuredClone(r) };
  state.settings = { ...DEFAULT_SETTINGS, ...structuredClone(s), theme: state.settings.theme, keepAwake: state.settings.keepAwake, unit: state.settings.unit };
  persist(); return true;
}
function decodeRecipe(str) {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))));
    return applyRecipe(p.style, p.r, p.s);
  } catch { return false; }
}
function shareText() {
  const out = computeDough(calcInput(), S());
  const lines = [`${ST().name}: ${R().balls} × ${R().ballWeight} g · ${R().hydration}% water · ${R().salt}% salt`];
  if (out.preferment) lines.push(`${out.preferment.kind}: flour ${grams(out.preferment.flour)}, water ${grams(out.preferment.water)}, yeast ${grams(out.preferment.yeast)}`);
  ingredientRows(out, R(), ST()).forEach(x => lines.push(`${x.name}: ${grams(x.g)}`));
  return lines.join('\n');
}
async function share() {
  const url = `${location.origin}${location.pathname}?r=${encodeRecipe()}`;
  const text = shareText();
  try { if (navigator.share) { await navigator.share({ title: 'Impasto recipe', text, url }); return; } }
  catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Recipe and link copied'); }
  catch { view = 'shared'; await render(); const ta = $('#share-text'); ta.value = `${text}\n${url}`; ta.focus(); ta.select(); }
}

// ---------- Events ----------
const p0 = o => `${o.presets.neapolitan.ovenTemp} °C, ${o.presets.neapolitan.bakeSeconds} s for Neapolitan`;
function go(v) { view = v; $('#menu').hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); render(); window.scrollTo(0, 0); }

document.addEventListener('click', async e => {
  const t = e.target.closest('button, a');
  const menu = $('#menu');
  if (!e.target.closest('#menu') && !e.target.closest('#btn-menu') && !menu.hidden) { menu.hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); }
  if (!t) return;
  if (t.id === 'btn-menu') { menu.hidden = !menu.hidden; t.setAttribute('aria-expanded', String(!menu.hidden)); return; }
  if (t.id === 'brand') { e.preventDefault(); go('calc'); return; }
  if (t.dataset.go) { e.preventDefault(); if (t.dataset.go === 'calc' || t.dataset.go === 'log') logDraft = null; go(t.dataset.go); return; }
  if (t.dataset.style) { state.style = t.dataset.style; persist(); render(); return; }
  if (t.dataset.yeast) { R().yeastType = t.dataset.yeast; persist(); renderCalc(); return; }
  if (t.dataset.unit) { S().unit = t.dataset.unit; persist(); render(); return; }
  if (t.dataset.sethyd) { setValue('hydration', t.dataset.sethyd); toast(`Water set to ${t.dataset.sethyd}%`); return; }
  if (t.dataset.load != null) { const it = savedList()[+t.dataset.load]; if (it && decodeRecipe(it.data)) { go('calc'); toast(`Opened “${it.name}”`); } return; }
  if (t.dataset.del != null) { const l = savedList(); const [it] = l.splice(+t.dataset.del, 1); setSaved(l); render(); toast(`Deleted “${it.name}”`); return; }
  if (t.dataset.openBake) { logId = t.dataset.openBake; go('log-detail'); return; }
  if (t.id === 'tp-use') { R().ballWeight = Number($('#tp-out').dataset.g) || R().ballWeight; persist(); go('calc'); toast('Weight applied'); return; }
  const act = t.dataset.act;
  if (!act) return;
  menu.hidden = true;
  if (act === 'save') { go('open'); const n = $('#save-name'); n.focus(); n.select(); }
  else if (act === 'share') share();
  else if (act === 'log-new') { logDraft = newBakeFromCurrent(); logId = null; go('log-edit'); }
  else if (act === 'export') exportBakes();
  else if (act === 'photo-remove') { logDraft.photo = null; render(); }
  else if (act === 'bake-edit') { logDraft = structuredClone(await getBake(logId)); go('log-edit'); }
  else if (act === 'bake-use') {
    const b = await getBake(logId);
    if (b && applyRecipe(b.style, b.recipe, b.settings)) { go('calc'); toast(`Loaded the recipe from “${b.name}”`); }
  } else if (act === 'bake-delete' || act === 'reset') {
    if (!t.dataset.armed) {
      const label = t.textContent; t.dataset.armed = '1'; t.textContent = act === 'reset' ? `Tap again to reset ${ST().name}` : 'Tap again to delete';
      setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.textContent = label; } }, 4000);
      return;
    }
    if (act === 'reset') { state.recipes[state.style] = freshRecipe(state.style); persist(); render(); toast(`${ST().name} reset to defaults`); }
    else { await deleteBake(logId); logId = null; go('log'); toast('Bake deleted'); }
  }
});

document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.steps button'); if (!b) return;
  e.preventDefault();
  const st = b.closest('.steps'); const dir = Number(b.dataset.dir);
  const fire = () => st.dataset.flour != null ? bumpFlour(+st.dataset.flour, dir) : bump(st.dataset.key, dir);
  fire(); stopHold();
  if (st.dataset.flour == null) holdTimer = setTimeout(() => { holdTimer = setInterval(fire, 70); }, 420);
});
document.addEventListener('keydown', e => {
  const b = e.target.closest?.('.steps button');
  if (b && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault(); const st = b.closest('.steps'); const dir = Number(b.dataset.dir);
    st.dataset.flour != null ? bumpFlour(+st.dataset.flour, dir) : bump(st.dataset.key, dir);
  }
  const inp = e.target.closest?.('input.val[data-key]');
  if (inp && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); bump(inp.dataset.key, e.key === 'ArrowUp' ? 1 : -1); }
  if (inp && e.key === 'Enter') inp.blur();
  if (e.key === 'Escape') $('#menu').hidden = true;
});
document.addEventListener('focusin', e => { if (e.target.matches('input.val')) e.target.select(); });

document.addEventListener('submit', async e => {
  e.preventDefault();
  if (e.target.id === 'save-form') {
    const name = $('#save-name').value.trim() || ST().name;
    const l = savedList(); l.unshift({ name, style: state.style, at: Date.now(), data: encodeRecipe() }); setSaved(l);
    render(); toast(`Saved “${name}”`);
  } else if (e.target.id === 'log-form') saveLogForm();
});

document.addEventListener('change', async e => {
  const el = e.target;
  if (el.matches('input.val[data-key]')) { setValue(el.dataset.key, el.value); return; }
  if (el.matches('input.val[data-flour]')) { const f = R().flours[+el.dataset.flour]; f.pct = Math.min(100, Math.max(0, Number(el.value.replace(/[^\d.]/g, '')) || 0)); persist(); renderCalc(); return; }
  if (el.dataset.flourName != null) { R().flours[+el.dataset.flourName].name = el.value.trim() || `Flour ${+el.dataset.flourName + 1}`; persist(); renderResults(); return; }
  if (el.dataset.rtoggle) { R()[el.dataset.rtoggle] = el.checked; persist(); renderCalc(); return; }
  if (el.id === 'bake-at') { bakeAt = el.value ? new Date(el.value).getTime() : null; renderResults(); return; }
  if (el.id === 'lg-photo' && el.files[0]) {
    try {
      // keep typed edits before re-rendering
      logDraft.name = $('#lg-name').value; logDraft.notes = $('#lg-notes').value;
      logDraft.rating = Number(document.querySelector('input[name="lg-rating"]:checked')?.value || 0);
      logDraft.leopardRating = Number(document.querySelector('input[name="lg-leopard"]:checked')?.value || 0);
      logDraft.photo = await shrinkPhoto(el.files[0]); render();
    } catch (err) { toast(err.message); }
    return;
  }
  if (el.id === 'log-import' && el.files[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      const n = await importBakes(Array.isArray(data) ? data : data.bakes || []);
      toast(n ? `Imported ${n} bake${n === 1 ? '' : 's'}` : 'No bakes found in that file'); render();
    } catch { toast('That file is not an Impasto export.'); }
    return;
  }
  if (el.dataset.setting) {
    const k = el.dataset.setting;
    S()[k] = el.type === 'checkbox' ? el.checked : (k === 'theme' || k === 'oven' ? el.value : Number(el.value));
    if (k === 'oven') {
      const o = OVENS[el.value];
      for (const [style, p] of Object.entries(o.presets)) Object.assign(state.recipes[style], p);
      toast(`Oven set: ${o.name.split(' (')[0]}, ${p0(o)}`);
    }
    if (k === 'biga' && el.checked) S().poolish = false;
    if (k === 'poolish' && el.checked) S().biga = false;
    persist();
    if (k === 'keepAwake') applyWakeLock();
    if (k === 'theme') applyTheme();
    if (k === 'biga' || k === 'poolish') render();
  }
});
let qTimer = null;
document.addEventListener('input', e => {
  if (view === 'tools' && e.target.closest('.page')) updateTools();
  if (view === 'sourdough' && e.target.closest('.page')) updateLab();
  if (e.target.id === 'log-q') {
    logQuery = e.target.value; clearTimeout(qTimer);
    qTimer = setTimeout(async () => { await render(); const q = $('#log-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 200);
  }
});

// ---------- Boot ----------
$('#btn-log').innerHTML = `${ICON.book}<span>Bake log</span>`;
$('#btn-menu').innerHTML = ICON.menu;
const params = new URLSearchParams(location.search);
if (params.get('r')) {
  if (decodeRecipe(params.get('r'))) setTimeout(() => toast('Shared recipe loaded'), 300);
  history.replaceState(null, '', location.pathname);
}
render();
applyWakeLock();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
