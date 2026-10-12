import { defaultBackground } from "@/lib/design/defaults";
import { migrateDesign } from "@/lib/design/migrate";
import { referencedImageIds } from "@/lib/design/refs";
import type { Design } from "@/lib/design/schema";
import type { LoadedImage } from "@/lib/image/load";

export const DESIGN_KEY = "design";
const IMAGE_PREFIX = "image:";
export const imageKey = (id: string) => `${IMAGE_PREFIX}${id}`;

export type SavedDesign = { design: unknown; savedAt: number };
export type SavedImage = { blob: Blob; name: string };

/** The storage calls autosave needs; lib/persist/storage.ts in the app, a Map in tests. */
export type AutosaveStorage = {
  read: <T>(key: string) => Promise<T | undefined>;
  write: (key: string, value: unknown) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
  keys: () => Promise<string[] | null>;
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
 */
export async function saveSnapshot(
  storage: AutosaveStorage,
  design: Design,
  images: Record<string, LoadedImage>,
): Promise<boolean> {
  const ids = referencedImageIds(design);
  const stored = new Set((await storage.keys()) ?? []);
  for (const id of ids) {
    const image = images[id];
    if (stored.has(imageKey(id)) || !image) continue;
    const record: SavedImage = { blob: image.blob, name: image.name };
    if (!(await storage.write(imageKey(id), record))) return false;
  }
  const saved: SavedDesign = { design, savedAt: Date.now() };
  if (!(await storage.write(DESIGN_KEY, saved))) return false;

  const keep = new Set(ids.map(imageKey));
  for (const key of stored)
    if (key.startsWith(IMAGE_PREFIX) && !keep.has(key))
      await storage.remove(key);
  return true;
}

function isSavedImage(value: unknown): value is SavedImage {
  const record = value as Partial<SavedImage> | null | undefined;
  return (
    !!record &&
    record.blob instanceof Blob &&
    record.blob.size > 0 &&
    typeof record.name === "string"
  );
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
  for (const id of referencedImageIds(design)) {
    const record = await storage.read(imageKey(id));
    if (!isSavedImage(record)) {
      missing.add(id);
      continue;
    }
    try {
      images.push(await loadImage(record.blob, record.name, { id }));
    } catch {
      missing.add(id);
    }
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
