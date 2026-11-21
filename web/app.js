import {
  LEAVENERS, computeDough, convertYeast, panDough, waterTemp, cToF, fToC,
  levainBuild, convertStarter, bulkHours, aliquotRise, starterPeakHours,
} from './engine.js';
import { GLOSSARY } from './glossary.js';

const VERSION = '1.0';
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
};

export const STYLES = {
  neapolitan: {
    name: 'Neapolitan', piece: 'Dough balls', weight: 'Ball weight', rt1: 'RT leavening', stages: 1,
    range: [55, 70], defaults: {},
  },
  roman: {
    name: 'Roman pan', piece: 'Pans', weight: 'Dough per pan', rt1: 'RT before fridge', rt2: 'RT after fridge', stages: 3,
    range: [70, 90], forceFat: true, forceCold: true, fatLabel: 'Oil',
    defaults: { ballWeight: 600, hydration: 80, salt: 2.5, fat: 3, rt1Hours: 2, ctHours: 48, rt2Hours: 3, yeastType: 'IDY' },
  },
  focaccia: {
    name: 'Focaccia', piece: 'Trays', weight: 'Dough per tray', rt1: 'Bulk (RT)', rt2: 'Proof in tray', stages: 3,
    range: [65, 85], forceFat: true, fatLabel: 'Olive oil',
    defaults: { ballWeight: 800, hydration: 75, salt: 2.5, fat: 5, rt1Hours: 3, rt2Hours: 2, ctHours: 18, yeastType: 'IDY' },
  },
  baguette: {
    name: 'Baguette', piece: 'Baguettes', weight: 'Weight each', rt1: 'Bulk (RT)', rt2: 'Final proof', stages: 2,
    range: [65, 78],
    defaults: { balls: 3, ballWeight: 350, hydration: 70, salt: 2, rt1Hours: 3, rt2Hours: 1, rtTemp: 22, yeastType: 'CY', poolishPct: 40, poolishHours: 12 },
  },
  bread: {
    name: 'Sourdough loaf', piece: 'Loaves', weight: 'Weight each', rt1: 'Bulk (RT)', rt2: 'Final proof', stages: 3,
    range: [65, 90], forceCold: true,
    defaults: { ballWeight: 900, hydration: 75, salt: 2, rt1Hours: 5, rt2Hours: 1, ctHours: 14, rtTemp: 24, yeastType: 'LSD', starterHydration: 100 },
  },
};

const DEFAULT_SETTINGS = {
  twoSizes: false, floursCount: 1, fats: false, sugar: false, ct: false,
  oldDoughIn: false, oldDoughOut: false, biga: false, poolish: false,
  wastage: 0, keepAwake: false, unit: 'C', theme: 'auto',
};

const freshRecipe = key => structuredClone({ ...BASE, ...STYLES[key].defaults });

// ---------- State ----------
let state = load() || { style: 'neapolitan', recipes: {}, settings: { ...DEFAULT_SETTINGS } };
state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
for (const k of Object.keys(STYLES)) state.recipes[k] = { ...freshRecipe(k), ...(state.recipes[k] || {}) };
if (!STYLES[state.style]) state.style = 'neapolitan';
let view = 'calc';

function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } }
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }
function savedList() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } }
function setSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch {} }

const S = () => state.settings;
const R = () => state.recipes[state.style];
const ST = () => STYLES[state.style];
// Recipe plus the style's always-on features, as the engine expects it.
const calcInput = () => ({ ...R(), forceFat: !!ST().forceFat, forceCold: !!ST().forceCold });

