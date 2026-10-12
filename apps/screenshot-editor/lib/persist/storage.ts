import { createStore, del, get, keys, set, type UseStore } from "idb-keyval";

// IndexedDB is per origin, and every app on <workspace>.bitbucket.io shares
// one, so the database has the app's own name.
const DATABASE = "screenshot-editor";
const STORE = "autosave";

let store: UseStore | null | undefined;

/** The autosave store, or null where IndexedDB can't be used. */
function getStore(): UseStore | null {
  if (store !== undefined) return store;
  try {
    store =
      typeof indexedDB === "undefined" ? null : createStore(DATABASE, STORE);
  } catch {
    store = null;
  }
  return store;
}

// Every call resolves (never rejects): storage that fails (private windows,
// a full disk, blocked storage) simply turns autosave off.

export async function readValue<T>(key: string): Promise<T | undefined> {
  const db = getStore();
  if (!db) return undefined;
  try {
    return await get<T>(key, db);
  } catch {
    return undefined;
  }
}

export async function writeValue(
  key: string,
  value: unknown,
): Promise<boolean> {
  const db = getStore();
  if (!db) return false;
  try {
    await set(key, value, db);
    return true;
  } catch {
    return false;
  }
}

export async function deleteValue(key: string): Promise<boolean> {
  const db = getStore();
  if (!db) return false;
  try {
    await del(key, db);
    return true;
  } catch {
    return false;
  }
}

export async function listKeys(): Promise<string[] | null> {
  const db = getStore();
  if (!db) return null;
  try {
    return (await keys(db)).map(String);
  } catch {
    return null;
  }
}
