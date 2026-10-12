"use client";

import { useEffect } from "react";
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

/**
 * Restores the last design on startup, then saves the design and its images
 * to IndexedDB shortly after every change. Without working storage the editor
 * simply runs without autosave.
 */
export function useAutosave() {
  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let saving = false;
    let pendingSave = false;
    let enabled = true;
    const written = new Set<string>();
    let unsubscribe: (() => void) | undefined;

    const save = async () => {
      timer = undefined;
      if (!enabled || disposed) return;
      if (saving) {
        pendingSave = true;
        return;
      }
      saving = true;
      const { design, images } = useEditorStore.getState();
      const ok = await saveSnapshot(storage, design, images, written);
      saving = false;
      if (!ok) enabled = false;
      else if (pendingSave) {
        pendingSave = false;
        void save();
      }
    };

    const schedule = () => {
      if (!enabled) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void save(), SAVE_DELAY_MS);
    };

    // Leaving the page: write now rather than after the delay.
    const flush = () => {
      if (timer === undefined || document.visibilityState !== "hidden") return;
      window.clearTimeout(timer);
      void save();
    };

    const store = useEditorStore;
    const startRevision = store.getState().revision;
    store.getState().setRestoring(true);

    void (async () => {
      const restored = await restoreSnapshot(storage, loadImageFromBlob).catch(
        () => null,
      );
      const state = store.getState();
      // Keep what the user did while the restore was running.
      if (disposed || !restored || state.revision !== startRevision) {
        for (const image of restored?.images ?? []) image.release();
      } else {
        state.loadDesign(restored.design, restored.images);
        for (const image of restored.images) written.add(image.id);
      }
      if (disposed) return;
      store.getState().setRestoring(false);

      let revision = store.getState().revision;
      unsubscribe = store.subscribe((next) => {
        if (next.revision === revision) return;
        revision = next.revision;
        schedule();
      });
      // A change made during the restore still needs saving.
      if (revision !== startRevision) schedule();
      document.addEventListener("visibilitychange", flush);
    })();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      unsubscribe?.();
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);
}
