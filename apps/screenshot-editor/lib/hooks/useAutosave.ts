"use client";

import { useLayoutEffect } from "react";
import { loadImageFromBlob } from "@/lib/image/load";
import {
  restoreSnapshot,
  saveSnapshot,
  type AutosaveStorage,
} from "@/lib/persist/autosave";
import {
  deleteValue,
  listKeys,
  readValue,
  writeValue,
} from "@/lib/persist/storage";
import { useEditorStore } from "@/lib/store/editor";

const SAVE_DELAY_MS = 600;

const storage: AutosaveStorage = {
  read: readValue,
  write: writeValue,
  remove: deleteValue,
  keys: listKeys,
};

// Off for the rest of the page's life once a save fails (private windows,
// blocked or full storage).
let storageWorks = true;

// The store outlives the editor page (client-side navigation keeps it), so
// the saved design is read once per page load, never over a live design.
let restoration: Promise<void> | null = null;

function restoreOnce(): Promise<void> {
  restoration ??= (async () => {
    const store = useEditorStore;
    const startRevision = store.getState().revision;
    store.getState().setRestoring(true);
    const restored = await restoreSnapshot(storage, loadImageFromBlob).catch(
      () => null,
    );
    const state = store.getState();
    // Keep what the user did while the restore was running.
    if (restored && state.revision === startRevision)
      state.loadDesign(restored.design, restored.images);
    else for (const image of restored?.images ?? []) image.release();
    store.getState().setRestoring(false);
  })();
  return restoration;
}

/**
 * Restores the last design on startup, then saves the design and its images
 * to IndexedDB shortly after every change. Without working storage the editor
 * simply runs without autosave.
 */
export function useAutosave() {
  // A layout effect, so "Restoring…" shows from the first paint.
  useLayoutEffect(() => {
    const store = useEditorStore;
    let disposed = false;
    let timer: number | undefined;
    let saving = false;
    let pendingSave = false;
    let unsubscribe: (() => void) | undefined;

    const save = async () => {
      timer = undefined;
      if (!storageWorks) return;
      if (saving) {
        pendingSave = true;
        return;
      }
      saving = true;
      const { design, images } = store.getState();
      if (!(await saveSnapshot(storage, design, images))) storageWorks = false;
      saving = false;
      if (pendingSave) {
        pendingSave = false;
        void save();
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void save(), SAVE_DELAY_MS);
    };

    // Write a waiting change now: when the page is hidden or the editor closes.
    const flush = () => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      void save();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    void restoreOnce().then(() => {
      if (disposed) return;
      let revision = store.getState().revision;
      unsubscribe = store.subscribe((next) => {
        if (next.revision === revision) return;
        revision = next.revision;
        schedule();
      });
      // Save what is there now: a restored design, a change made during the
      // restore, or the live design when the editor opens again.
      if (revision > 0) schedule();
      document.addEventListener("visibilitychange", onVisibilityChange);
    });

    return () => {
      disposed = true;
      unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, []);
}
