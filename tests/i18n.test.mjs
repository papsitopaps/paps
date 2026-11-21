import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYS } from './i18n-keys.mjs';
import { DICTS, t, setLang, detectLang } from '../web/i18n.js';

const ph = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

for (const [lang, dict] of Object.entries(DICTS)) {
  test(`${lang}: every message has a translation with the same placeholders`, () => {
    const missing = [...KEYS.keys()].filter(k => !(k in dict));
    assert.deepEqual(missing, [], `${missing.length} missing`);
    for (const [k, v] of Object.entries(dict)) assert.deepEqual(ph(v), ph(k), `placeholders differ for "${k}"`);
  });
}

test('t() fills placeholders, falls back to English and handles message objects', () => {
  setLang('es');
  assert.equal(t('{n} h', { n: 8 }), '8 h');
  assert.equal(t({ k: 'Use {v}%', p: { v: 64 } }), 'Usar 64 %');
  assert.equal(t('A string nobody translated'), 'A string nobody translated');
  setLang('ja');
  assert.equal(t('Water'), '水');
  setLang('en');
  assert.equal(t('Water'), 'Water');
});

test('language detection', () => {
  assert.equal(detectLang(['el-GR', 'en']), 'el');
  assert.equal(detectLang(['fr-FR', 'es-MX']), 'es');
  assert.equal(detectLang(['ja']), 'ja');
  assert.equal(detectLang(['de-DE']), 'en');
});
