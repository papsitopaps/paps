// Bake log storage: IndexedDB (room for photos), with a localStorage fallback.
const DB = 'impasto', STORE = 'bakes', LS_KEY = 'impasto:bakes:v1';

let dbPromise = null;
function openDb() {
  if (!('indexedDB' in self)) return Promise.reject(new Error('no idb'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
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
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const lsWrite = list => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; } catch { return false; } };

export async function listBakes() {
  try {
    const all = await tx('readonly', s => s.getAll());
    return all.sort((a, b) => b.bakedAt - a.bakedAt);
  } catch { return lsRead().sort((a, b) => b.bakedAt - a.bakedAt); }
}

export async function getBake(id) {
  try { return await tx('readonly', s => s.get(id)); }
  catch { return lsRead().find(b => b.id === id); }
}

export async function putBake(bake) {
  bake.updatedAt = Date.now();
  try { await tx('readwrite', s => s.put(bake)); }
  catch {
    const list = lsRead().filter(b => b.id !== bake.id); list.push(bake);
    if (!lsWrite(list)) { delete bake.photo; lsWrite(list); throw new Error('Storage is full. The bake was saved without its photo.'); }
  }
  return bake;
}

export async function deleteBake(id) {
  try { await tx('readwrite', s => s.delete(id)); }
  catch { lsWrite(lsRead().filter(b => b.id !== id)); }
}

export async function importBakes(list) {
  let n = 0;
  for (const b of list) { if (b && b.id && b.recipe) { await putBake(b); n++; } }
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
