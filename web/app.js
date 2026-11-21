import {
  LEAVENERS, computeDough, convertYeast, panDough, waterTemp, cToF, fToC,
  levainBuild, convertStarter, bulkHours, aliquotRise, starterPeakHours,
} from './engine.js';
import { leopardReport, recommendHydration, LEOPARD_TECHNIQUE } from './leopard.js';
import { listBakes, getBake, putBake, deleteBake, importBakes, newId, shrinkPhoto } from './bakelog.js';
import { GLOSSARY } from './glossary.js';
import { recommendPlans, atNight } from './planner.js';
import { LIBRARY } from './recipes.js';
import { BASE, STYLES, OVENS, DEFAULT_SETTINGS, rebalanceFlours, normalizeFlours } from './presets.js';
import { t, setLang, getLang, detectLang, LANGS } from './i18n.js';
import { parseRecipe, searchLinks } from './importer.js';

const APP = 'Prozimi';
const VERSION = '1.2';
// Storage keys keep their original names so recipes and settings survive the rename.
const STORE_KEY = 'impasto:v1';
const SAVED_KEY = 'impasto:saved:v1';

const freshRecipe = (key, oven = (state?.settings?.oven || 'gas')) =>
  structuredClone({ ...BASE, ...STYLES[key].defaults, ...(OVENS[oven]?.presets[key] || {}) });