// ---------- Helpers ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round = (v, d) => Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : 0;
function grams(v) {
  if (!Number.isFinite(v)) return '–';
  if (v >= 50) return `${Math.round(v)} g`;
  if (v >= 10) return `${round(v, 1)} g`;
  if (v >= 1) return `${round(v, 1)} g`;
  return `${round(v, 2)} g`;
}
const tUnit = () => `°${S().unit}`;
const toDisp = c => S().unit === 'F' ? cToF(c) : c;
const fromDisp = v => S().unit === 'F' ? fToC(v) : v;
const fmtHours = h => h >= 10 ? `${Math.round(h)} h` : `${round(h, 1)} h`;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
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
  const temp = (key, label) => ({ key, label, step: 1, min: S().unit === 'F' ? 33 : 1, max: S().unit === 'F' ? 104 : 40, temp: true, fmt: v => `${Math.round(v)}°` });
  const out = [
    { key: 'balls', label: st.piece, step: 1, min: 1, max: 999, fmt: v => `${v}` },
    { key: 'ballWeight', label: st.weight, step: 5, min: 10, max: 20000, fmt: v => `${v}g` },
  ];
  if (s.twoSizes) out.push(
    { key: 'balls2', label: `${st.piece} (size 2)`, step: 1, min: 0, max: 999, fmt: v => `${v}` },
    { key: 'ballWeight2', label: `${st.weight} (size 2)`, step: 5, min: 10, max: 20000, fmt: v => `${v}g` },
  );
  out.push(
    { key: 'hydration', label: 'Water', full: true, step: 1, min: 40, max: 120, fmt: v => `${v}%`, range: st.range, info: 'water' },
    { key: 'salt', label: 'Salt', full: true, step: 0.1, min: 0, max: 5, fmt: v => `${round(v, 1)}%`, range: [1.8, 3.2], info: 'salt' },
  );
  if (s.fats || st.forceFat) out.push({ key: 'fat', label: st.fatLabel || 'Fat / oil', full: true, step: 0.5, min: 0, max: 20, fmt: v => `${round(v, 1)}%` });
  if (s.sugar) out.push({ key: 'sugar', label: 'Sugar / malt', full: true, step: 0.5, min: 0, max: 20, fmt: v => `${round(v, 1)}%` });

  out.push({ sub: 'Fermentation' });
  out.push({ key: 'rt1Hours', label: st.rt1, step: 1, min: 1, max: 72, fmt: v => `${v}h` }, { ...temp('rtTemp', 'RT'), unitLabel: true });
  if (s.ct || st.forceCold) out.push({ key: 'ctHours', label: 'Fridge (CT)', step: 1, min: 0, max: 120, fmt: v => `${v}h` }, { ...temp('ctTemp', 'CT'), unitLabel: true });
  if (st.rt2) out.push({ key: 'rt2Hours', label: st.rt2, step: 0.5, min: 0, max: 24, fmt: v => `${v}h` });
  out.push({ yeast: true });
  if (lv.sourdough) {
    out.push({ key: 'starterHydration', label: 'Starter hydration', step: 5, min: 40, max: 200, fmt: v => `${v}%` });
    out.push({ toggle: 'levainManual', label: 'Set levain by hand' });
    if (r.levainManual) out.push({ key: 'levainPct', label: 'Levain (% of flour)', full: true, step: 1, min: 1, max: 60, fmt: v => `${v}%` });
  }

  if (s.floursCount > 1) {
    out.push({ sub: 'Flour blend' });
    for (let i = 0; i < s.floursCount; i++) out.push({ flour: i });
  }
  if (s.poolish) { out.push({ sub: 'Poolish' }); out.push({ key: 'poolishPct', label: 'Flour in poolish', step: 5, min: 5, max: 100, fmt: v => `${v}%` }, { key: 'poolishHours', label: 'Poolish time', step: 1, min: 2, max: 24, fmt: v => `${v}h` }); }
  else if (s.biga) { out.push({ sub: 'Biga' }); out.push({ key: 'bigaPct', label: 'Flour in biga', step: 5, min: 5, max: 100, fmt: v => `${v}%` }, { key: 'bigaHydration', label: 'Biga water', step: 1, min: 40, max: 60, fmt: v => `${v}%` }); }
  if (s.oldDoughIn || s.oldDoughOut) out.push({ sub: 'Old dough' });
  if (s.oldDoughIn) out.push({ key: 'oldDoughIn', label: 'Old dough in', step: 1, min: 1, max: 50, fmt: v => `${v}%` });
  if (s.oldDoughOut) out.push({ key: 'oldDoughOut', label: 'Keep for next time', step: 1, min: 1, max: 50, fmt: v => `${v}%` });
  return out;
}

function valueOf(def) { const v = R()[def.key]; return def.temp ? Math.round(toDisp(v)) : v; }

function stepperHTML(d) {
  const v = valueOf(d);
  const lbl = d.unitLabel ? `${esc(d.label)} <span style="color:var(--brand)">${tUnit()}</span>` : esc(d.label);
  const info = d.info ? ` <button class="info" data-info="${d.info}" aria-label="About ${esc(d.label)}">ⓘ</button>` : '';
  return `<div class="field${d.full ? ' full' : ''}">
    <div class="label" id="lbl-${d.key}">${lbl}${info}</div>
    <div class="stepper" data-key="${d.key}">
      <button type="button" data-dir="-1" aria-label="Decrease ${esc(d.label)}">−</button>
      <input inputmode="decimal" aria-labelledby="lbl-${d.key}" value="${esc(d.fmt(v))}" data-key="${d.key}">
      <button type="button" data-dir="1" aria-label="Increase ${esc(d.label)}">+</button>
    </div></div>`;
}

