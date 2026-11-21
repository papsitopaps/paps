// Tiny i18n: messages are written in English with {placeholders}; the English text is the key.
// Locale files map English keys to translations. Missing keys fall back to English.
import el from './locales/el.js';
import es from './locales/es.js';
import ja from './locales/ja.js';

export const LANGS = { en: 'English', el: 'Ελληνικά', es: 'Español', ja: '日本語' };
export const DICTS = { el, es, ja };

let lang = 'en';
export const getLang = () => lang;
export function setLang(l) { lang = LANGS[l] ? l : 'en'; }

/** Pick a supported language from a browser language list, e.g. navigator.languages. */
export function detectLang(list = []) {
  for (const l of list) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS[k]) return k; }
  return 'en';
}

const fill = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => (p[k] ?? m)) : s;

/**
 * Translate a message. `m` is an English key, or a message object { k, p } produced by the
 * pure modules (engine, leopard, planner). `p` holds placeholder values.
 */
export function t(m, p) {
  if (m == null) return '';
  if (typeof m === 'object') return t(m.k, m.p);
  const d = DICTS[lang];
  return fill((d && d[m]) || m, p);
}

/** Message object helper for pure modules: keeps text translatable without importing locales. */
export const msg = (k, p) => (p ? { k, p } : k);