// ---------- State ----------
let state = load() || { style: 'neapolitan', recipes: {}, settings: { ...DEFAULT_SETTINGS } };
state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
if (!OVENS[state.settings.oven]) state.settings.oven = 'gas';
if (!LANGS[state.settings.lang]) state.settings.lang = detectLang(navigator.languages || [navigator.language]);
setLang(state.settings.lang);
for (const k of Object.keys(STYLES)) state.recipes[k] = { ...freshRecipe(k), ...(state.recipes[k] || {}) };
if (!STYLES[state.style]) state.style = 'neapolitan';
let view = 'calc';
let logId = null;      // bake being viewed or edited
let logDraft = null;   // unsaved bake in the editor
let logQuery = '';
let imported = null;   // last parsed recipe on the library page
let findStyle = null;  // style chosen for online search

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
    contemporary: !!st.contemporary, cold: coldOn(st, s) && r.ctHours > 0, rt2Counts: !st.rt2OnlyWithCold,
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
const tx = m => esc(t(m)); // translate + escape
const round = (v, d) => Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : 0;
const num2 = v => round(v, 2).toLocaleString(getLang());
function grams(v) {
  if (!Number.isFinite(v)) return '–';
  const d = v >= 50 ? 0 : v >= 1 ? 1 : 2;
  return `${round(v, d).toLocaleString(getLang(), { maximumFractionDigits: d, useGrouping: false })} g`;
}
const tUnit = () => `°${S().unit}`;
const toDisp = c => S().unit === 'F' ? cToF(c) : c;
const fromDisp = v => S().unit === 'F' ? fToC(v) : v;
const tempStr = c => `${Math.round(toDisp(c))}${tUnit()}`;
const fmtHours = h => t('{n} h', { n: h >= 10 ? Math.round(h) : round(h, 1) });
const fmtSec = s => t('{n} s', { n: s });
const fmtDate = ms => new Date(ms).toLocaleString(getLang(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtWhen = d => d.toLocaleString(getLang(), { weekday: 'short', hour: '2-digit', minute: '2-digit' });

const ICON = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1.2 2.6 2.5 3 0-3-1-5.5 0-8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

const THEMES = ['auto', 'light', 'dark'];
const themeName = th => ({ auto: t('Automatic'), light: t('Light'), dark: t('Dark') }[th]);
function applyTheme() {
  const th = S().theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
  const b = $('#btn-theme');
  if (b) {
    b.innerHTML = ICON[th === 'auto' ? 'auto' : th === 'light' ? 'sun' : 'moon'];
    const label = t('Appearance: {mode}. Tap to change.', { mode: themeName(th) });
    b.setAttribute('aria-label', label); b.title = label;
  }
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
  const hrs = v => fmtHours(v);
  const out = [{ sub: t('Dough') },
    { key: 'balls', label: t(st.piece), step: 1, min: 1, max: 999, fmt: v => `${v}` },
    { key: 'ballWeight', label: t(st.weight), step: 5, min: 10, max: 20000, fmt: v => `${v} g` },
  ];
  if (s.twoSizes) out.push(
    { key: 'balls2', label: t('{label} · size 2', { label: t(st.piece) }), step: 1, min: 0, max: 999, fmt: v => `${v}` },
    { key: 'ballWeight2', label: t('{label} · size 2', { label: t(st.weight) }), step: 5, min: 10, max: 20000, fmt: v => `${v} g` },
  );
  out.push(
    { key: 'hydration', label: t('Water'), step: 1, min: 40, max: 120, fmt: v => `${v}%`, range: st.range, advisor: !!st.pizza },
    { key: 'salt', label: t('Salt'), step: 0.1, min: 0, max: 5, fmt: v => `${round(v, 1)}%`, range: [1.8, 3.2] },
  );
  if (s.fats || st.forceFat) out.push({ key: 'fat', label: t(st.fatLabel || 'Fat / oil'), step: 0.5, min: 0, max: 20, fmt: v => `${round(v, 1)}%` });
  if (s.sugar) out.push({ key: 'sugar', label: t('Sugar / malt'), step: 0.5, min: 0, max: 20, fmt: v => `${round(v, 1)}%` });

  out.push({ sub: t('Fermentation') });
  out.push({ key: 'rt1Hours', label: t(st.rt1), step: 1, min: 1, max: 72, fmt: hrs }, temp('rtTemp', t('Room temp'), 1, 40));
  if (cold) out.push({ key: 'ctHours', label: t('Fridge'), step: 1, min: 0, max: 120, fmt: hrs }, temp('ctTemp', t('Fridge temp'), 1, 12));
  if (st.rt2 && (!st.rt2OnlyWithCold || cold)) out.push({ key: 'rt2Hours', label: t(st.rt2), step: 0.5, min: 0, max: 24, fmt: hrs });

  out.push({ sub: t('Leavening') }, { yeast: true });
  if (!lv.sourdough) {
    out.push({ toggle: 'yeastManual', label: t('Set yeast by hand') });
    if (r.yeastManual) out.push({ key: 'yeastPct', label: t('Yeast · % of flour ({type})', { type: lv.short }), step: 0.05, min: 0.01, max: 5, fmt: v => `${round(v, 2)}%` });
  }
  if (lv.sourdough) {
    out.push({ key: 'starterHydration', label: t('Starter hydration'), step: 5, min: 40, max: 200, fmt: v => `${v}%` });
    out.push({ toggle: 'levainManual', label: t('Set levain by hand') });
    if (r.levainManual) out.push({ key: 'levainPct', label: t('Levain · % of flour'), step: 1, min: 1, max: 60, fmt: v => `${v}%` });
  }

  if (st.pizza) {
    out.push({ sub: t('Bake') });
    out.push(temp('ovenTemp', t('Oven (stone)'), 150, (OVENS[s.oven] || OVENS.gas).max), { key: 'bakeSeconds', label: t('Bake time'), step: 5, min: 30, max: 900, fmt: fmtSec });
    out.push({ key: 'flourW', label: t('Flour strength (W)'), step: 10, min: 120, max: 450, fmt: v => `W ${v}` });
  }
  if (s.floursCount > 1) {
    out.push({ sub: t('Flour blend') });
    for (let i = 0; i < s.floursCount; i++) out.push({ flour: i });
  }
  if (s.poolish) out.push({ sub: t('Poolish') }, { key: 'poolishPct', label: t('Flour in poolish'), step: 5, min: 5, max: 100, fmt: v => `${v}%` }, { key: 'poolishHours', label: t('Poolish time'), step: 1, min: 2, max: 24, fmt: hrs });
  else if (s.biga) {
    const by = lv.sourdough ? 'CY' : lv.short;
    out.push({ sub: t('Biga') }, { key: 'bigaPct', label: t('Flour in biga'), step: 5, min: 5, max: 100, fmt: v => `${v}%` }, { key: 'bigaHydration', label: t('Biga water'), step: 1, min: 40, max: 65, fmt: v => `${v}%` },
      { key: 'bigaYeastPct', label: t('Biga yeast · % of its flour ({type})', { type: by }), step: 0.05, min: 0.01, max: 3, fmt: v => `${round(v, 2)}%`, auto: () => round(lv.sourdough ? 1 : lv.factor, 2) },
      { key: 'bigaHours', label: t('Biga time'), step: 1, min: 6, max: 72, fmt: hrs }, temp('bigaTemp', t('Biga temp'), 1, 25));
  }
  if (s.oldDoughIn || s.oldDoughOut) out.push({ sub: t('Old dough') });
  if (s.oldDoughIn) out.push({ key: 'oldDoughIn', label: t('Old dough in'), step: 1, min: 1, max: 50, fmt: v => `${v}%` });
  if (s.oldDoughOut) out.push({ key: 'oldDoughOut', label: t('Keep for next time'), step: 1, min: 1, max: 50, fmt: v => `${v}%` });
  return out;
}

function valueOf(def) { const v = R()[def.key] ?? (def.auto ? def.auto() : 0); return def.temp ? Math.round(toDisp(v)) : v; }

function tileHTML(d) {
  const v = valueOf(d);
  const unit = d.temp ? `<span class="unit">${tUnit()}</span>` : '';
  return `<div class="tile" data-tile="${d.key}">
    <label for="f-${d.key}">${esc(d.label)}${unit}</label>
    <div class="tile-row">
      <input id="f-${d.key}" class="val" inputmode="decimal" autocomplete="off" value="${esc(d.fmt(v))}" data-key="${d.key}">
      <div class="steps" data-key="${d.key}">
        <button type="button" data-dir="-1" aria-label="${esc(t('Decrease {label}', { label: d.label }))}">${ICON.minus}</button>
        <button type="button" data-dir="1" aria-label="${esc(t('Increase {label}', { label: d.label }))}">${ICON.plus}</button>
      </div>
    </div>${d.advisor ? '<div class="advice" id="hyd-advice"></div>' : ''}</div>`;
}

function renderCalc() {
  const r = R();
  const groups = [];
  for (const d of fieldDefs()) {
    if (d.sub) { groups.push({ title: d.sub, html: [] }); continue; }
    const g = groups[groups.length - 1];
    if (d.yeast) g.html.push(`<div class="tile wide"><span class="label" id="lbl-yeast">${tx('Type')}</span>
      <div class="seg" role="group" aria-labelledby="lbl-yeast">${Object.values(LEAVENERS).map(l =>
        `<button type="button" data-yeast="${l.short}" aria-pressed="${r.yeastType === l.short}" title="${tx(l.label)}">${l.short}</button>`).join('')}</div>
      <span class="hint">${tx(LEAVENERS[r.yeastType].label)}</span></div>`);
    else if (d.toggle) g.html.push(`<label class="tile wide switch-row"><span>${esc(d.label)}</span>
      <span class="switch"><input type="checkbox" data-rtoggle="${d.toggle}" ${r[d.toggle] ? 'checked' : ''}><span></span></span></label>`);
    else if (d.flour != null) {
      const f = r.flours[d.flour];
      g.html.push(`<div class="tile"><input type="text" class="flour-name" data-flour-name="${d.flour}" value="${tx(f.name)}" aria-label="${esc(t('Flour {n} name', { n: d.flour + 1 }))}">
        <div class="tile-row"><input class="val" inputmode="decimal" value="${f.pct}%" data-flour="${d.flour}" aria-label="${esc(t('{name} percent', { name: t(f.name) }))}">
        <div class="steps" data-flour="${d.flour}"><button type="button" data-dir="-1" aria-label="${tx('Less')}">${ICON.minus}</button><button type="button" data-dir="1" aria-label="${tx('More')}">${ICON.plus}</button></div></div></div>`);
    } else g.html.push(tileHTML(d));
  }
  if (S().floursCount > 1) {
    const blend = groups.find(g => g.title === t('Flour blend'));
    if (blend) blend.html.push(`<p class="hint wide-note">${tx('The blend always adds up to 100%: changing one flour adjusts the others.')}</p>`);
  }
  const st = ST();
  const intro = `<details class="style-intro" open><summary><h2>${tx(st.name)}</h2></summary><p>${tx(st.about)}</p>
    <ul class="traits">${st.traits.map(x => `<li>${tx(x)}</li>`).join('')}</ul></details>`;
  $('#view').innerHTML = `<div class="calc">
    <div class="inputs">${intro}${groups.map(g => `<section class="group" aria-label="${esc(g.title)}"><h2 class="eyebrow">${esc(g.title)}</h2><div class="tiles">${g.html.join('')}</div></section>`).join('')}</div>
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
    box.innerHTML = `<span><b>${inRange ? tx('On target') : esc(t('Suggested {min}–{max}%', { min: adv.min, max: adv.max }))}</b> ${tx('for your oven, kitchen and flour')}</span>
      ${inRange ? '' : `<button type="button" class="chip" data-sethyd="${adv.target}">${esc(t('Use {v}%', { v: adv.target }))}</button>`}
      <details><summary>${tx('Why')}</summary><ul>${adv.reasons.map(x => `<li>${tx(x)}</li>`).join('')}</ul></details>`;
  }
}

function ring(score) {
  const C = 2 * Math.PI * 26;
  const tone = score >= 85 ? 'good' : score >= 65 ? 'mid' : 'low';
  return `<svg class="ring ${tone}" viewBox="0 0 64 64" role="img" aria-label="${esc(t('Leopard score {n} out of 100', { n: score }))}">
    <circle cx="32" cy="32" r="26" class="track"/><circle cx="32" cy="32" r="26" class="arc" stroke-dasharray="${(score / 100) * C} ${C}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle">${score}</text></svg>`;
}

function leopardCardHTML(rep) {
  const top = rep.fixes.slice(0, 3);
  return `<section class="card leopard">
    <header class="card-head">${ring(rep.score)}<div><p class="eyebrow">${ICON.flame} ${tx('Leoparding coach')}</p><h3>${tx(rep.grade)}</h3></div></header>
    ${top.length ? `<ol class="fixes">${top.map(i => `<li class="${i.status}"><b>${tx(i.label)}</b> · ${tx(i.value)}<br>${tx(i.advice)}</li>`).join('')}</ol>`
      : `<p class="note">${tx('Every factor is in range. The rest is technique: see the tips below.')}</p>`}
    <details><summary>${tx('All factors')}</summary><ul class="checks">${rep.items.map(i =>
      `<li class="${i.status}"><span class="dot" aria-hidden="true"></span><span><b>${tx(i.label)}</b> <span class="muted">${tx(i.value)}</span><br>${tx(i.advice)}</span></li>`).join('')}</ul></details>
    <details><summary>${tx('Technique tips')}</summary><dl class="tips">${[...(OVENS[S().oven] || OVENS.gas).tips, ...LEOPARD_TECHNIQUE].map(([a, b]) => `<dt>${tx(a)}</dt><dd>${tx(b)}</dd>`).join('')}</dl></details>
  </section>`;
}

// Ingredient rows; names are message keys/objects so stored bakes can be shown in any language.
function ingredientRows(out, r, st) {
  const lv = LEAVENERS[r.yeastType];
  const F = out.flourTotal || 1;
  const rows = [];
  if (out.flours.length > 1) out.flours.forEach(f => rows.push([f.name, f.grams]));
  else rows.push(['Flour', out.flour]);
  rows.push(['Water', out.water], ['Salt', out.salt]);
  if (lv.sourdough) rows.push([{ k: 'Levain ({v}%)', p: { v: round(out.levain.pct, 1) } }, out.levain.mass]);
  else rows.push([{ k: 'Yeast · {type}', p: { type: lv.short } }, out.yeast]);
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
    <p class="eyebrow">${tx(st.name)} · <span class="nocase">${esc(pieces)}</span></p>
    <p class="total"><span>${Math.round(out.dough)}</span> ${tx('g dough')}</p>
    <ul class="ingredients">${rows.map(x => `<li><span class="name">${tx(x.name)}</span><span class="pct">${round(x.pct, x.pct < 1 ? 2 : 1)}%</span><span class="g">${grams(x.g)}</span>
      <span class="fill" style="--w:${Math.min(100, x.pct).toFixed(1)}%"></span></li>`).join('')}</ul>
    <div class="actions"><button class="btn primary" data-act="log-new">${tx('Log this bake')}</button><button class="btn" data-act="save">${tx('Save recipe')}</button><button class="btn" data-act="share">${tx('Share')}</button></div>
  </section>`;

  html += plannerHTML(out);
  const rep = leopardFor();
  if (rep) html += leopardCardHTML(rep);

  if (out.preferment) {
    const p = out.preferment;
    const head = p.temp != null
      ? (p.kind === 'poolish' ? t('Poolish · make first, {h} ahead at {t}', { h: fmtHours(p.hours), t: tempStr(p.temp) }) : t('Biga · make first, {h} ahead at {t}', { h: fmtHours(p.hours), t: tempStr(p.temp) }))
      : (p.kind === 'poolish' ? t('Poolish · make first, {h} ahead', { h: fmtHours(p.hours) }) : t('Biga · make first, {h} ahead', { h: fmtHours(p.hours) }));
    html += `<section class="card"><h3>${esc(head)}</h3><table>
      <tr><td>${tx('Flour')}</td><td>${grams(p.flour)}</td></tr><tr><td>${tx('Water')}</td><td>${grams(p.water)}</td></tr>
      <tr><td>${esc(t('Yeast ({type}, {pct}%)', { type: p.yeastType, pct: num2(p.yeastPct) }))}</td><td>${grams(p.yeast)}</td></tr><tr><td>${tx('Total')}</td><td>${grams(p.total)}</td></tr></table>
      <p class="note">${tx('Mix all of it into the main dough.')}</p></section>`;
  }
  if (out.levain) {
    const L = out.levain;
    html += `<section class="card"><h3>${tx('Levain')}</h3><table>
      <tr><td>${esc(t('Levain at {v}% hydration', { v: round(L.hydration, 0) }))}</td><td>${grams(L.mass)}</td></tr>
      <tr><td>${tx('Flour in it')}</td><td>${grams(L.flour)}</td></tr><tr><td>${tx('Water in it')}</td><td>${grams(L.water)}</td></tr>
      ${out.levainHours ? `<tr><td>${esc(t('Fermentation it supports at {t}', { t: tempStr(r.rtTemp) }))}</td><td>≈ ${fmtHours(out.levainHours)}</td></tr>` : ''}
      </table><p class="note">${tx('Its flour and water already count toward the dough hydration.')} <a href="#" data-go="sourdough">${tx('Plan the build in the Sourdough lab.')}</a></p></section>`;
  }
  html += `<section class="card"><h3>${tx('Formula')}</h3><table>
    <tr><td>${tx('Total flour')}</td><td>${grams(out.flourTotal)}</td></tr>
    <tr><td>${tx('Total water')}</td><td>${grams(out.flourTotal * r.hydration / 100)}</td></tr>
    <tr><td>${tx('Fermentation, as hours at room temp')}</td><td>${fmtHours(out.hours)}</td></tr>
    ${out.yeastManual ? `<tr><td>${tx('Yeast set by hand supports')}</td><td>≈ ${esc(t('{h} at room temp', { h: fmtHours(out.yeastHours) }))}</td></tr>` : `<tr><td>${tx('Fresh-yeast equivalent')}</td><td>${round(out.yeastPctCY, 3)}%</td></tr>`}
    ${out.oldDoughOut ? `<tr><td>${tx('Set aside for next batch')}</td><td>${grams(out.oldDoughOut)}</td></tr>` : ''}
    ${s.wastage ? `<tr><td>${tx('Wastage allowance')}</td><td>${s.wastage}%</td></tr>` : ''}
    </table>${out.yeastManual && out.yeastHours && (out.yeastHours > out.hours * 2.5 || out.yeastHours < out.hours / 2.5)
      ? `<p class="warn">${esc(t('Your schedule is about {a} at room temp, but this much yeast suits about {b}. Watch the dough rather than the clock.', { a: fmtHours(out.hours), b: fmtHours(out.yeastHours) }))}</p>` : ''}
    ${out.warnings.map(w => `<p class="warn">${tx(w)}</p>`).join('')}</section>`;
  if (r.method) html += `<section class="card method"><h3>${tx('Method')}${r.recipeName ? ` · ${tx(r.recipeName)}` : ''}</h3><ol>${r.method.map(m => `<li>${tx(m)}</li>`).join('')}</ol>
    ${r.source ? `<p class="note">${tx(r.source)}</p>` : ''}<button class="btn" data-act="clear-method">${tx('Hide method')}</button></section>`;
  $('#results').innerHTML = html;
}

// ---------- Schedule & bake planner ----------
const PL = () => (state.planner ||= { bakeAt: null, startAt: null });
// Steps: [label (already translated), hours, isBake]
function scheduleSteps(out, r = R(), st = ST(), s = S()) {
  const steps = [];
  if (out.levain) steps.push([t('Build levain'), starterPeakHours({ ratio: [1, 2, 2], temp: r.rtTemp })]);
  if (out.preferment) {
    const pf = out.preferment;
    const keep = { t: tempStr(pf.temp) };
    const label = pf.kind === 'poolish'
      ? (pf.temp != null ? t('Mix poolish (keep at {t})', keep) : t('Mix poolish'))
      : (pf.temp != null ? t('Mix biga (keep at {t})', keep) : t('Mix biga'));
    steps.push([label, pf.hours]);
  }
  steps.push([t('Mix dough · {stage}', { stage: t(st.rt1) }), r.rt1Hours]);
  if (coldOn(st, s) && r.ctHours > 0) steps.push([t('Into the fridge'), r.ctHours]);
  const x = calcInput(r, st, s);
  if (x.rt2Hours > 0) steps.push([t(st.rt2), x.rt2Hours]);
  steps.push([t('Bake'), 0, true]);
  return steps;
}
function timelineHTML(steps, startMs) {
  let at = startMs != null ? new Date(startMs) : null;
  return `<ol class="timeline${at ? ' timed' : ''}">${steps.map(([name, h, isBake]) => {
    const night = at && !isBake && atNight(at);
    const cell = at ? `<span class="when">${fmtWhen(at)}</span>` : '<span class="when"></span>';
    if (at) at = new Date(at.getTime() + h * 3600e3);
    return `<li${night ? ' class="night"' : ''}>${cell}<span>${esc(name)}${h ? ` <span class="muted">${fmtHours(h)}</span>` : ''}${night ? ` <span class="night-tag">${tx('at night')}</span>` : ''}</span></li>`;
  }).join('')}</ol>`;
}
function planVariant(plan) {
  const st = ST();
  const r = { ...R(), rt1Hours: plan.rt1Hours, ctHours: plan.ctHours, rt2Hours: plan.rt2Hours };
  const s = { ...S(), ct: st.forceCold ? S().ct : plan.ctHours > 0 };
  return { r, s, out: computeDough(calcInput(r, st, s), s) };
}
function leadHours(out, r = R()) {
  if (out.levain) return starterPeakHours({ ratio: [1, 2, 2], temp: r.rtTemp });
  if (out.preferment) return out.preferment.hours;
  return 0;
}
function quickTimes() {
  const at = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
  const list = [];
  const tonight = at(0, 19, 30);
  if (tonight - Date.now() > 4 * 3600e3) list.push([t('Tonight 19:30'), tonight]);
  list.push([t('Tomorrow 19:30'), at(1, 19, 30)], [t('In 2 days'), at(2, 19, 30)], [t('In 3 days'), at(3, 19, 30)]);
  return list;
}
function plannerHTML(out) {
  const pl = PL(), st = ST(), r = R();
  const start = pl.startAt || Date.now();
  const startVal = pl.startAt ? toLocalInput(new Date(pl.startAt)) : '';
  const head = `<section class="card planner"><h3>${tx('Bake planner')}</h3>
    <div class="plan-inputs">
      <label for="plan-start">${tx('I can start')}<input type="datetime-local" id="plan-start" value="${startVal}"><small>${pl.startAt ? '' : tx('Now')}</small></label>
      <label for="bake-at">${tx('I want to bake')}<input type="datetime-local" id="bake-at" value="${pl.bakeAt ? toLocalInput(new Date(pl.bakeAt)) : ''}"></label>
    </div>
    <div class="chips">${quickTimes().map(([label, d]) => `<button type="button" class="chip" data-bake-at="${d.getTime()}">${esc(label)}</button>`).join('')}
      ${pl.startAt ? `<button type="button" class="chip ghost" data-act="start-now">${tx('Start now')}</button>` : ''}</div>`;
  if (!pl.bakeAt) {
    const steps = scheduleSteps(out);
    const total = steps.reduce((a, [, h]) => a + h, 0);
    return `${head}<p class="note">${tx('Pick when you want to bake. Prozimi suggests how to split the time between room temperature and the fridge, and how much yeast that needs.')}</p>
      <h4>${esc(t('Current schedule · {h}', { h: fmtHours(total) }))}</h4>${timelineHTML(steps, null)}</section>`;
  }
  const hours = (pl.bakeAt - start) / 3600e3;
  if (hours <= 0) return `${head}<p class="warn">${tx('The bake time is before the start time.')}</p></section>`;
  const { plans } = recommendPlans({ style: state.style, hours, lead: leadHours(out) });
  const lv = LEAVENERS[r.yeastType];
  const cards = plans.map((p, i) => {
    const v = planVariant(p);
    const amount = lv.sourdough ? t('{g} levain', { g: grams(v.out.levain.mass) }) : `${grams(v.out.yeast)} ${lv.short}`;
    const rep = leopardFor(v.r, st, v.s);
    const inUse = r.rt1Hours === p.rt1Hours && (r.ctHours === p.ctHours || (!coldOn() && p.ctHours === 0)) && (calcInput().rt2Hours === p.rt2Hours) && coldOn() === (st.forceCold || p.ctHours > 0);
    const steps = scheduleSteps(v.out, v.r, st, v.s);
    const startMs = start + p.delay * 3600e3;
    const split = [t('{h} room temp', { h: fmtHours(p.rt1Hours) }), p.ctHours ? t('{h} fridge', { h: fmtHours(p.ctHours) }) : '', p.rt2Hours && st.rt2 ? `${fmtHours(p.rt2Hours)} ${t(st.rt2)}` : ''].filter(Boolean).join(' → ');
    const nights = (() => { let ms = startMs, n = 0; for (const [, h, isBake] of steps) { if (!isBake && atNight(new Date(ms))) n++; ms += h * 3600e3; } return n; })();
    return `<details class="plan${p.recommended ? ' best' : ''}" ${i === 0 ? 'open' : ''}>
      <summary><span class="plan-title">${tx(p.title)}${p.recommended ? ` <span class="tag">${tx('Recommended')}</span>` : ''}${inUse ? ` <span class="tag ghost">${tx('In use')}</span>` : ''}</span>
        <span class="plan-meta">${esc(split)} · ${esc(amount)}${rep ? ` · ${esc(t('leopard {n}', { n: rep.score }))}` : ''}</span></summary>
      <p class="note">${tx(p.why)}</p>
      ${p.warning ? `<p class="warn">${tx(p.warning)}</p>` : ''}
      ${p.delay >= 1 ? `<p class="note">${esc(t('You have more time than this plan needs. Start at {when} ({h} after your start time).', { when: fmtWhen(new Date(startMs)), h: fmtHours(p.delay) }))}</p>` : ''}
      ${timelineHTML(steps, startMs)}
      ${nights ? `<p class="note">${esc(t('Steps at night: {n}. Change the start or bake time, or check whether a step can wait until morning.', { n: nights }))}</p>` : ''}
      <button type="button" class="btn ${inUse ? '' : 'primary'}" data-plan="${i}" ${inUse ? 'disabled' : ''}>${inUse ? tx('Using this plan') : tx('Use this plan')}</button>
    </details>`;
  }).join('');
  return `${head}<p class="note">${esc(t('{h} from start to bake.', { h: fmtHours(hours) }))}</p>${cards}</section>`;
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
function setFlour(i, pct) { R().flours = rebalanceFlours(R().flours, S().floursCount, i, pct); persist(); renderCalc(); }
const bumpFlour = (i, dir) => setFlour(i, R().flours[i].pct + dir * 5);

let holdTimer = null;
function stopHold() { clearTimeout(holdTimer); clearInterval(holdTimer); holdTimer = null; }
document.addEventListener('pointerup', stopHold);
document.addEventListener('pointercancel', stopHold);

// ---------- Views ----------
const pageTitle = v => ({
  settings: t('Settings'), tools: t('Tools'), sourdough: t('Sourdough lab'), glossary: t('Glossary'), about: t('About'),
  open: t('Saved recipes'), library: t('Recipe library'), shared: t('Share'), help: t('How to use'),
  log: t('Bake log'), 'log-edit': t('Log a bake'), 'log-detail': t('Bake'),
}[v] || '');

function renderChrome() {
  document.documentElement.lang = getLang();
  document.title = t('{app} · Dough calculator', { app: APP });
  $('#btn-log').innerHTML = `${ICON.book}<span>${tx('Bake log')}</span>`;
  $('#btn-log').setAttribute('aria-label', t('Bake log'));
  $('#btn-menu').innerHTML = ICON.menu;
  $('#btn-menu').setAttribute('aria-label', t('Menu'));
  $('#menu').innerHTML = `
    <button data-go="log">${tx('Bake log')}</button>
    <button data-go="library">${tx('Recipe library')}</button>
    <button data-go="open">${tx('Saved recipes')} <span class="badge">${savedList().length}</span></button>
    <button data-act="save">${tx('Save recipe')}</button>
    <button data-act="share">${tx('Share recipe')}</button>
    <hr>
    <button data-go="settings">${tx('Settings')}</button>
    <button data-go="tools">${tx('Tools')}</button>
    <button data-go="sourdough">${tx('Sourdough lab')}</button>
    <hr>
    <button data-go="glossary">${tx('Glossary')}</button>
    <button data-go="help">${tx('How to use')}</button>
    <button data-go="about">${tx('About')}</button>`;
  $('#tabs').setAttribute('aria-label', t('Dough style'));
  applyTheme();
}

function renderTabs() {
  const tabs = $('#tabs');
  tabs.hidden = view !== 'calc';
  tabs.innerHTML = Object.entries(STYLES).map(([k, st]) =>
    `<button role="tab" data-style="${k}" aria-selected="${k === state.style}">${tx(st.name)}</button>`).join('');
}

async function render() {
  renderChrome();
  renderTabs();
  if (view === 'calc') { $('#page-title').textContent = ''; renderCalc(); return; }
  $('#page-title').textContent = pageTitle(view);
  const body = view.startsWith('log') ? await LOG_PAGES[view]() : PAGES[view]();
  const backTo = view === 'log-detail' || view === 'log-edit' ? (logDraft && !logId ? 'calc' : 'log') : 'calc';
  $('#view').innerHTML = `<div class="page"><button class="btn ghost back" data-go="${backTo}">${ICON.back}${backTo === 'log' ? tx('Bake log') : tx('Calculator')}</button>${body}</div>`;
  if (view === 'tools') updateTools();
  if (view === 'sourdough') updateLab();
}

const toggleRow = (key, label, hint = '') => `<label class="row"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span>
  <span class="switch"><input type="checkbox" data-setting="${key}" ${S()[key] ? 'checked' : ''}><span></span></span></label>`;

const PAGES = {
  settings: () => `<div class="list">
    <div class="row"><label for="set-lang">${tx('Language')}</label><select id="set-lang" data-setting="lang">${Object.entries(LANGS).map(([k, n]) => `<option value="${k}" ${getLang() === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${toggleRow('twoSizes', t('Two piece sizes'))}
    <div class="row"><label for="set-flours">${tx('Number of flours')}</label><select id="set-flours" data-setting="floursCount">${[1, 2, 3].map(n => `<option ${S().floursCount == n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${toggleRow('fats', t('Fats / oil'), t('Always on for Roman and focaccia.'))}
    ${toggleRow('sugar', t('Sugar / malt'))}
    ${toggleRow('ct', t('Cold fermentation'), t('Always on for Contemporary, Roman and sourdough loaf.'))}
    ${toggleRow('oldDoughIn', t('Old dough in'))}
    ${toggleRow('oldDoughOut', t('Old dough out'))}
    ${toggleRow('biga', t('Biga'), t('Stiff pre-ferment. Turns poolish off.'))}
    ${toggleRow('poolish', t('Poolish'), t('Liquid pre-ferment. Turns biga off.'))}
    <div class="row"><label for="set-waste">${tx('Wastage')}</label><select id="set-waste" data-setting="wastage">${[0, 1, 2, 3, 4, 5, 7, 10].map(n => `<option value="${n}" ${S().wastage == n ? 'selected' : ''}>${n}%</option>`).join('')}</select></div>
    <div class="row"><label for="set-oven">${tx('Pizza oven')}<small>${tx('Sets the stone temperature, bake time and tips for Neapolitan and Contemporary.')} ${(OVENS[S().oven] || OVENS.gas).hint ? tx(OVENS[S().oven].hint) : ''}</small></label><select id="set-oven" data-setting="oven">${Object.entries(OVENS).map(([k, o]) => `<option value="${k}" ${S().oven === k ? 'selected' : ''}>${tx(o.name)}</option>`).join('')}</select></div>
    ${toggleRow('keepAwake', t('Keep screen on'))}
    <div class="row"><span>${tx('Temperature')}</span><div class="seg small">${['C', 'F'].map(u => `<button data-unit="${u}" aria-pressed="${S().unit === u}">°${u}</button>`).join('')}</div></div>
    </div>
    <p class="note">${tx('Light and dark mode: use the button at the top of the screen.')}</p>
    <p><button class="btn danger" data-act="reset">${esc(t('Reset {style} to defaults', { style: t(ST().name) }))}</button></p>`,

  tools: () => `
    <h3>${tx('Yeast converter')}</h3>
    <div class="list"><div class="row"><span><input type="number" id="ty-g" value="10" min="0" step="0.1" aria-label="${tx('Grams')}"> g</span>
      <select id="ty-from" aria-label="${tx('Yeast type')}">${Object.values(LEAVENERS).filter(l => !l.sourdough).map(l => `<option value="${l.short}">${tx(l.label)}</option>`).join('')}</select></div>
      <div class="row"><span>${tx('Equals')}</span><span class="tool-out" id="ty-out"></span></div></div>

    <h3>${tx('Dough for a pan')}</h3>
    <div class="list">
      <div class="row"><label for="tp-shape">${tx('Shape')}</label><select id="tp-shape"><option value="rect">${tx('Rectangular')}</option><option value="round">${tx('Round')}</option></select></div>
      <div class="row" id="tp-rect"><span>${tx('Size (cm)')}</span><span><input type="number" id="tp-l" value="40" class="narrow" aria-label="${tx('Length')}"> × <input type="number" id="tp-w" value="30" class="narrow" aria-label="${tx('Width')}"></span></div>
      <div class="row" id="tp-round" hidden><label for="tp-d">${tx('Diameter (cm)')}</label><input type="number" id="tp-d" value="28"></div>
      <div class="row"><label for="tp-f">${tx('Thickness factor (g/cm²)')}<small>${tx('Roman pan 0.55–0.65 · focaccia 0.6–0.7 · Detroit 0.5–0.6 · thin round 0.35–0.4')}</small></label><input type="number" id="tp-f" value="0.55" step="0.05"></div>
      <div class="row"><span class="tool-out" id="tp-out"></span><button class="btn primary" id="tp-use">${esc(t('Use for {style}', { style: t(ST().name) }))}</button></div>
    </div>

    <h3>${tx('Water temperature')}</h3>
    <div class="list">
      <div class="row"><label for="tw-t">${tx('Target dough temp')} (${tUnit()})</label><input type="number" id="tw-t" value="${Math.round(toDisp(24))}"></div>
      <div class="row"><label for="tw-r">${tx('Room')} (${tUnit()})</label><input type="number" id="tw-r" value="${Math.round(toDisp(22))}"></div>
      <div class="row"><label for="tw-f">${tx('Flour')} (${tUnit()})</label><input type="number" id="tw-f" value="${Math.round(toDisp(22))}"></div>
      <div class="row"><label for="tw-x">${tx('Mixer friction')} (${tUnit()})<small>${tx('By hand ≈ 1 °C · stand mixer ≈ 5–10 °C · spiral ≈ 10–14 °C')}</small></label><input type="number" id="tw-x" value="${S().unit === 'F' ? 2 : 1}"></div>
      <div class="row"><span>${tx('Water at')}</span><span class="tool-out" id="tw-out"></span></div>
    </div>`,

  sourdough: () => {
    const out = computeDough(calcInput(), S());
    const target = out.levain ? Math.ceil(out.levain.mass * 1.1) : 100;
    return `<p class="note">${tx('Tools for working with a starter. The levain target is your current recipe levain plus 10%, to allow for what sticks to the jar.')}</p>
    <h3>${tx('Levain build')}</h3>
    <div class="list">
      <div class="row"><label for="lb-t">${tx('Levain needed (g)')}</label><input type="number" id="lb-t" value="${target}"></div>
      <div class="row"><span>${tx('Ratio starter : flour : water')}</span><span><input type="number" id="lb-a" value="1" class="narrow" aria-label="${tx('Starter part')}"> : <input type="number" id="lb-b" value="2" class="narrow" aria-label="${tx('Flour part')}"> : <input type="number" id="lb-c" value="2" class="narrow" aria-label="${tx('Water part')}"></span></div>
      <div class="row"><label for="lb-h">${tx('Starter hydration (%)')}</label><input type="number" id="lb-h" value="100"></div>
      <div class="row"><label for="lb-temp">${tx('Kitchen temp')} (${tUnit()})</label><input type="number" id="lb-temp" value="${Math.round(toDisp(R().rtTemp))}"></div>
      <div class="row block"><table id="lb-out"></table></div>
    </div>
    <h3>${tx('Bulk fermentation estimate')}</h3>
    <div class="list">
      <div class="row"><label for="bk-l">${tx('Levain (% of flour)')}</label><input type="number" id="bk-l" value="${out.levain ? Math.round(out.levain.pct) : 20}"></div>
      <div class="row"><label for="bk-t">${tx('Dough temp')} (${tUnit()})</label><input type="number" id="bk-t" value="${Math.round(toDisp(24))}"></div>
      <div class="row block"><table id="bk-out"></table>
      <p class="note">${tx('Put a small piece of dough in a straight-sided jar (an aliquot jar). End bulk when it has risen by the target. The warmer the dough, the less it should rise.')}</p></div>
    </div>
    <h3>${tx('Change starter hydration')}</h3>
    <div class="list">
      <div class="row"><label for="sc-m">${tx('Starter (g)')}</label><input type="number" id="sc-m" value="100"></div>
      <div class="row"><label for="sc-f">${tx('From (%)')}</label><input type="number" id="sc-f" value="100"></div>
      <div class="row"><label for="sc-t">${tx('To (%)')}</label><input type="number" id="sc-t" value="50"></div>
      <div class="row"><span>${tx('Add')}</span><span class="tool-out" id="sc-out"></span></div>
    </div>`;
  },

  glossary: () => `<dl class="gloss">${GLOSSARY.map(([a, b]) => `<dt>${tx(a)}</dt><dd>${tx(b)}</dd>`).join('')}</dl>`,

  about: () => `<div class="prose"><p><b>${APP} ${VERSION}</b> ${tx('is made for home pizza makers with a high-temperature pizza oven (gas, wood or pellet, up to about 500 °C). It also works out dough for Detroit-style pizza, focaccia, baguettes and sourdough bread, and suggests how much yeast or levain to use for the time and temperature you pick.')}</p>
    <p>${tx('Prozimi (προζύμι) is Greek for sourdough starter.')}</p>
    <p>${tx('For Neapolitan and Contemporary pizza it also suggests a hydration for your oven, kitchen and flour. A leoparding coach scores your recipe and bake setup.')}</p>
    <p>${tx('The Bake log keeps every bake with its exact recipe, notes, ratings and a photo. Recipes and bakes are stored only on this device. Use Export in the bake log to back them up or move them to another device.')}</p>
    <p>${tx('Install the app with Add to Dock (Safari on macOS), Add to Home Screen (iPhone and iPad), or the install button in Chrome and Edge. It works offline.')}</p>
    <p>${tx('The yeast, sourdough and leoparding models are informed approximations. Treat the numbers as a starting point and keep notes in the log.')}</p></div>`,

  help: () => `<ol class="prose">
    <li>${tx('Pick a style at the top.')}</li>
    <li>${tx('Set the number of pieces and their weight, then water and salt as a percentage of the flour.')}</li>
    <li>${tx('Set the fermentation time and temperature. The yeast or levain amount follows them.')}</li>
    <li>${tx('For pizza, enter your oven temperature, bake time and flour strength. Prozimi suggests a hydration, and the Leoparding coach tells you what to change.')}</li>
    <li>${tx('Turn on extras in Settings: a flour blend, oil, sugar, cold fermentation, biga or poolish, or old dough.')}</li>
    <li>${tx('Use the Bake planner to fit the dough to when you want to bake.')}</li>
    <li>${tx('Choose Log this bake when you bake. Later, open the Bake log to see exactly what you used, or load it again.')}</li>
    </ol><p class="note">${tx('Hold − or + to change a value quickly, or type a number into the box.')}</p>`,

  library: () => {
    const fs = findStyle && STYLES[findStyle] ? findStyle : state.style;
    const links = searchLinks(STYLES[fs].search, STYLES[fs].tag);
    return `<p class="note">${tx('Proven recipes to start from. Loading one replaces the values for its style; your other styles stay as they are.')}</p>
    <div class="library">${LIBRARY.map(tp => `<article class="card recipe">
      <p class="eyebrow">${tx(STYLES[tp.style].name)}</p><h3>${tx(tp.name)}</h3>
      <p class="muted">${tx(tp.summary)}</p>
      <details><summary>${tx('Method')}</summary><ol>${tp.method.map(m => `<li>${tx(m)}</li>`).join('')}</ol>
        ${tp.assumed?.length ? `<p class="note">${esc(t('Not in the original, filled in by Prozimi: {list}.', { list: tp.assumed.map(a => t(a)).join('; ') }))}</p>` : ''}</details>
      <p class="note">${tx(tp.source)}</p>
      <button class="btn primary" data-template="${tp.id}">${tx('Load recipe')}</button></article>`).join('')}</div>

    <h3>${tx('Find recipes online')}</h3>
    <div class="card find">
      <label class="inline-field" for="find-style">${tx('Style')}<select id="find-style">${Object.entries(STYLES).map(([k, st]) => `<option value="${k}" ${k === fs ? 'selected' : ''}>${tx(st.name)}</option>`).join('')}</select></label>
      <div class="links">${links.map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${ICON.link}${tx(l.name)}${l.extra ? ` <span class="muted">${esc(l.extra)}</span>` : ''}</a>`).join('')}</div>
      <p class="note">${tx('These open in your browser. Found a recipe with gram weights? Copy it and paste it below to load it into the calculator.')}</p>
    </div>

    <h3>${tx('Paste a recipe')}</h3>
    <div class="card import">
      <label for="imp-text" class="label">${tx('Recipe text (a caption, comment or web page)')}</label>
      <textarea id="imp-text" rows="7" placeholder="${tx('1000 g flour\n700 g water\n25 g salt\n2 g dry yeast')}">${esc(imported?.text || '')}</textarea>
      <div class="btns"><button class="btn primary" data-act="import-read">${tx('Read recipe')}</button></div>
      ${importPreviewHTML()}
    </div>`;
  },

  open: () => {
    const list = savedList();
    const form = `<form class="list" id="save-form"><div class="row">
      <input type="text" id="save-name" aria-label="${tx('Recipe name')}" value="${esc(`${t(ST().name)} ${new Date().toLocaleDateString(getLang())}`)}" class="grow">
      <button class="btn primary" type="submit">${tx('Save current recipe')}</button></div></form>`;
    if (!list.length) return `${form}<p class="note">${tx('No saved recipes yet. Saved recipes are templates you reuse. Each actual bake goes in the Bake log.')}</p>`;
    return `${form}<div class="list">${list.map((it, i) => `<div class="row"><span><b>${esc(it.name)}</b><small>${tx(STYLES[it.style]?.name || '')} · ${new Date(it.at).toLocaleDateString(getLang())}</small></span>
      <span class="btns"><button class="btn" data-load="${i}">${tx('Open')}</button><button class="btn danger" data-del="${i}" aria-label="${esc(t('Delete {name}', { name: it.name }))}">${tx('Delete')}</button></span></div>`).join('')}</div>`;
  },

  shared: () => `<p>${tx('Copy this text to share the recipe:')}</p><textarea id="share-text" rows="10" aria-label="${tx('Recipe to share')}"></textarea>`,
};

// ---------- Recipe import ----------
function importPreviewHTML() {
  if (!imported) return '';
  const p = imported.result;
  if (!p.found) return `<p class="warn">${tx('No ingredient weights found. Paste a list with grams, for example 1000 g flour, 700 g water.')}</p>`;
  const g = p.grams;
  const rows = [['Flour', g.flour], ['Water', g.water], ['Salt', g.salt], ['Oil / fat', g.oil], ['Sugar / malt', g.sugar], ['Levain', g.levain],
    ['Fresh yeast', g.CY], ['Active dry yeast', g.ADY], ['Instant dry yeast', g.IDY]].filter(([, v]) => v > 0);
  const ignored = p.lines.filter(l => l.kind === 'ignore' || l.kind === 'unknown');
  const ts = imported.style || state.style;
  return `<table class="imp-table">${rows.map(([k, v]) => `<tr><td>${tx(k)}</td><td>${grams(v)}</td><td class="muted">${k === 'Flour' ? '100' : round(v / p.flourTotal * 100, 2)}%</td></tr>`).join('')}
    <tr><td><b>${tx('Total')}</b></td><td><b>${grams(p.total)}</b></td><td class="muted">${esc(t('{v}% water', { v: round(p.hydration, 1) }))}</td></tr></table>
    ${ignored.length ? `<p class="note">${tx('Not used:')} ${ignored.map(l => esc(l.line)).join(' · ')}</p>` : ''}
    <p class="note">${tx('Biga, poolish and levain lines are added into the totals; switch on Biga or Poolish in Settings if you want them as a separate stage.')}</p>
    <label class="inline-field" for="imp-style">${tx('Load as')}<select id="imp-style">${Object.entries(STYLES).map(([k, st]) => `<option value="${k}" ${k === ts ? 'selected' : ''}>${tx(st.name)}</option>`).join('')}</select></label>
    <div class="btns"><button class="btn primary" data-act="import-apply">${tx('Load into calculator')}</button></div>`;
}

function applyImport() {
  const p = imported?.result; if (!p?.found) return;
  const style = $('#imp-style')?.value || state.style;
  const st = STYLES[style];
  const r = { ...state.recipes[style] };
  r.ballWeight = Math.round(p.total / Math.max(1, r.balls));
  r.hydration = round(p.hydration, 1);
  r.salt = round(p.salt, 2);
  if (p.oil > 0) r.fat = round(p.oil, 1);
  if (p.sugar > 0) r.sugar = round(p.sugar, 1);
  if (p.grams.levain > 0 && !p.yeastType) Object.assign(r, { yeastType: 'LSD', starterHydration: 100, levainManual: true, levainPct: round(p.levainPct, 1) });
  else if (p.yeastPct > 0) Object.assign(r, { yeastType: p.yeastType, yeastManual: true, yeastPct: round(p.yeastPct, 2) });
  Object.assign(r, { method: null, source: null, recipeName: 'Imported recipe' });
  const s = { ...S(), biga: false, poolish: false, fats: p.oil > 0 || S().fats, sugar: p.sugar > 0 };
  applyRecipe(style, r, s);
  go('calc');
  toast(t('Recipe loaded into {style}', { style: t(st.name) }));
}

// ---------- Bake log ----------
function summarize(r, st, s) {
  const out = computeDough(calcInput(r, st, s), s);
  return {
    dough: out.dough, hours: out.hours, yeastPctCY: out.yeastPctCY,
    rows: ingredientRows(out, r, st).map(x => ({ name: x.name, g: x.g, pct: x.pct })),
    preferment: out.preferment, levain: out.levain,
  };
}

function newBakeFromCurrent() {
  const st = ST(), r = structuredClone(R()), s = structuredClone(S());
  const now = PL().bakeAt || Date.now();
  const rep = leopardFor(r, st, s);
  return {
    id: newId(), createdAt: Date.now(), bakedAt: now, style: state.style, styleName: st.name,
    name: `${t(st.name)} · ${new Date(now).toLocaleDateString(getLang(), { day: 'numeric', month: 'short' })}`,
    recipe: r, settings: s, summary: summarize(r, st, s),
    leopardScore: rep ? rep.score : null, rating: 0, leopardRating: 0, ovenActual: st.pizza ? r.ovenTemp : null,
    notes: '', photo: null,
  };
}

const stars = (name, value, label) => `<fieldset class="stars"><legend>${esc(label)}</legend>${[1, 2, 3, 4, 5].map(n =>
  `<label><input type="radio" name="${name}" value="${n}" ${value === n ? 'checked' : ''}><span aria-hidden="true">★</span><span class="sr">${esc(t('{n} of 5', { n }))}</span></label>`).join('')}</fieldset>`;
const starText = n => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';

function recipeFacts(b) {
  const r = b.recipe, s = b.settings, st = STYLES[b.style] || {};
  const lv = LEAVENERS[r.yeastType] || LEAVENERS.CY;
  const cold = !!(st.forceCold || s.ct);
  const at = (h, c) => t('{h} at {t}', { h: fmtHours(h), t: tempStr(c) });
  const facts = [
    [t('Pieces'), `${r.balls} × ${r.ballWeight} g${s.twoSizes && r.balls2 ? ` + ${r.balls2} × ${r.ballWeight2} g` : ''}`],
    [t('Hydration'), `${r.hydration}%`], [t('Salt'), `${r.salt}%`],
    [t('Leavening'), t(lv.label) + (lv.sourdough ? ` (${t('starter {v}%', { v: r.starterHydration })})` : '')],
    [t(st.rt1 || 'Room temp rise'), at(r.rt1Hours, r.rtTemp)],
  ];
  if (s.fats || st.forceFat) facts.splice(3, 0, [t(st.fatLabel || 'Fat'), `${r.fat}%`]);
  if (s.sugar) facts.splice(3, 0, [t('Sugar'), `${r.sugar}%`]);
  if (cold) facts.push([t('Fridge'), at(r.ctHours, r.ctTemp)]);
  if (st.rt2 && (!st.rt2OnlyWithCold || cold) && r.rt2Hours) facts.push([t(st.rt2), fmtHours(r.rt2Hours)]);
  if (s.poolish) facts.push([t('Poolish'), t('{pct}% of flour, {h}', { pct: r.poolishPct, h: fmtHours(r.poolishHours) })]);
  else if (s.biga) facts.push([t('Biga'), t('{pct}% of flour at {hyd}% water, {time}', { pct: r.bigaPct, hyd: r.bigaHydration, time: at(r.bigaHours ?? 16, r.bigaTemp ?? 18) })]);
  if (r.yeastManual && !lv.sourdough) facts.push([t('Yeast (set by hand)'), `${r.yeastPct}% ${lv.short}`]);
  if (r.recipeName) facts.unshift([t('Recipe'), t(r.recipeName)]);
  if (s.floursCount > 1) facts.push([t('Flour blend'), r.flours.slice(0, s.floursCount).map(f => `${t(f.name)} ${f.pct}%`).join(', ')]);
  if (st.pizza) facts.push([t('Oven (planned)'), tempStr(r.ovenTemp)], [t('Bake time'), fmtSec(r.bakeSeconds)], [t('Flour strength'), `W ${r.flourW}`]);
  return facts;
}

const LOG_PAGES = {
  log: async () => {
    const all = await listBakes();
    const q = logQuery.trim().toLowerCase();
    const list = q ? all.filter(b => `${b.name} ${t(b.styleName)} ${b.notes}`.toLowerCase().includes(q)) : all;
    const tools = `<div class="log-tools">
      <input type="search" id="log-q" placeholder="${tx('Search bakes and notes')}" value="${esc(logQuery)}" aria-label="${tx('Search bakes')}">
      <button class="btn" data-act="export">${tx('Export')}</button>
      <label class="btn" for="log-import">${tx('Import')}</label><input type="file" id="log-import" accept="application/json,.json" hidden></div>`;
    if (!all.length) return `${tools}<div class="empty"><p><b>${tx('No bakes yet.')}</b></p><p class="note">${tx('On the calculator, choose Log this bake when you make a dough. Prozimi saves the exact recipe, your notes, ratings and a photo, so you can see later what worked.')}</p>
      <button class="btn primary" data-go="calc">${tx('Go to the calculator')}</button></div>`;
    return `${tools}<p class="note">${esc(t('Bakes saved on this device: {n}', { n: all.length }))}</p>
      <div class="bakes">${list.map(b => `<button class="bake" data-open-bake="${esc(b.id)}">
        ${b.photo ? `<img src="${b.photo}" alt="">` : `<span class="ph" aria-hidden="true">${ICON.flame}</span>`}
        <span class="meta"><b>${esc(b.name)}</b><small>${esc(fmtDate(b.bakedAt))}</small>
        <small>${tx(b.styleName)} · ${b.recipe.hydration}% · ${Math.round(b.summary.dough)} g${b.rating ? ` · <span class="stars-txt">${starText(b.rating)}</span>` : ''}</small></span>
        ${b.leopardScore != null ? `<span class="badge-score" title="${tx('Leopard score when logged')}">${b.leopardScore}</span>` : ''}
      </button>`).join('') || `<p class="note">${tx('No bakes match your search.')}</p>`}</div>`;
  },

  'log-edit': async () => {
    const b = logDraft;
    if (!b) return `<p class="note">${tx('Nothing to edit.')}</p>`;
    const st = STYLES[b.style] || {};
    return `<form id="log-form" class="log-form">
      <div class="list">
        <div class="row"><label for="lg-name">${tx('Name')}</label><input type="text" id="lg-name" class="grow" value="${esc(b.name)}" required></div>
        <div class="row"><label for="lg-when">${tx('Baked')}</label><input type="datetime-local" id="lg-when" value="${toLocalInput(new Date(b.bakedAt))}"></div>
        ${st.pizza ? `<div class="row"><label for="lg-oven">${tx('Oven temp you actually used')} (${tUnit()})</label><input type="number" id="lg-oven" value="${b.ovenActual != null ? Math.round(toDisp(b.ovenActual)) : ''}"></div>` : ''}
      </div>
      <div class="list pad">${stars('lg-rating', b.rating, t('How did it turn out?'))}${st.pizza ? stars('lg-leopard', b.leopardRating, t('Leoparding')) : ''}</div>
      <div class="list pad"><label for="lg-notes" class="label">${tx('Notes')}</label>
        <textarea id="lg-notes" rows="5" placeholder="${tx('Flour brand, how the dough felt, oven behaviour, what you would change…')}">${esc(b.notes)}</textarea></div>
      <div class="list pad"><span class="label">${tx('Photo')}</span>
        ${b.photo ? `<img class="photo" src="${b.photo}" alt="${tx('Photo of this bake')}">` : ''}
        <div class="btns"><label class="btn" for="lg-photo">${b.photo ? tx('Replace photo') : tx('Add photo')}</label>${b.photo ? `<button type="button" class="btn danger" data-act="photo-remove">${tx('Remove')}</button>` : ''}</div>
        <input type="file" id="lg-photo" accept="image/*" hidden></div>
      <h3>${tx('Recipe saved with this bake')}</h3>${factsHTML(b)}
      <div class="btns sticky-actions"><button class="btn primary" type="submit">${tx('Save bake')}</button><button type="button" class="btn" data-go="${logId ? 'log-detail' : 'calc'}">${tx('Cancel')}</button></div>
    </form>`;
  },

  'log-detail': async () => {
    const b = await getBake(logId);
    if (!b) return `<p class="note">${tx('This bake no longer exists.')}</p>`;
    return `<article class="bake-detail">
      ${b.photo ? `<img class="photo" src="${b.photo}" alt="${esc(t('Photo of {name}', { name: b.name }))}">` : ''}
      <h2>${esc(b.name)}</h2>
      <p class="muted">${esc(fmtDate(b.bakedAt))} · ${tx(b.styleName)}</p>
      <div class="pills-row">${b.rating ? `<span class="pill-s">${tx('Result')} <b class="stars-txt">${starText(b.rating)}</b></span>` : ''}
        ${b.leopardRating ? `<span class="pill-s">${tx('Leoparding')} <b class="stars-txt">${starText(b.leopardRating)}</b></span>` : ''}
        ${b.leopardScore != null ? `<span class="pill-s">${tx('Coach score')} <b>${b.leopardScore}</b></span>` : ''}
        ${b.ovenActual != null ? `<span class="pill-s">${tx('Oven')} <b>${tempStr(b.ovenActual)}</b></span>` : ''}</div>
      ${b.notes ? `<section class="card"><h3>${tx('Notes')}</h3><p class="pre">${esc(b.notes)}</p></section>` : ''}
      <h3>${tx('Recipe')}</h3>${factsHTML(b)}
      <div class="btns"><button class="btn primary" data-act="bake-use">${tx('Use this recipe')}</button><button class="btn" data-act="bake-edit">${tx('Edit')}</button>
        <button class="btn danger" data-act="bake-delete">${tx('Delete')}</button></div>
    </article>`;
  },
};

function prefermentLine(pf) {
  const p = { f: grams(pf.flour), w: grams(pf.water), y: grams(pf.yeast) };
  return pf.kind === 'poolish' ? t('Poolish: {f} flour, {w} water, {y} yeast.', p) : t('Biga: {f} flour, {w} water, {y} yeast.', p);
}

function factsHTML(b) {
  const sum = b.summary;
  const pf = sum.preferment;
  return `<section class="card"><h3>${esc(t('Ingredients · {g}', { g: `${Math.round(sum.dough)} g` }))}</h3><table>${sum.rows.map(x =>
    `<tr><td>${tx(x.name)} <span class="muted">${round(x.pct, x.pct < 1 ? 2 : 1)}%</span></td><td>${grams(x.g)}</td></tr>`).join('')}</table>
    ${pf ? `<p class="note">${esc(prefermentLine(pf))}</p>` : ''}
    ${sum.levain ? `<p class="note">${esc(t('Levain: {f} flour, {w} water.', { f: grams(sum.levain.flour), w: grams(sum.levain.water) }))}</p>` : ''}</section>
    <section class="card"><h3>${tx('Process')}</h3><table>${recipeFacts(b).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></section>`;
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
  try { await putBake(b); toast(t('Bake saved')); }
  catch (e) { toast(t(e.message)); }
  logId = b.id; logDraft = null; view = 'log-detail'; render(); window.scrollTo(0, 0);
}

async function exportBakes() {
  const all = await listBakes();
  if (!all.length) { toast(t('No bakes to export yet')); return; }
  const blob = new Blob([JSON.stringify({ app: 'prozimi', version: 1, exportedAt: Date.now(), bakes: all }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `prozimi-bakes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(t('Bakes exported: {n}', { n: all.length }));
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
  $('#lb-out').innerHTML = `<tr><td>${tx('Starter')}</td><td>${grams(b.starter)}</td></tr><tr><td>${tx('Flour')}</td><td>${grams(b.flour)}</td></tr>
    <tr><td>${tx('Water')}</td><td>${grams(b.water)}</td></tr><tr><td>${tx('Levain hydration')}</td><td>${Math.round(b.hydration)}%</td></tr>
    <tr><td>${tx('Ready (at peak) in about')}</td><td>${fmtHours(b.peakHours)}</td></tr>`;
  const tmp = fromDisp(num('bk-t'));
  $('#bk-out').innerHTML = `<tr><td>${tx('Bulk fermentation')}</td><td>≈ ${fmtHours(bulkHours({ levainPct: num('bk-l'), doughTemp: tmp }))}</td></tr>
    <tr><td>${tx('Aliquot jar target rise')}</td><td>${aliquotRise(tmp)}%</td></tr>`;
  const sc = convertStarter({ mass: num('sc-m'), from: num('sc-f'), to: num('sc-t') });
  $('#sc-out').textContent = sc.addFlour ? t('{g} flour → {total}', { g: grams(sc.addFlour), total: grams(sc.total) }) : t('{g} water → {total}', { g: grams(sc.addWater), total: grams(sc.total) });
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
  const keep = { theme: S().theme, keepAwake: S().keepAwake, unit: S().unit, lang: S().lang, oven: S().oven };
  state.settings = { ...DEFAULT_SETTINGS, ...structuredClone(s), ...keep };
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
  const lines = [t('{style}: {pieces} · {hyd}% water · {salt}% salt', { style: t(ST().name), pieces: `${R().balls} × ${R().ballWeight} g`, hyd: R().hydration, salt: R().salt })];
  if (out.preferment) lines.push(prefermentLine(out.preferment));
  ingredientRows(out, R(), ST()).forEach(x => lines.push(`${t(x.name)}: ${grams(x.g)}`));
  return lines.join('\n');
}
async function share() {
  const url = `${location.origin}${location.pathname}?r=${encodeRecipe()}`;
  const text = shareText();
  try { if (navigator.share) { await navigator.share({ title: t('{app} recipe', { app: APP }), text, url }); return; } }
  catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast(t('Recipe and link copied')); }
  catch { view = 'shared'; await render(); const ta = $('#share-text'); ta.value = `${text}\n${url}`; ta.focus(); ta.select(); }
}

// ---------- Events ----------
function go(v) { view = v; $('#menu').hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); render(); window.scrollTo(0, 0); }

document.addEventListener('click', async e => {
  const el = e.target.closest('button, a');
  const menu = $('#menu');
  if (!e.target.closest('#menu') && !e.target.closest('#btn-menu') && !menu.hidden) { menu.hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); }
  if (!el) return;
  if (el.id === 'btn-menu') { menu.hidden = !menu.hidden; el.setAttribute('aria-expanded', String(!menu.hidden)); return; }
  if (el.id === 'btn-theme') { S().theme = THEMES[(THEMES.indexOf(S().theme) + 1) % THEMES.length]; persist(); applyTheme(); toast(themeName(S().theme)); return; }
  if (el.id === 'brand') { e.preventDefault(); go('calc'); return; }
  if (el.dataset.go) { e.preventDefault(); if (el.dataset.go === 'calc' || el.dataset.go === 'log') logDraft = null; go(el.dataset.go); return; }
  if (el.dataset.style) { state.style = el.dataset.style; persist(); render(); return; }
  if (el.dataset.yeast) { R().yeastType = el.dataset.yeast; persist(); renderCalc(); return; }
  if (el.dataset.unit) { S().unit = el.dataset.unit; persist(); render(); return; }
  if (el.dataset.bakeAt) { PL().bakeAt = Number(el.dataset.bakeAt); persist(); renderResults(); return; }
  if (el.dataset.plan != null) {
    const out = computeDough(calcInput(), S());
    const start = PL().startAt || Date.now();
    const p = recommendPlans({ style: state.style, hours: (PL().bakeAt - start) / 3600e3, lead: leadHours(out) }).plans[+el.dataset.plan];
    if (!p) return;
    Object.assign(R(), { rt1Hours: p.rt1Hours, ctHours: p.ctHours, rt2Hours: p.rt2Hours });
    if (!ST().forceCold) S().ct = p.ctHours > 0;
    persist(); renderCalc(); toast(t('Plan applied: {name}', { name: t(p.title) })); return;
  }
  if (el.dataset.sethyd) { setValue('hydration', el.dataset.sethyd); toast(t('Water set to {v}%', { v: el.dataset.sethyd })); return; }
  if (el.dataset.load != null) { const it = savedList()[+el.dataset.load]; if (it && decodeRecipe(it.data)) { go('calc'); toast(t('Opened “{name}”', { name: it.name })); } return; }
  if (el.dataset.del != null) { const l = savedList(); const [it] = l.splice(+el.dataset.del, 1); setSaved(l); render(); toast(t('Deleted “{name}”', { name: it.name })); return; }
  if (el.dataset.template) {
    const tpl = LIBRARY.find(x => x.id === el.dataset.template); if (!tpl) return;
    const s = { ...S(), biga: false, poolish: false, ct: false, oldDoughIn: false, oldDoughOut: false, twoSizes: false, floursCount: 1, ...tpl.s };
    const r = { ...freshRecipe(tpl.style), ...tpl.r, method: tpl.method, source: tpl.source, recipeName: tpl.name, templateId: tpl.id };
    applyRecipe(tpl.style, r, s); go('calc'); toast(t('Loaded “{name}”', { name: t(tpl.name) })); return;
  }
  if (el.dataset.openBake) { logId = el.dataset.openBake; go('log-detail'); return; }
  if (el.id === 'tp-use') { R().ballWeight = Number($('#tp-out').dataset.g) || R().ballWeight; persist(); go('calc'); toast(t('Weight applied')); return; }
  const act = el.dataset.act;
  if (!act) return;
  menu.hidden = true;
  if (act === 'save') { go('open'); const n = $('#save-name'); n.focus(); n.select(); }
  else if (act === 'share') share();
  else if (act === 'import-read') { const text = $('#imp-text').value; imported = { text, result: parseRecipe(text), style: $('#imp-style')?.value || state.style }; render(); }
  else if (act === 'import-apply') applyImport();
  else if (act === 'clear-method') { Object.assign(R(), { method: null, source: null, recipeName: null, templateId: null }); persist(); renderResults(); }
  else if (act === 'start-now') { PL().startAt = null; persist(); renderResults(); }
  else if (act === 'log-new') { logDraft = newBakeFromCurrent(); logId = null; go('log-edit'); }
  else if (act === 'export') exportBakes();
  else if (act === 'photo-remove') { logDraft.photo = null; render(); }
  else if (act === 'bake-edit') { logDraft = structuredClone(await getBake(logId)); go('log-edit'); }
  else if (act === 'bake-use') {
    const b = await getBake(logId);
    if (b && applyRecipe(b.style, b.recipe, b.settings)) { go('calc'); toast(t('Loaded the recipe from “{name}”', { name: b.name })); }
  } else if (act === 'bake-delete' || act === 'reset') {
    if (!el.dataset.armed) {
      const label = el.textContent; el.dataset.armed = '1';
      el.textContent = act === 'reset' ? t('Tap again to reset {style}', { style: t(ST().name) }) : t('Tap again to delete');
      setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.textContent = label; } }, 4000);
      return;
    }
    if (act === 'reset') { state.recipes[state.style] = freshRecipe(state.style); persist(); render(); toast(t('{style} reset to defaults', { style: t(ST().name) })); }
    else { await deleteBake(logId); logId = null; go('log'); toast(t('Bake deleted')); }
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
    const name = $('#save-name').value.trim() || t(ST().name);
    const l = savedList(); l.unshift({ name, style: state.style, at: Date.now(), data: encodeRecipe() }); setSaved(l);
    render(); toast(t('Saved “{name}”', { name }));
  } else if (e.target.id === 'log-form') saveLogForm();
});

