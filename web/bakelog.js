// Bake log storage: IndexedDB (room for photos), with a localStorage fallback.
const DB = 'prozimi', STORE = 'bakes', LS_KEY = 'prozimi:bakes:v1';
// Names used before the app was renamed; their data is moved over once.
const OLD_DB = 'impasto', OLD_LS_KEY = 'impasto:bakes:v1';

// Copy bakes from the old database (if it exists) into `db`, then delete the old one.
function migrateOld(db) {
  return new Promise(resolve => {
    try {
      const old = localStorage.getItem(OLD_LS_KEY);
      if (old != null) { if (localStorage.getItem(LS_KEY) == null) localStorage.setItem(LS_KEY, old); localStorage.removeItem(OLD_LS_KEY); }
    } catch {}
    let req;
    try { req = indexedDB.open(OLD_DB, 1); } catch { resolve(); return; }
    let existed = true;
    req.onupgradeneeded = () => { existed = false; req.transaction.abort(); };
    req.onerror = () => { resolve(); };
    req.onsuccess = () => {
      const odb = req.result;
      if (!existed || !odb.objectStoreNames.contains(STORE)) { odb.close(); resolve(); return; }
      const all = odb.transaction(STORE).objectStore(STORE).getAll();
      all.onsuccess = () => {
        const tx = db.transaction(STORE, 'readwrite');
        for (const b of all.result) tx.objectStore(STORE).put(b);
        tx.oncomplete = () => { odb.close(); indexedDB.deleteDatabase(OLD_DB); resolve(); };
        tx.onerror = () => { odb.close(); resolve(); };
      };
      all.onerror = () => { odb.close(); resolve(); };
    };
  });
}

let dbPromise = null;
function openDb() {
  if (!('indexedDB' in self)) return Promise.reject(new Error('no idb'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => migrateOld(req.result).then(() => resolve(req.result));
      req.onerror = () => reject(req.error);
    }).catch(e => { dbPromise = null; throw e; });
  }
  return dbPromise;
}
function tx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result.result ?? result);
    t.onerror = () => reject(t.error);
  }));
}
// Errors carry a message the app shows (translated) and `saved` when the bake was still stored.
const fail = (msg, saved = false) => Object.assign(new Error(msg), { saved });
const dbOrNull = () => openDb().catch(() => null);
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const lsWrite = list => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; } catch { return false; } };

// The database is used whenever it opens; localStorage only when it can't (e.g. some private modes).
// Bakes that older versions put in localStorage are still listed.
export async function listBakes() {
  const db = await dbOrNull();
  let all = lsRead();
  if (db) {
    try { const idb = await tx('readonly', s => s.getAll()); const ids = new Set(idb.map(b => b.id)); all = [...idb, ...all.filter(b => !ids.has(b.id))]; }
    catch { /* fall back to what localStorage has */ }
  }
  return all.sort((a, b) => b.bakedAt - a.bakedAt);
}

export async function getBake(id) {
  const db = await dbOrNull();
  if (db) { try { const b = await tx('readonly', s => s.get(id)); if (b) return b; } catch {} }
  return lsRead().find(b => b.id === id);
}

const FULL = 'Not enough storage to save this bake. Remove the photo, or export your bakes and delete old ones.';
export async function putBake(bake) {
  bake.updatedAt = Date.now();
  if (await dbOrNull()) {
    try { await tx('readwrite', s => s.put(bake)); }
    catch (e) { throw fail(e?.name === 'QuotaExceededError' ? FULL : 'The bake could not be saved. Try again, or export your bakes as a backup.'); }
    const old = lsRead(); if (old.some(b => b.id === bake.id)) lsWrite(old.filter(b => b.id !== bake.id));
    return bake;
  }
  const list = lsRead().filter(b => b.id !== bake.id);
  if (lsWrite([...list, bake])) return bake;
  if (bake.photo) {
    const { photo, ...rest } = bake;
    if (lsWrite([...list, rest])) { delete bake.photo; throw fail('Storage is full, so the bake was saved without its photo.', true); }
  }
  throw fail('Storage is full, so the bake was not saved. Export your bakes and delete old ones to make room.');
}

export async function deleteBake(id) {
  if (await dbOrNull()) { try { await tx('readwrite', s => s.delete(id)); } catch {} }
  const old = lsRead(); if (old.some(b => b.id === id)) lsWrite(old.filter(b => b.id !== id));
}

/** Import bakes from a backup. Photos must be image data. On a save error the error carries `imported`. */
export async function importBakes(list) {
  let n = 0;
  for (const b of list) {
    if (!b || typeof b.id !== 'string' || !b.recipe || typeof b.recipe !== 'object') continue;
    if (typeof b.photo !== 'string' || !b.photo.startsWith('data:image/')) delete b.photo;
    if (!b.settings || typeof b.settings !== 'object') b.settings = {};
    if (!b.summary || typeof b.summary !== 'object' || !Array.isArray(b.summary.rows)) b.summary = { dough: Number(b.summary?.dough) || 0, rows: [] };
    if (typeof b.name !== 'string') b.name = 'Bake';
    if (!Number.isFinite(b.bakedAt)) b.bakedAt = Date.now();
    try { await putBake(b); } catch (e) { if (!e.saved) { e.imported = n; throw e; } }
    n++;
  }
  return n;
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Shrink a photo to a JPEG data URL, longest side `max` px.
export function shrinkPhoto(file, max = 900, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image this browser can read.')); };
    img.src = url;
  });
}
