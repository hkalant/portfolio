import { describe, expect, it, vi } from "vitest";
import { createDefaultDesign, defaultBackground } from "@/lib/design/defaults";
import type { Design } from "@/lib/design/schema";
import type { LoadedImage } from "@/lib/image/load";
import { fakeImage } from "@/lib/testing/fakeImage";
import {
  DESIGN_KEY,
  imageKey,
  restoreSnapshot,
  saveSnapshot,
  type AutosaveStorage,
} from "./autosave";

function memoryStorage(failWrites = false) {
  const map = new Map<string, unknown>();
  const storage: AutosaveStorage = {
    read: async <T>(key: string) => map.get(key) as T | undefined,
    write: vi.fn(async (key: string, value: unknown) => {
      if (failWrites) return false;
      map.set(key, value);
      return true;
    }),
    remove: async (key: string) => map.delete(key),
    keys: async () => [...map.keys()],
  };
  return { map, storage };
}

function designWith(shotId: string | null, backgroundId?: string): Design {
  const design = createDefaultDesign();
  return {
    ...design,
    background: backgroundId
      ? { kind: "image", source: { type: "upload", imageId: backgroundId } }
      : design.background,
    layers: [{ ...design.layers[0], imageId: shotId }],
  };
}

const loadImage = async (blob: Blob, name: string, { id }: { id: string }) => ({
  ...fakeImage(id),
  name,
  blob,
});

describe("saveSnapshot", () => {
  it("writes the images once, then the design, and deletes unused images", async () => {
    const { map, storage } = memoryStorage();
    const images: Record<string, LoadedImage> = {
      a: fakeImage("a"),
      bg: fakeImage("bg"),
      b: fakeImage("b"),
    };

    expect(await saveSnapshot(storage, designWith("a", "bg"), images)).toBe(
      true,
    );
    expect([...map.keys()].sort()).toEqual([
      DESIGN_KEY,
      imageKey("a"),
      imageKey("bg"),
    ]);

    await saveSnapshot(storage, designWith("a", "bg"), images);
    // Two images and two designs: images are not rewritten.
    expect(storage.write).toHaveBeenCalledTimes(4);

    await saveSnapshot(storage, designWith("b"), images);
    expect([...map.keys()].sort()).toEqual([DESIGN_KEY, imageKey("b")]);
  });

  it("rewrites an image another tab deleted", async () => {
    const { map, storage } = memoryStorage();
    const images = { a: fakeImage("a"), b: fakeImage("b") };
    // Tab 1 saves A, tab 2 saves B (deleting A), then tab 1 saves again.
    await saveSnapshot(storage, designWith("a"), images);
    await saveSnapshot(storage, designWith("b"), images);
    await saveSnapshot(storage, designWith("a"), images);
    expect([...map.keys()].sort()).toEqual([DESIGN_KEY, imageKey("a")]);
  });

  it("reports failing storage", async () => {
    const { storage } = memoryStorage(true);
    expect(
      await saveSnapshot(storage, designWith("a"), { a: fakeImage("a") }),
    ).toBe(false);
  });
});

describe("restoreSnapshot", () => {
  it("restores the design and decodes its images with their ids", async () => {
    const { storage } = memoryStorage();
    const design = designWith("a", "bg");
    await saveSnapshot(storage, design, {
      a: fakeImage("a"),
      bg: fakeImage("bg"),
    });
    const restored = await restoreSnapshot(storage, loadImage);
    expect(restored?.design).toEqual(design);
    expect(restored?.images.map((image) => image.id)).toEqual(["a", "bg"]);
  });

  it("drops images that are missing or can't be decoded", async () => {
    const { map, storage } = memoryStorage();
    await saveSnapshot(storage, designWith("a", "bg"), {
      a: fakeImage("a"),
      bg: fakeImage("bg"),
    });
    map.delete(imageKey("bg"));
    const failing = async () => {
      throw new Error("decode failed");
    };
    const restored = await restoreSnapshot(storage, failing);
    expect(restored?.images).toEqual([]);
    expect(restored?.design.layers[0].imageId).toBeNull();
    expect(restored?.design.background).toEqual(defaultBackground());
  });

  it("returns null for nothing saved or an invalid design", async () => {
    const { map, storage } = memoryStorage();
    expect(await restoreSnapshot(storage, loadImage)).toBeNull();
    map.set(DESIGN_KEY, { design: { version: 99 }, savedAt: 1 });
    expect(await restoreSnapshot(storage, loadImage)).toBeNull();
  });
});