document.addEventListener('change', async e => {
  const el = e.target;
  if (el.matches('input.val[data-key]')) { setValue(el.dataset.key, el.value); return; }
  if (el.matches('input.val[data-flour]')) { setFlour(+el.dataset.flour, Number(el.value.replace(',', '.').replace(/[^\d.]/g, '')) || 0); return; }
  if (el.dataset.flourName != null) { R().flours[+el.dataset.flourName].name = el.value.trim() || `Flour ${+el.dataset.flourName + 1}`; persist(); renderResults(); return; }
  if (el.dataset.rtoggle) { R()[el.dataset.rtoggle] = el.checked; persist(); renderCalc(); return; }
  if (el.id === 'bake-at') { PL().bakeAt = el.value ? new Date(el.value).getTime() : null; persist(); renderResults(); return; }
  if (el.id === 'plan-start') { PL().startAt = el.value ? new Date(el.value).getTime() : null; persist(); renderResults(); return; }
  if (el.id === 'find-style') { findStyle = el.value; render(); return; }
  if (el.id === 'imp-style' && imported) { imported.style = el.value; return; }
  if (el.id === 'lg-photo' && el.files[0]) {
    try {
      // keep typed edits before re-rendering
      logDraft.name = $('#lg-name').value; logDraft.notes = $('#lg-notes').value;
      logDraft.rating = Number(document.querySelector('input[name="lg-rating"]:checked')?.value || 0);
      logDraft.leopardRating = Number(document.querySelector('input[name="lg-leopard"]:checked')?.value || 0);
      logDraft.photo = await shrinkPhoto(el.files[0]); render();
    } catch (err) { toast(t(err.message)); }
    return;
  }
  if (el.id === 'log-import' && el.files[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      const n = await importBakes(Array.isArray(data) ? data : data.bakes || []);
      toast(n ? t('Bakes imported: {n}', { n }) : t('No bakes found in that file')); render();
    } catch { toast(t('That file is not a Prozimi export.')); }
    return;
  }
  if (el.dataset.setting) {
    const k = el.dataset.setting;
    S()[k] = el.type === 'checkbox' ? el.checked : (k === 'oven' || k === 'lang' ? el.value : Number(el.value));
    if (k === 'lang') { setLang(el.value); persist(); render(); return; }
    if (k === 'oven') {
      const o = OVENS[el.value];
      for (const [style, p] of Object.entries(o.presets)) Object.assign(state.recipes[style], p);
      toast(t('Oven set: {name}', { name: t(o.name) }));
    }
    if (k === 'floursCount') for (const key of Object.keys(state.recipes)) state.recipes[key].flours = normalizeFlours(state.recipes[key].flours, S().floursCount);
    if (k === 'biga' && el.checked) S().poolish = false;
    if (k === 'poolish' && el.checked) S().biga = false;
    persist();
    if (k === 'keepAwake') applyWakeLock();
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
const params = new URLSearchParams(location.search);
if (params.get('r')) {
  if (decodeRecipe(params.get('r'))) setTimeout(() => toast(t('Shared recipe loaded')), 300);
  history.replaceState(null, '', location.pathname);
}
render();
applyWakeLock();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