function renderCalc() {
  const r = R();
  const defs = fieldDefs();
  const html = defs.map(d => {
    if (d.sub) return `<div class="subhead">${esc(d.sub)}</div>`;
    if (d.yeast) return `<div class="field full"><div class="seg-row"><span class="label">Leavening</span>
      <div class="seg" role="group" aria-label="Leavening">${Object.values(LEAVENERS).map(l =>
        `<button type="button" data-yeast="${l.short}" aria-pressed="${r.yeastType === l.short}" title="${esc(l.label)}">${l.short}</button>`).join('')}</div></div></div>`;
    if (d.toggle) return `<div class="field full"><div class="seg-row"><span class="label">${esc(d.label)}</span>
      <label class="switch"><input type="checkbox" data-rtoggle="${d.toggle}" ${r[d.toggle] ? 'checked' : ''} aria-label="${esc(d.label)}"><span></span></label></div></div>`;
    if (d.flour != null) {
      const f = r.flours[d.flour];
      return `<div class="field"><input type="text" class="flour-name" data-flour-name="${d.flour}" value="${esc(f.name)}" aria-label="Flour ${d.flour + 1} name" style="text-align:center;border:0;background:none;color:var(--muted)">
        <div class="stepper" data-flour="${d.flour}"><button type="button" data-dir="-1" aria-label="Less">−</button>
        <input inputmode="decimal" value="${f.pct}%" data-flour="${d.flour}" aria-label="${esc(f.name)} percent"><button type="button" data-dir="1" aria-label="More">+</button></div></div>`;
    }
    return stepperHTML(d);
  }).join('');
  $('#view').innerHTML = `<div class="calc"><section class="fields" aria-label="Recipe">${html}</section><section class="results" id="results" aria-live="polite"></section></div>`;
  defs.filter(d => d.range).forEach(d => { const i = document.querySelector(`.stepper input[data-key="${d.key}"]`); if (i) colorRange(i, d); });
  renderResults();
}

function renderResults() {
  const r = R(), s = S(), st = ST();
  const out = computeDough(calcInput(), s);
  const lv = LEAVENERS[r.yeastType];
  const pills = [];
  if (out.flours.length > 1) out.flours.forEach(f => pills.push([f.name, grams(f.grams)]));
  else pills.push(['Flour', grams(out.flour)]);
  pills.push(['Water', grams(out.water)], ['Salt', grams(out.salt)]);
  if (lv.sourdough) pills.push([`Levain ${round(out.levain.pct, 1)}%`, grams(out.levain.mass)]);
  else pills.push([`Yeast · ${lv.short}`, grams(out.yeast)]);
  if (out.fat > 0) pills.push([st.fatLabel || 'Fat', grams(out.fat)]);
  if (out.sugar > 0) pills.push(['Sugar', grams(out.sugar)]);
  if (out.oldDough) pills.push(['Old dough', grams(out.oldDough.mass)]);

  let html = `<h2>${out.preferment ? 'Main dough' : 'Main dough doses'} <b>${grams(out.dough)}</b></h2>
    <div class="pills">${pills.map(([k, v]) => `<div class="pill">${v}<small>${esc(k)}</small></div>`).join('')}</div>`;

  if (out.preferment) {
    const p = out.preferment;
    html += `<div class="card"><h3>${p.kind === 'poolish' ? 'Poolish' : 'Biga'} — make first${p.hours ? `, ${p.hours} h ahead` : ''}</h3><table>
      <tr><td>Flour</td><td>${grams(p.flour)}</td></tr><tr><td>Water</td><td>${grams(p.water)}</td></tr>
      <tr><td>Yeast (${p.yeastType})</td><td>${grams(p.yeast)}</td></tr><tr><td>Total</td><td>${grams(p.total)}</td></tr></table>
      <p class="note">Then add all of the ${p.kind} to the main dough above.</p></div>`;
  }
  if (out.levain) {
    const L = out.levain;
    html += `<div class="card"><h3>Levain</h3><table>
      <tr><td>Levain at ${round(L.hydration, 0)}% hydration</td><td>${grams(L.mass)}</td></tr>
      <tr><td>…of which flour</td><td>${grams(L.flour)}</td></tr><tr><td>…of which water</td><td>${grams(L.water)}</td></tr>
      ${out.levainHours ? `<tr><td>Fermentation it supports at ${Math.round(toDisp(r.rtTemp))}${tUnit()}</td><td>≈ ${fmtHours(out.levainHours)}</td></tr>` : ''}
      </table><p class="note">Flour and water in the levain are already counted in the dough's hydration. Plan the build in the <a href="#" data-go="sourdough">Sourdough lab</a>.</p></div>`;
  }
  const totalFlour = out.flourTotal;
  html += `<div class="card"><h3>Formula</h3><table>
    <tr><td>Total flour (incl. levain/pre-ferment)</td><td>${grams(totalFlour)}</td></tr>
    <tr><td>Total water</td><td>${grams(totalFlour * r.hydration / 100)}</td></tr>
    <tr><td>Fermentation, as hours at RT</td><td>${fmtHours(out.hours)}</td></tr>
    <tr><td>Fresh-yeast equivalent</td><td>${round(out.yeastPctCY, 3)}%</td></tr>
    ${out.oldDoughOut ? `<tr><td>Set aside for next batch</td><td>${grams(out.oldDoughOut)}</td></tr>` : ''}
    ${s.wastage ? `<tr><td>Wastage allowance</td><td>${s.wastage}%</td></tr>` : ''}
    </table>${out.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('')}</div>`;

  html += scheduleHTML(out);
  $('#results').innerHTML = html;
}

