import { defaultBackground } from "@/lib/design/defaults";
import { migrateDesign } from "@/lib/design/migrate";
import { referencedImageIds } from "@/lib/design/refs";
import type { Design } from "@/lib/design/schema";
import type { LoadedImage } from "@/lib/image/load";

export const DESIGN_KEY = "design";
const IMAGE_PREFIX = "image:";
export const imageKey = (id: string) => `${IMAGE_PREFIX}${id}`;

export type SavedDesign = { design: unknown; savedAt: number };

function isSavedDesign(value: unknown): value is SavedDesign {
  const saved = value as Partial<SavedDesign> | null | undefined;
  return (
    !!saved &&
    typeof saved.savedAt === "number" &&
    Number.isFinite(saved.savedAt) &&
    migrateDesign(saved.design) !== null
  );
}

/**
 * The newer of the design in storage and the copy kept as the page closed
 * (see useAutosave). A tie goes to the copy, written after the storage save.
 */
export function newerSavedDesign(
  stored: unknown,
  pending: unknown,
): SavedDesign | undefined {
  const a = isSavedDesign(stored) ? stored : undefined;
  const b = isSavedDesign(pending) ? pending : undefined;
  if (!a || !b) return b ?? a;
  return b.savedAt >= a.savedAt ? b : a;
}
/**
 * An image as stored: its bytes, because WebKit in private browsing can't
 * store a Blob in IndexedDB (the write fails, and with it the design).
 * Records saved earlier hold the Blob itself, and still restore.
 */
export type SavedImage =
  | { bytes: ArrayBuffer; type: string; name: string }
  | { blob: Blob; name: string };

// Bytes already read from an image's Blob, so the unload save (which can't
// wait to read them) can still store bytes.
const imageBytes = new WeakMap<Blob, ArrayBuffer>();

async function imageRecord(image: LoadedImage): Promise<SavedImage> {
  let bytes = imageBytes.get(image.blob);
  if (!bytes) {
    bytes = await image.blob.arrayBuffer();
    imageBytes.set(image.blob, bytes);
  }
  return { bytes, type: image.blob.type, name: image.name };
}

/** The record without waiting: bytes if they were read before, else the Blob. */
function imageRecordNow(image: LoadedImage): SavedImage {
  const bytes = imageBytes.get(image.blob);
  return bytes
    ? { bytes, type: image.blob.type, name: image.name }
    : { blob: image.blob, name: image.name };
}

/** The storage calls autosave needs; lib/persist/storage.ts in the app, a Map in tests. */
export type AutosaveStorage = {
  read: <T>(key: string) => Promise<T | undefined>;
  write: (key: string, value: unknown) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
  keys: () => Promise<string[] | null>;
  /** Writes entries in one go without waiting (see saveSnapshotNow). */
  writeNow?: (entries: [string, unknown][]) => boolean;
};

type LoadImage = (
  blob: Blob,
  name: string,
  options: { id: string },
) => Promise<LoadedImage>;

/**
 * Saves the design and the images it uses. An image is written only when its
 * key isn't stored yet, and before the design, so a saved design never refers
 * to an image that isn't stored. Reading the keys each time (rather than
 * remembering what this tab wrote) keeps this right when another tab saved in
 * between. Images the design no longer uses are deleted. False if storage failed.
 *
 * `isCurrent` is asked just before the design is written: when a newer design
 * was saved meanwhile (by saveSnapshotNow as the page closed), this older one
 * is neither written over it nor allowed to delete the images it uses.
 */
export async function saveSnapshot(
  storage: AutosaveStorage,
  design: Design,
  images: Record<string, LoadedImage>,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  const ids = referencedImageIds(design);
  const stored = new Set((await storage.keys()) ?? []);
  for (const id of ids) {
    const image = images[id];
    if (stored.has(imageKey(id)) || !image) continue;
    if (!(await storage.write(imageKey(id), await imageRecord(image))))
      return false;
  }
  if (!isCurrent()) return true;
  const saved: SavedDesign = { design, savedAt: Date.now() };
  if (!(await storage.write(DESIGN_KEY, saved))) return false;

  const keep = new Set(ids.map(imageKey));
  for (const key of stored)
    if (key.startsWith(IMAGE_PREFIX) && !keep.has(key))
      await storage.remove(key);
  return true;
}

/**
 * Saves the design at once, for a page that is being hidden or closed, where
 * saveSnapshot's first read would never get its answer. The design goes in
 * one transaction with every image it uses: another tab may have deleted
 * any of them since this tab last saved. Images no longer used are left for the next
 * saveSnapshot to delete. False if this storage can't write this way.
 */
export function saveSnapshotNow(
  storage: AutosaveStorage,
  design: Design,
  images: Record<string, LoadedImage>,
): boolean {
  if (!storage.writeNow) return false;
  const entries: [string, unknown][] = [];
  for (const id of referencedImageIds(design)) {
    const image = images[id];
    if (!image) continue;
    entries.push([imageKey(id), imageRecordNow(image)]);
  }
  const saved: SavedDesign = { design, savedAt: Date.now() };
  entries.push([DESIGN_KEY, saved]);
  return storage.writeNow(entries);
}

/** The saved image as a Blob, or null if the record isn't a usable image. */
function savedImageBlob(value: unknown): { blob: Blob; name: string } | null {
  const record = value as
    | { bytes?: unknown; type?: unknown; blob?: unknown; name?: unknown }
    | null
    | undefined;
  if (!record || typeof record.name !== "string") return null;
  if (record.bytes instanceof ArrayBuffer && record.bytes.byteLength > 0) {
    const type = typeof record.type === "string" ? record.type : "";
    const blob = new Blob([record.bytes], { type });
    imageBytes.set(blob, record.bytes);
    return { blob, name: record.name };
  }
  if (record.blob instanceof Blob && record.blob.size > 0)
    return { blob: record.blob, name: record.name };
  return null;
}

/**
 * The saved design with its images decoded, or null if nothing valid is
 * saved. An image that is missing or can't be decoded is dropped: no
 * screenshot, or the default background.
 */
export async function restoreSnapshot(
  storage: AutosaveStorage,
  loadImage: LoadImage,
): Promise<{ design: Design; images: LoadedImage[] } | null> {
  const saved = await storage.read<SavedDesign>(DESIGN_KEY);
  let design = saved ? migrateDesign(saved.design) : null;
  if (!design) return null;

  const images: LoadedImage[] = [];
  const missing = new Set<string>();
  try {
    for (const id of referencedImageIds(design)) {
      const record = savedImageBlob(await storage.read(imageKey(id)));
      if (!record) {
        missing.add(id);
        continue;
      }
      try {
        images.push(await loadImage(record.blob, record.name, { id }));
      } catch {
        missing.add(id);
      }
    }
  } catch (error) {
    // A read failed (storage stopped answering): free what was decoded.
    for (const image of images) image.release();
    throw error;
  }

  const [shot] = design.layers;
  if (shot.imageId && missing.has(shot.imageId))
    design = { ...design, layers: [{ ...shot, imageId: null }] };
  const { background } = design;
  if (
    background.kind === "image" &&
    background.source.type === "upload" &&
    missing.has(background.source.imageId)
  )
    design = { ...design, background: defaultBackground() };

  return { design, images };
}
