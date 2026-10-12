"use client";

import { useEffect, useSyncExternalStore } from "react";
import { readPreference, writePreference } from "@/lib/persist/preferences";
import {
  applyTheme,
  DARK_SCHEME_QUERY,
  parseThemePreference,
  resolveTheme,
  THEME_PREFERENCE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";
import { useMediaQuery } from "./useMediaQuery";

// One preference for the page, shared by every component that uses the hook.
// It is kept in memory too, so a choice still holds when storage is blocked.
let current: ThemePreference | null = null;
const listeners = new Set<() => void>();

function getPreference(): ThemePreference {
  current ??= parseThemePreference(readPreference(THEME_PREFERENCE_KEY));
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setPreference(preference: ThemePreference) {
  current = preference;
  writePreference(THEME_PREFERENCE_KEY, preference);
  for (const listener of listeners) listener();
}

/**
 * The interface theme. Puts it on <html> (the `dark` class and color-scheme),
 * and follows the system setting live while the preference is "system".
 * The inline script in app/layout.tsx applies the same theme before the first
 * paint; this keeps it up to date afterwards.
 */
export function useTheme(): {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
} {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    () => "system" as const,
  );
  const systemDark = useMediaQuery(DARK_SCHEME_QUERY);
  const theme = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  return { preference, theme, setPreference };
}
