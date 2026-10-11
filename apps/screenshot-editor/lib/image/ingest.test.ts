import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "@/lib/store/editor";
import { IMAGE_MESSAGES } from "./accept";
import { ingestFile } from "./ingest";
import { ImageLoadError, loadImageFromBlob, type LoadedImage } from "./load";

vi.mock("./load", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./load")>()),
  loadImageFromBlob: vi.fn(),
}));

const load = vi.mocked(loadImageFromBlob);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const fakeImage = (id: string): LoadedImage => ({
  id,
  name: `${id}.png`,
  source: {} as HTMLImageElement,
  width: 100,
  height: 50,
  release: vi.fn(),
});

const png = (name: string) => new File(["x"], name, { type: "image/png" });
const state = () => useEditorStore.getState();

beforeEach(() => {
  load.mockReset();
  useEditorStore.setState(useEditorStore.getInitialState(), true);
});

describe("ingestFile", () => {
  it("lets the newest image win when loads finish out of order", async () => {
    const first = deferred<LoadedImage>();
    const second = deferred<LoadedImage>();
    load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstDone = ingestFile(png("a.png"));
    const secondDone = ingestFile(png("b.png"));
    expect(state().loading).toBe(true);

    second.resolve(fakeImage("b"));
    await secondDone;
    expect(state().design.layers[0].imageId).toBe("b");
    expect(state().loading).toBe(false);

    const stale = fakeImage("a");
    first.resolve(stale);
    await firstDone;
    expect(state().design.layers[0].imageId).toBe("b");
    expect(stale.release).toHaveBeenCalledTimes(1);
    expect(state().loading).toBe(false);
  });

  it("ignores a failure from an older load", async () => {
    const first = deferred<LoadedImage>();
    load
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(fakeImage("b"));
    const firstDone = ingestFile(png("a.png"));
    await ingestFile(png("b.png"));
    first.reject(new ImageLoadError("unreadable"));
    await firstDone;
    expect(state().notice).toBeNull();
    expect(state().design.layers[0].imageId).toBe("b");
  });

  it("rejects unsupported files without loading them, and cancels a load in flight", async () => {
    const first = deferred<LoadedImage>();
    load.mockReturnValueOnce(first.promise);
    const firstDone = ingestFile(png("a.png"));
    await ingestFile(new File(["x"], "anim.gif", { type: "image/gif" }));
    expect(load).toHaveBeenCalledTimes(1);
    expect(state().notice?.message).toBe(IMAGE_MESSAGES.unsupported);
    expect(state().loading).toBe(false);

    const stale = fakeImage("a");
    first.resolve(stale);
    await firstDone;
    expect(state().design.layers[0].imageId).toBeNull();
    expect(stale.release).toHaveBeenCalledTimes(1);
  });

  it("explains why an image could not be loaded", async () => {
    load.mockRejectedValueOnce(new ImageLoadError("tooManyPixels"));
    await ingestFile(png("huge.png"));
    expect(state().notice?.message).toBe(IMAGE_MESSAGES.tooManyPixels);

    load.mockRejectedValueOnce(new ImageLoadError("unreadable"));
    await ingestFile(png("broken.png"));
    expect(state().notice?.message).toBe(IMAGE_MESSAGES.unreadable);
    expect(state().loading).toBe(false);
  });
});
