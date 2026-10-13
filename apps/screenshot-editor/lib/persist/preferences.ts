// Small per-browser preferences in localStorage, such as the theme and the
// export options. Keys carry the app's name because every app on the same
// bitbucket.io site shares one localStorage.
const PREFIX = "screenshot-editor:";

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Storage can be full or blocked; the preference just isn't remembered.
  }
}

export function removePreference(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to remove where storage is blocked.
  }
}

/** Parsed JSON, or null if it is missing or not valid JSON. */
export function readJsonPreference(key: string): unknown {
  const raw = readPreference(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
