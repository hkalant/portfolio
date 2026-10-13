"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Where the editor switches from the mobile layout to the desktop one. */
export const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Whether a CSS media query matches, updated live. Meant for client-only
 * components (the editor): during server rendering it reports false.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
