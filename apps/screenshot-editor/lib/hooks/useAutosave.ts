"use client";

import { useLayoutEffect } from "react";
import { referencedImageIds } from "@/lib/design/refs";
import { loadImageFromBlob } from "@/lib/image/load";
import {
  restoreSnapshot,
  saveSnapshot,
  saveSnapshotNow,
  type AutosaveStorage,
} from "@/lib/persist/autosave";
import {
  deleteValue,
  listKeys,
  readValue,
  writeNow,
  writeValue,
} from "@/lib/persist/storage";
import { useEditorStore } from "@/lib/store/editor";

const SAVE_DELAY_MS = 600;
// Steady editing (typing a title) still saves at least this often.
const SAVE_MAX_WAIT_MS = 3000;
// A storage that never answers (a stuck IndexedDB open) must not keep the
// editor on "Restoring…" for good.
const RESTORE_READ_TIMEOUT_MS = 5000;

const storage: AutosaveStorage = {
  read: readValue,
  write: writeValue,
  remove: deleteValue,
  keys: listKeys,
  writeNow,
};

// Off for the rest of the page's life once a save fails (private windows,
// blocked or full storage) or storage stops answering.
let storageWorks = true;

// Images this page knows are saved, so a save on hide skips them.
const storedImageIds = new Set<string>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Storage did not answer")),
      ms,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const restoreStorage: AutosaveStorage = {
  ...storage,
  read: <T>(key: string) =>
    withTimeout(readValue<T>(key), RESTORE_READ_TIMEOUT_MS).catch(
      (error: unknown) => {
        storageWorks = false;
        throw error;
      },
    ),
};

// The store outlives the editor page (client-side navigation keeps it), so
// the saved design is read once per page load, never over a live design.
let restoration: Promise<void> | null = null;

function restoreOnce(): Promise<void> {
  restoration ??= (async () => {
    const store = useEditorStore;
    const startRevision = store.getState().revision;
    store.getState().setRestoring(true);
    const restored = await restoreSnapshot(
      restoreStorage,
      loadImageFromBlob,
    ).catch(() => null);
    const state = store.getState();
    // Keep what the user did while the restore was running.
    if (restored && state.revision === startRevision) {
      state.loadDesign(restored.design, restored.images);
      for (const image of restored.images) storedImageIds.add(image.id);
    } else for (const image of restored?.images ?? []) image.release();
    store.getState().setRestoring(false);
  })();
  return restoration;
}

/**
 * Restores the last design on startup, then saves the design and its images
 * to IndexedDB shortly after every change, and at once when the page is
 * hidden or closed. Without working storage the editor simply runs without
 * autosave.
 */
export function useAutosave() {
  // A layout effect, so "Restoring…" shows from the first paint.
  useLayoutEffect(() => {
    const store = useEditorStore;
    let disposed = false;
    let timer: number | undefined;
    // When the oldest change not yet saved was made.
    let waitingSince: number | undefined;
    let saving = false;
    let pendingSave = false;
    // The newest revision known to be in storage (or committed to it).
    let writtenRevision = -1;
    let unsubscribe: (() => void) | undefined;

    const save = async () => {
      window.clearTimeout(timer);
      timer = undefined;
      waitingSince = undefined;
      if (!storageWorks) return;
      if (saving) {
        pendingSave = true;
        return;
      }
      saving = true;
      const { design, images, revision } = store.getState();
      if (await saveSnapshot(storage, design, images)) {
        writtenRevision = Math.max(writtenRevision, revision);
        storedImageIds.clear();
        for (const id of referencedImageIds(design)) storedImageIds.add(id);
      } else storageWorks = false;
      saving = false;
      if (pendingSave) {
        pendingSave = false;
        void save();
      }
    };

    const schedule = () => {
      const now = performance.now();
      waitingSince ??= now;
      window.clearTimeout(timer);
      const delay = Math.min(
        SAVE_DELAY_MS,
        Math.max(0, waitingSince + SAVE_MAX_WAIT_MS - now),
      );
      timer = window.setTimeout(() => void save(), delay);
    };

    // The page is being hidden or closed: write any unsaved change now. A
    // closing page never gets the replies saveSnapshot waits for, so the
    // design goes in one write committed straight away, and then the full
    // save runs too in case the page stays (a tab switch).
    const flush = () => {
      const { design, images, revision } = store.getState();
      if (!storageWorks || revision <= writtenRevision) return;
      if (saveSnapshotNow(storage, design, images, storedImageIds)) {
        writtenRevision = revision;
        for (const id of referencedImageIds(design)) storedImageIds.add(id);
      }
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
      window.addEventListener("pagehide", flush);
    });

    return () => {
      disposed = true;
      unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      // The editor is closing: keep a change still waiting for its save.
      if (timer !== undefined) flush();
    };
  }, []);
}
