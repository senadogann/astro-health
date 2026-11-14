// Local demo database: IndexedDB is the primary store; localStorage is a fallback.
// No server or account is required, so the prototype also works offline.
const DB_NAME = 'astroself-local';
const DB_VERSION = 1;
const STORES = ['profiles', 'checkins', 'routines'];
const SNAPSHOT_KEY = 'main';

let dbPromise;

export function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (!('indexedDB' in window)) return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('checkins')) db.createObjectStore('checkins', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('routines')) db.createObjectStore('routines', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

export async function readSnapshot() {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction('profiles', 'readonly').objectStore('profiles').get(SNAPSHOT_KEY);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function writeSnapshot(value) {
  const db = await openDatabase();
  if (!db) {
    try { localStorage.setItem('astroself.v1', JSON.stringify(value)); } catch { /* unavailable */ }
    return false;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES, 'readwrite');
      tx.objectStore('profiles').put({ id: SNAPSHOT_KEY, updatedAt: new Date().toISOString(), value });
      const checkins = tx.objectStore('checkins');
      checkins.clear();
      for (const entry of value.entries || []) checkins.put(entry);
      const routines = tx.objectStore('routines');
      routines.clear();
      for (const [id, date] of Object.entries(value.tasks || {})) routines.put({ id, date });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => {
        try { localStorage.setItem('astroself.v1', JSON.stringify(value)); } catch { /* unavailable */ }
        resolve(false);
      };
    } catch { resolve(false); }
  });
}
