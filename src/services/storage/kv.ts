/* Almacenamiento local en IndexedDB (clave → valor). Si IndexedDB no está disponible
   (modo privado, WebView raro) cae a memoria para que la app no se rompa. */

const DB_NAME = 'lsl27';
const STORE = 'kv';
const mem = new Map<string, unknown>();
let dbp: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const r = run(db.transaction(STORE, mode).objectStore(STORE));
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  if (mem.has(key)) return mem.get(key) as T;
  const v = await tx<T>('readonly', (s) => s.get(key) as IDBRequest<T>);
  return v === undefined ? fallback : v;
}

export async function kvSet(key: string, value: unknown): Promise<boolean> {
  mem.set(key, value);
  const db = await open();
  if (!db) return false;
  await tx('readwrite', (s) => s.put(value, key));
  return true;
}

export async function kvDel(key: string): Promise<void> {
  mem.delete(key);
  await tx('readwrite', (s) => s.delete(key));
}

/* ---------- localStorage con try/catch (solo para cosas chiquitas y síncronas) ---------- */
export const ls = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* sin espacio o bloqueado: seguimos sin guardar */
    }
  },
  del(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nada */
    }
  },
};
