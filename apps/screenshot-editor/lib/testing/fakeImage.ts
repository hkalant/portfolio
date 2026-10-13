import { vi } from "vitest";
import type { LoadedImage } from "@/lib/image/load";

/** A LoadedImage for unit tests: no pixels, a spy for release(). */
export function fakeImage(id: string, width = 1200, height = 750): LoadedImage {
  return {
    id,
    name: `${id}.png`,
    blob: new Blob([id], { type: "image/png" }),
    source: {} as HTMLImageElement,
    width,
    height,
    release: vi.fn(),
  };
}