// ---------- Schedule ----------
let bakeAt = null;
function scheduleHTML(out) {
  const r = R(), s = S(), st = ST();
  const steps = [];
  if (out.levain) steps.push(['Build levain', starterPeakHours({ ratio: [1, 2, 2], temp: r.rtTemp })]);
  if (out.preferment) steps.push([`Mix ${out.preferment.kind}`, out.preferment.kind === 'poolish' ? r.poolishHours : 16]);
  steps.push([`Mix dough · ${st.rt1}`, r.rt1Hours]);
  if (s.ct || st.forceCold) steps.push(['Into the fridge', r.ctHours]);
  if (st.rt2 && r.rt2Hours > 0) steps.push([st.rt2, r.rt2Hours]);
  steps.push(['Bake', 0]);
  const total = steps.reduce((a, [, h]) => a + h, 0);
  const end = bakeAt ? new Date(bakeAt) : null;
  let t = end ? new Date(end.getTime() - total * 3600e3) : null;
  const fmt = d => d.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const rows = steps.map(([name, h]) => {
    const cell = t ? fmt(t) : '';
    if (t) t = new Date(t.getTime() + h * 3600e3);
    return `<tr><td>${esc(name)}${h ? ` <span class="note">(${fmtHours(h)})</span>` : ''}</td><td>${cell}</td></tr>`;
  }).join('');
  const val = bakeAt ? toLocalInput(new Date(bakeAt)) : '';
  return `<div class="card"><h3>Plan</h3>
    <div class="seg-row" style="margin-bottom:8px"><label for="bake-at" class="note" style="margin:0">Bake at</label>
    <input type="datetime-local" id="bake-at" value="${val}" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div>
    <table>${rows}</table><p class="note">Total ≈ ${fmtHours(total)}${bakeAt ? '' : '. Pick a bake time to see when to start each step.'}</p></div>`;
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
  v = Math.min(d.max, Math.max(d.min, v));
  v = round(v, 2);
  R()[key] = d.temp ? round(fromDisp(v), 2) : v;
  persist();
  const input = document.querySelector(`.stepper input[data-key="${key}"]`);
  if (input) { input.value = d.fmt(valueOf(d)); colorRange(input, d); }
  renderResults();
}
function colorRange(input, d) {
  input.classList.remove('ok', 'off');
  if (!d.range) return;
  const v = valueOf(d);
  input.classList.add(v >= d.range[0] && v <= d.range[1] ? 'ok' : 'off');
}
function bump(key, dir) { const d = findDef(key); setValue(key, valueOf(d) + dir * d.step); }
function bumpFlour(i, dir) { const f = R().flours[i]; f.pct = Math.min(100, Math.max(0, f.pct + dir * 5)); persist(); renderCalc(); }

// Press-and-hold repeat for stepper buttons.
let holdTimer = null;
function stopHold() { clearTimeout(holdTimer); clearInterval(holdTimer); holdTimer = null; }
document.addEventListener('pointerup', stopHold);
document.addEventListener('pointercancel', stopHold);

// ---------- Views ----------
function renderTabs() {
  const tabs = $('#tabs');
  tabs.hidden = view !== 'calc';
  tabs.innerHTML = Object.entries(STYLES).map(([k, st]) =>
    `<button role="tab" data-style="${k}" aria-selected="${k === state.style}">${esc(st.name)}</button>`).join('');
}

function render() {
  renderTabs();
  $('#title').innerHTML = view === 'calc' ? `Impasto <small>${VERSION}</small>` : esc(PAGE_TITLES[view] || 'Impasto');
  $('#saved-count').textContent = savedList().length;
  if (view === 'calc') renderCalc();
  else $('#view').innerHTML = `<div class="page"><button class="btn ghost back" data-go="calc">← Calculator</button>${PAGES[view]()}</div>`;
  if (view === 'tools') updateTools();
  if (view === 'sourdough') updateLab();
  applyTheme();
}

const PAGE_TITLES = { settings: 'Settings', tools: 'Tools', sourdough: 'Sourdough lab', glossary: 'Glossary', about: 'About', open: 'Saved recipes', help: 'How to use' };

const toggleRow = (key, label, hint = '') => `<div class="row"><span>${esc(label)}</span>
  <label class="switch"><input type="checkbox" data-setting="${key}" ${S()[key] ? 'checked' : ''} aria-label="${esc(label)}"><span></span></label>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;

const PAGES = {
  settings: () => `<div class="list">
    ${toggleRow('twoSizes', 'Two piece sizes')}
    <div class="row"><span>Number of flours</span><select data-setting="floursCount">${[1, 2, 3].map(n => `<option ${S().floursCount == n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${toggleRow('fats', 'Fats / oil', 'Always on for Roman and focaccia.')}
    ${toggleRow('sugar', 'Sugar / malt')}
    ${toggleRow('ct', 'Cold fermentation (CT)', 'Always on for Roman and sourdough loaf.')}
    ${toggleRow('oldDoughIn', 'Old dough in')}
    ${toggleRow('oldDoughOut', 'Old dough out')}
    ${toggleRow('biga', 'Biga', 'Stiff pre-ferment. Off when poolish is on.')}
    ${toggleRow('poolish', 'Poolish', 'Liquid pre-ferment.')}
    <div class="row"><span>Wastage</span><select data-setting="wastage">${[0, 1, 2, 3, 4, 5, 7, 10].map(n => `<option value="${n}" ${S().wastage == n ? 'selected' : ''}>${n}%</option>`).join('')}</select></div>
    ${toggleRow('keepAwake', 'Keep screen on')}
    <div class="row"><span>Temperature</span><div class="seg" style="flex:0 0 120px">${['C', 'F'].map(u => `<button data-unit="${u}" aria-pressed="${S().unit === u}">°${u}</button>`).join('')}</div></div>
    <div class="row"><span>Appearance</span><select data-setting="theme">${['auto', 'light', 'dark'].map(t => `<option value="${t}" ${S().theme === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
    </div>
    <p style="margin-top:16px"><button class="btn danger" data-act="reset">Reset ${esc(ST().name)} to defaults</button></p>`,

  tools: () => `
    <h3>Yeast converter</h3>
    <div class="list"><div class="row"><input type="number" id="ty-g" value="10" min="0" step="0.1" aria-label="Grams"> g
      <select id="ty-from" aria-label="From">${Object.values(LEAVENERS).filter(l => !l.sourdough).map(l => `<option value="${l.short}">${l.label}</option>`).join('')}</select></div>
      <div class="row"><span>Equals</span><span class="tool-out" id="ty-out"></span></div></div>

    <h3>Dough for a pan</h3>
    <div class="list">
      <div class="row"><span>Shape</span><select id="tp-shape"><option value="rect">Rectangular</option><option value="round">Round</option></select></div>
      <div class="row" id="tp-rect"><span>Size (cm)</span><span><input type="number" id="tp-l" value="40" style="width:70px" aria-label="Length"> × <input type="number" id="tp-w" value="30" style="width:70px" aria-label="Width"></span></div>
      <div class="row" id="tp-round" hidden><span>Diameter (cm)</span><input type="number" id="tp-d" value="28" aria-label="Diameter"></div>
      <div class="row"><span>Thickness factor (g/cm²)</span><input type="number" id="tp-f" value="0.55" step="0.05" aria-label="Thickness factor"><span class="hint">Roman pan 0.55–0.65 · focaccia 0.6–0.7 · thin round 0.35–0.4</span></div>
      <div class="row"><span class="tool-out" id="tp-out"></span><button class="btn" id="tp-use">Use for ${esc(ST().name)}</button></div>
    </div>

    <h3>Water temperature</h3>
    <div class="list">
      <div class="row"><span>Target dough temp (${tUnit()})</span><input type="number" id="tw-t" value="${Math.round(toDisp(24))}"></div>
      <div class="row"><span>Room (${tUnit()})</span><input type="number" id="tw-r" value="${Math.round(toDisp(22))}"></div>
      <div class="row"><span>Flour (${tUnit()})</span><input type="number" id="tw-f" value="${Math.round(toDisp(22))}"></div>
      <div class="row"><span>Mixer friction (${tUnit()})</span><input type="number" id="tw-x" value="${S().unit === 'F' ? 2 : 1}"><span class="hint">By hand ≈ 1 °C · stand mixer ≈ 5–10 °C · spiral ≈ 10–14 °C</span></div>
      <div class="row"><span>Water at</span><span class="tool-out" id="tw-out"></span></div>
    </div>`,

  sourdough: () => {
    const out = computeDough(calcInput(), S());
    const target = out.levain ? Math.ceil(out.levain.mass * 1.1) : 100;
    return `<p class="note">Tools for working with a starter. The levain target defaults to your current recipe plus 10% to allow for what sticks to the jar.</p>
    <h3>Levain build</h3>
    <div class="list">
      <div class="row"><span>Levain needed (g)</span><input type="number" id="lb-t" value="${target}"></div>
      <div class="row"><span>Ratio starter : flour : water</span><span><input type="number" id="lb-a" value="1" style="width:56px" aria-label="Starter part"> : <input type="number" id="lb-b" value="2" style="width:56px" aria-label="Flour part"> : <input type="number" id="lb-c" value="2" style="width:56px" aria-label="Water part"></span></div>
      <div class="row"><span>Starter hydration (%)</span><input type="number" id="lb-h" value="100"></div>
      <div class="row"><span>Kitchen temp (${tUnit()})</span><input type="number" id="lb-temp" value="${Math.round(toDisp(R().rtTemp))}"></div>
      <div class="row" style="display:block"><table style="width:100%" id="lb-out"></table></div>
    </div>

    <h3>Bulk fermentation estimate</h3>
    <div class="list">
      <div class="row"><span>Levain (% of flour)</span><input type="number" id="bk-l" value="${out.levain ? Math.round(out.levain.pct) : 20}"></div>
      <div class="row"><span>Dough temp (${tUnit()})</span><input type="number" id="bk-t" value="${Math.round(toDisp(24))}"></div>
      <div class="row" style="display:block"><table style="width:100%" id="bk-out"></table>
      <p class="note">Use an aliquot jar: put a small piece of dough in a straight-sided jar and end bulk when it has risen by the target. Warmer dough should rise less.</p></div>
    </div>

    <h3>Change starter hydration</h3>
    <div class="list">
      <div class="row"><span>Starter (g)</span><input type="number" id="sc-m" value="100"></div>
      <div class="row"><span>From (%)</span><input type="number" id="sc-f" value="100"></div>
      <div class="row"><span>To (%)</span><input type="number" id="sc-t" value="50"></div>
      <div class="row"><span>Add</span><span class="tool-out" id="sc-out"></span></div>
    </div>`;
  },

  glossary: () => `<dl class="gloss">${GLOSSARY.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`,

  about: () => `<p><b>Impasto ${VERSION}</b> works out dough ingredients for pizza, focaccia, baguettes and sourdough bread. It suggests how much yeast or levain to use for the time and temperature you choose.</p>
    <p>It runs offline. Install it with <i>Add to Dock</i> in Safari on macOS, <i>Add to Home Screen</i> on iPhone and iPad, or the install button in Chrome and Edge.</p>
    <p>The yeast and sourdough models are approximations. Fermentation depends on your flour, your starter and your kitchen, so treat the numbers as a starting point and adjust them. The models are described in <code>docs/formulas.md</code>.</p>
    <p class="note">An independent project, inspired by dough calculators such as PizzApp+. Not affiliated with NFP Software.</p>`,

  help: () => `<ol>
    <li>Pick a style from the tabs: Neapolitan, Roman pan, focaccia, baguette or sourdough loaf.</li>
    <li>Set the number of pieces and how much each one weighs. The <b>Dough for a pan</b> tool works out a weight from a pan size.</li>
    <li>Set the water and salt as a percentage of the flour.</li>
    <li>Set the fermentation time and temperature. The yeast or levain amount updates as you go.</li>
    <li>Pick a leavening: fresh (CY), active dry (ADY), instant (IDY), or firm (FSD) or liquid (LSD) sourdough.</li>
    <li>Turn on extras in <b>Settings</b>: a flour blend, oil, sugar, cold fermentation, biga or poolish, or old dough.</li>
    <li>Set a bake time under <b>Plan</b> to see when to start each step.</li>
    </ol><p>Tap and hold − or + to change a value quickly, or type a number straight into the box.</p>`,

  open: () => {
    const list = savedList();
    if (!list.length) return `<p class="note">No saved recipes yet. Use <b>Save</b> in the menu.</p>`;
    return `<div class="list">${list.map((it, i) => `<div class="row"><span><b>${esc(it.name)}</b><br><span class="note">${esc(STYLES[it.style]?.name || '')} · ${new Date(it.at).toLocaleDateString()}</span></span>
      <span><button class="btn" data-load="${i}">Open</button> <button class="btn danger" data-del="${i}" aria-label="Delete ${esc(it.name)}">Delete</button></span></div>`).join('')}</div>`;
  },
};

// ---------- Tools & lab live updates ----------
const num = id => Number(document.getElementById(id)?.value);
function updateTools() {
  const from = $('#ty-from').value, g = num('ty-g');
  $('#ty-out').innerHTML = Object.values(LEAVENERS).filter(l => !l.sourdough && l.short !== from)
    .map(l => `${grams(convertYeast(g, from, l.short))} ${l.short}`).join(' · ');
  const shape = $('#tp-shape').value;
  $('#tp-rect').hidden = shape !== 'rect'; $('#tp-round').hidden = shape !== 'round';
  const p = panDough({ shape, length: num('tp-l'), width: num('tp-w'), diameter: num('tp-d'), factor: num('tp-f') });
  $('#tp-out').textContent = `${Math.round(p.grams)} g (${Math.round(p.area)} cm²)`;
  $('#tp-out').dataset.g = Math.round(p.grams);
  const c = v => fromDisp(v);
  const fr = S().unit === 'F' ? num('tw-x') * 5 / 9 : num('tw-x');
  const w = waterTemp({ target: c(num('tw-t')), room: c(num('tw-r')), flour: c(num('tw-f')), friction: fr });
  $('#tw-out').textContent = `${Math.round(toDisp(w))}${tUnit()}`;
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

// ---------- Save / share ----------
function encodeRecipe() {
  const payload = { v: 1, style: state.style, r: R(), s: S() };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeRecipe(str) {
  try {
    const json = decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
    const p = JSON.parse(json);
    if (!STYLES[p.style]) return false;
    state.style = p.style;
    state.recipes[p.style] = { ...freshRecipe(p.style), ...p.r };
    state.settings = { ...DEFAULT_SETTINGS, ...p.s, theme: state.settings.theme, keepAwake: state.settings.keepAwake };
    persist(); return true;
  } catch { return false; }
}
function shareText() {
  const out = computeDough(calcInput(), S()); const lv = LEAVENERS[R().yeastType];
  const lines = [`${ST().name}: ${R().balls} × ${R().ballWeight} g · ${R().hydration}% water · ${R().salt}% salt`];
  if (out.preferment) lines.push(`${out.preferment.kind}: flour ${grams(out.preferment.flour)}, water ${grams(out.preferment.water)}, yeast ${grams(out.preferment.yeast)}`);
  out.flours.forEach(f => lines.push(`${f.name}: ${grams(f.grams)}`));
  lines.push(`Water: ${grams(out.water)}`, `Salt: ${grams(out.salt)}`);
  lines.push(lv.sourdough ? `Levain: ${grams(out.levain.mass)}` : `Yeast (${lv.short}): ${grams(out.yeast)}`);
  if (out.fat) lines.push(`${ST().fatLabel || 'Fat'}: ${grams(out.fat)}`);
  if (out.sugar) lines.push(`Sugar: ${grams(out.sugar)}`);
  return lines.join('\n');
}
async function share() {
  const url = `${location.origin}${location.pathname}?r=${encodeRecipe()}`;
  const text = shareText();
  try {
    if (navigator.share) { await navigator.share({ title: 'Impasto recipe', text, url }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Recipe and link copied'); }
  catch { prompt('Copy this link', url); }
}

// ---------- Events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, a');
  const menu = $('#menu');
  if (!e.target.closest('#menu') && !e.target.closest('#btn-menu') && !menu.hidden) { menu.hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); }
  if (!t) return;
  if (t.id === 'btn-menu') { menu.hidden = !menu.hidden; t.setAttribute('aria-expanded', String(!menu.hidden)); return; }
  if (t.id === 'btn-help') { view = 'help'; render(); return; }
  if (t.dataset.go) { e.preventDefault(); view = t.dataset.go; menu.hidden = true; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.style) { state.style = t.dataset.style; persist(); render(); return; }
  if (t.dataset.yeast) { R().yeastType = t.dataset.yeast; persist(); renderCalc(); return; }
  if (t.dataset.unit) { S().unit = t.dataset.unit; persist(); render(); return; }
  if (t.dataset.info) { toast(t.dataset.info === 'water' ? 'Water as a % of total flour (baker\'s percentage).' : 'Salt as a % of total flour.'); return; }
  if (t.dataset.load != null) { const it = savedList()[+t.dataset.load]; if (it && decodeRecipe(it.data)) { view = 'calc'; render(); toast(`Opened “${it.name}”`); } return; }
  if (t.dataset.del != null) { const l = savedList(); const [it] = l.splice(+t.dataset.del, 1); setSaved(l); render(); toast(`Deleted “${it.name}”`); return; }
  if (t.id === 'tp-use') { R().ballWeight = Number($('#tp-out').dataset.g) || R().ballWeight; persist(); view = 'calc'; render(); toast('Weight applied'); return; }
  const act = t.dataset.act;
  if (act === 'save') {
    menu.hidden = true;
    const name = prompt('Name this recipe', `${ST().name} ${new Date().toLocaleDateString()}`);
    if (!name) return;
    const l = savedList(); l.unshift({ name, style: state.style, at: Date.now(), data: encodeRecipe() }); setSaved(l);
    $('#saved-count').textContent = l.length; toast('Saved');
  } else if (act === 'share') { menu.hidden = true; share(); }
  else if (act === 'reset') { if (confirm(`Reset ${ST().name} to its defaults?`)) { state.recipes[state.style] = freshRecipe(state.style); persist(); render(); toast('Reset'); } }
});

document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.stepper button'); if (!b) return;
  e.preventDefault();
  const st = b.closest('.stepper'); const dir = Number(b.dataset.dir);
  const go = () => st.dataset.flour != null ? bumpFlour(+st.dataset.flour, dir) : bump(st.dataset.key, dir);
  go();
  stopHold();
  if (st.dataset.flour == null) holdTimer = setTimeout(() => { holdTimer = setInterval(go, 70); }, 420);
});
// Keyboard activation of stepper buttons (pointerdown handles mouse/touch).
document.addEventListener('keydown', e => {
  const b = e.target.closest?.('.stepper button');
  if (b && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault(); const st = b.closest('.stepper'); const dir = Number(b.dataset.dir);
    st.dataset.flour != null ? bumpFlour(+st.dataset.flour, dir) : bump(st.dataset.key, dir);
  }
  const inp = e.target.closest?.('.stepper input');
  if (inp && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && inp.dataset.key) { e.preventDefault(); bump(inp.dataset.key, e.key === 'ArrowUp' ? 1 : -1); }
  if (e.key === 'Escape') { $('#menu').hidden = true; }
});

document.addEventListener('focusin', e => { if (e.target.matches('.stepper input')) e.target.select(); });

document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('.stepper input[data-key]')) { setValue(el.dataset.key, el.value); return; }
  if (el.matches('.stepper input[data-flour]')) { const f = R().flours[+el.dataset.flour]; f.pct = Math.min(100, Math.max(0, Number(el.value.replace(/[^\d.]/g, '')) || 0)); persist(); renderCalc(); return; }
  if (el.dataset.flourName != null) { R().flours[+el.dataset.flourName].name = el.value.trim() || `Flour ${+el.dataset.flourName + 1}`; persist(); renderResults(); return; }
  if (el.dataset.rtoggle) { R()[el.dataset.rtoggle] = el.checked; persist(); renderCalc(); return; }
  if (el.id === 'bake-at') { bakeAt = el.value ? new Date(el.value).getTime() : null; renderResults(); return; }
  if (el.dataset.setting) {
    const k = el.dataset.setting;
    S()[k] = el.type === 'checkbox' ? el.checked : (k === 'theme' ? el.value : Number(el.value));
    if (k === 'biga' && el.checked) S().poolish = false;
    if (k === 'poolish' && el.checked) S().biga = false;
    persist();
    if (k === 'keepAwake') applyWakeLock();
    if (k === 'theme') applyTheme();
    if (k === 'biga' || k === 'poolish') render();
  }
});
document.addEventListener('input', e => {
  if (view === 'tools' && e.target.closest('.page')) updateTools();
  if (view === 'sourdough' && e.target.closest('.page')) updateLab();
});

// ---------- Boot ----------
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
