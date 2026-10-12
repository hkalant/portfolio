import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign, defaultShotStyle } from "@/lib/design/defaults";
import { getGradientPreset } from "@/lib/design/gradients";
import { SHADOW_PRESETS } from "@/lib/design/shadows";
import { fakeImage } from "@/lib/testing/fakeImage";
import {
  HISTORY_IMAGE_LIMIT,
  HISTORY_LIMIT,
  MERGE_WINDOW_MS,
  selectActiveImage,
  selectBackgroundImage,
  selectCanRedo,
  selectLastBackgroundUpload,
  selectCanUndo,
  selectShot,
  useEditorStore,
} from "./editor";

const state = () => useEditorStore.getState();
const shot = () => selectShot(state());

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  useEditorStore.setState(useEditorStore.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Moves the clock past the merge window, so the next change is its own step. */
const later = () => vi.advanceTimersByTime(MERGE_WINDOW_MS + 1);

describe("editor store: style", () => {
  it("sets an image and keeps the style settings", () => {
    state().setPadding(100);
    state().setRadius(20);
    state().setShadowPreset("hard");
    state().showError("old error");
    const image = fakeImage("a");
    state().setImage(image);
    expect(shot()).toMatchObject({
      imageId: "a",
      padding: 100,
      radius: 20,
      shadow: { preset: "hard" },
    });
    expect(state().notice).toBeNull();
    expect(selectActiveImage(state())).toBe(image);
  });

  it("clamps and rounds values", () => {
    state().setPadding(999);
    expect(shot().padding).toBe(200);
    state().setPadding(10.6);
    expect(shot().padding).toBe(11);
    state().setRadius(70);
    expect(shot().radius).toBe(64);
    state().setScale(9);
    expect(shot().scale).toBe(1.5);
    state().setRotation(-60.4);
    expect(shot().rotation).toBe(-45);
    state().setPosition(-1, 2);
    expect(shot().position).toEqual({ x: 0, y: 1 });
    state().setBorder({ width: 30, opacity: 2 });
    expect(shot().border).toMatchObject({ width: 24, opacity: 1 });
    state().setInset({ size: -3 });
    expect(shot().inset.size).toBe(0);
    state().setNoise(5);
    state().setBlur(-1);
    expect(state().design.backgroundFx).toEqual({ noise: 1, blur: 0 });
    state().setCustomSize(50, 9000);
    expect(state().design.canvas).toEqual({
      preset: "custom",
      width: 100,
      height: 4000,
    });
  });

  it("ignores values that aren't numbers or colours", () => {
    const before = state().design;
    state().setPadding(Number.NaN);
    state().setSolidColor("red");
    state().setBorder({ color: "#12" });
    state().setFrame({ kind: "tv" as never });
    state().applyMeshPreset("nope");
    state().setWallpaper("nope");
    state().setCanvasPreset("nope");
    expect(state().design).toBe(before);
    expect(state().past).toEqual([]);
  });

  it("applies gradient presets as copies and keeps the gradient kind", () => {
    state().applyGradientPreset("mist");
    const mist = getGradientPreset("mist");
    expect(state().design.background).toEqual({
      kind: "linear",
      presetId: "mist",
      angle: mist?.angle,
      stops: mist?.stops,
    });
    state().setGradientKind("radial");
    state().applyGradientPreset("ocean");
    expect(state().design.background).toMatchObject({
      kind: "radial",
      presetId: "ocean",
    });
    state().setGradientKind("linear");
    expect(state().design.background).toMatchObject({
      kind: "linear",
      presetId: "ocean",
      angle: 135,
    });
  });

  it("edits a gradient stop and forgets the preset", () => {
    state().setGradientStop(1, "#ABCDEF");
    expect(state().design.background).toMatchObject({
      presetId: null,
      stops: [{ offset: 0 }, { offset: 1, color: "#abcdef" }],
    });
    state().setGradientStop(5, "#000000");
    expect(state().design.background).toMatchObject({ presetId: null });
  });

  it("normalises angles", () => {
    state().setGradientAngle(400);
    expect(state().design.background).toMatchObject({ angle: 40 });
    state().setFromImage();
    expect(state().design.background).toEqual({ kind: "fromImage", angle: 40 });
    state().setFromImageAngle(-90);
    expect(state().design.background).toEqual({
      kind: "fromImage",
      angle: 270,
    });
  });

  it("switches background kinds", () => {
    state().setSolidColor("#FF0000");
    expect(state().design.background).toEqual({
      kind: "solid",
      color: "#ff0000",
    });
    state().applyMeshPreset("lagoon");
    expect(state().design.background).toEqual({
      kind: "mesh",
      presetId: "lagoon",
    });
    state().setWallpaper("waves");
    expect(state().design.background).toEqual({
      kind: "image",
      source: { type: "wallpaper", wallpaperId: "waves" },
    });
    const upload = fakeImage("bg");
    state().setBackgroundImage(upload);
    expect(selectBackgroundImage(state())).toBe(upload);
    state().setTransparent();
    expect(state().design.background).toEqual({ kind: "transparent" });
  });

  it("keeps the last uploaded background available after switching away", () => {
    expect(selectLastBackgroundUpload(state())).toBeNull();
    const first = fakeImage("bg-1");
    const second = fakeImage("bg-2");
    state().setBackgroundImage(first);
    later();
    state().setBackgroundImage(second);
    later();
    state().setWallpaper("glow");
    expect(selectBackgroundImage(state())).toBeNull();
    expect(selectLastBackgroundUpload(state())).toBe(second);
    later();
    state().setTransparent();
    expect(selectLastBackgroundUpload(state())).toBe(second);
  });

  it("copies shadow presets, ignores the empty toggle value, and marks edits custom", () => {
    state().setShadowPreset("hard");
    expect(shot().shadow).toEqual(SHADOW_PRESETS.hard);
    expect(shot().shadow).not.toBe(SHADOW_PRESETS.hard);
    state().setShadowPreset("");
    expect(shot().shadow.preset).toBe("hard");
    state().setShadow({ blur: 30.4, color: "#FF00FF" });
    expect(shot().shadow).toEqual({
      ...SHADOW_PRESETS.hard,
      preset: "custom",
      blur: 30,
      color: "#ff00ff",
    });
  });

  it("sets canvas presets and goes back to auto", () => {
    state().setCanvasPreset("og");
    expect(state().design.canvas).toEqual({
      preset: "og",
      width: 1200,
      height: 630,
    });
    state().setCanvasPreset("auto");
    expect(state().design.canvas).toEqual({ preset: "auto" });
  });

  it("nudges and aligns only on fixed canvases", () => {
    state().setImage(fakeImage("a", 800, 400));
    state().nudge(10, 0);
    expect(shot().position).toEqual({ x: 0.5, y: 0.5 });
    state().setCustomSize(1000, 1000);
    state().nudge(10, -20);
    expect(shot().position).toEqual({ x: 0.51, y: 0.48 });
    state().setPadding(50);
    state().setScale(0.5);
    state().alignTo("start", "end");
    // 900 px available: the shot is 450 x 225 at scale 0.5.
    expect(shot().position.x).toBeCloseTo(0.275);
    expect(shot().position.y).toBeCloseTo(0.8375);
  });

  it("limits frame texts and keeps the image and canvas on reset", () => {
    state().setFrame({ kind: "browser", url: "x".repeat(200) });
    expect(shot().frame.url).toHaveLength(120);
    state().setImage(fakeImage("a"));
    state().setCanvasPreset("og");
    state().applyMeshPreset("dusk");
    state().setRotation(10);
    state().resetStyle();
    expect(shot()).toMatchObject({ ...defaultShotStyle(), imageId: "a" });
    expect(state().design.canvas.preset).toBe("og");
    expect(state().design.background).toEqual({
      kind: "mesh",
      presetId: "dusk",
    });
  });
});

describe("editor store: history", () => {
  it("undoes and redoes", () => {
    state().setPadding(100);
    later();
    state().setRadius(30);
    expect(selectCanUndo(state())).toBe(true);
    state().undo();
    expect(shot()).toMatchObject({ padding: 100, radius: 12 });
    state().undo();
    expect(shot().padding).toBe(64);
    expect(selectCanUndo(state())).toBe(false);
    state().undo(); // nothing left: no change
    expect(shot().padding).toBe(64);
    state().redo();
    state().redo();
    expect(shot()).toMatchObject({ padding: 100, radius: 30 });
    expect(selectCanRedo(state())).toBe(false);
  });

  it("merges rapid changes of the same setting into one step", () => {
    state().setPadding(70);
    vi.advanceTimersByTime(200);
    state().setPadding(80);
    vi.advanceTimersByTime(200);
    state().setPadding(90);
    expect(state().past).toHaveLength(1);
    state().undo();
    expect(shot().padding).toBe(64);
  });

  it("starts a new step for another setting, after a pause, or after sealHistory", () => {
    state().setPadding(70);
    state().setRadius(20);
    expect(state().past).toHaveLength(2);
    later();
    state().setRadius(21);
    expect(state().past).toHaveLength(3);
    state().sealHistory();
    state().setRadius(22);
    expect(state().past).toHaveLength(4);
  });

  it("keeps frame and theme choices as separate steps, but merges typing", () => {
    state().setFrame({ kind: "macos" });
    state().setFrame({ kind: "browser" });
    state().setFrame({ theme: "dark" });
    expect(state().past).toHaveLength(3);
    state().setFrame({ url: "a" });
    state().setFrame({ url: "ab" });
    expect(state().past).toHaveLength(4);
    state().setInset({ color: "#123456" });
    state().setInset({ color: "auto" });
    expect(state().past).toHaveLength(6);
  });

  it("drops a merged run that ends where it began, and keeps that state", () => {
    state().setPadding(80);
    state().setPadding(64);
    expect(state().past).toEqual([]);
    state().setPadding(70);
    expect(state().past).toHaveLength(1);
    state().undo();
    expect(shot().padding).toBe(64);
  });

  it("merges a whole gesture however slow it is", () => {
    state().beginGesture();
    state().setPadding(70);
    later();
    state().setPadding(90);
    later();
    state().setPadding(100);
    state().sealHistory();
    expect(state().past).toHaveLength(1);
    // After the gesture, the time limit applies again.
    state().setPadding(110);
    later();
    state().setPadding(120);
    expect(state().past).toHaveLength(3);
  });

  it("ignores changes that change nothing", () => {
    state().setPadding(64);
    state().setShadowPreset("medium");
    expect(state().past).toEqual([]);
    expect(state().revision).toBe(0);
  });

  it("clears redo on a new change and counts every revision", () => {
    state().setPadding(100);
    state().undo();
    expect(selectCanRedo(state())).toBe(true);
    state().setRadius(5);
    expect(selectCanRedo(state())).toBe(false);
    expect(state().revision).toBe(3);
  });

  it("keeps at most HISTORY_LIMIT steps", () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i += 1) {
      later();
      state().setPadding(i % 2 ? 10 : 20);
    }
    expect(state().past).toHaveLength(HISTORY_LIMIT);
  });

  it("can undo removing the screenshot", () => {
    const image = fakeImage("a");
    state().setImage(image);
    state().clearImage();
    expect(selectActiveImage(state())).toBeNull();
    state().pruneImages();
    expect(image.release).not.toHaveBeenCalled();
    state().undo();
    expect(selectActiveImage(state())).toBe(image);
  });

  it("frees images no design in the history uses", () => {
    const a = fakeImage("a");
    const b = fakeImage("b");
    state().setImage(a);
    state().setImage(b);
    state().pruneImages();
    // "a" is still reachable with undo.
    expect(a.release).not.toHaveBeenCalled();

    state().loadDesign(state().design, []); // clears the history
    state().pruneImages();
    expect(a.release).toHaveBeenCalledTimes(1);
    expect(b.release).not.toHaveBeenCalled();
    expect(Object.keys(state().images)).toEqual(["b"]);
  });

  it(`keeps no more than ${HISTORY_IMAGE_LIMIT} images alive through the history`, () => {
    const images = Array.from({ length: HISTORY_IMAGE_LIMIT + 3 }, (_, i) =>
      fakeImage(`img-${i}`),
    );
    for (const image of images) state().setImage(image);
    state().pruneImages();
    const kept = Object.keys(state().images);
    expect(kept).toHaveLength(HISTORY_IMAGE_LIMIT);
    expect(kept).toContain(`img-${HISTORY_IMAGE_LIMIT + 2}`);
    expect(images[0].release).toHaveBeenCalledTimes(1);
  });

  it("restores a design without history", () => {
    state().setPadding(100);
    const saved = {
      ...createDefaultDesign(),
      canvas: { preset: "auto" } as const,
    };
    const image = fakeImage("restored");
    saved.layers[0].imageId = "restored";
    state().loadDesign(saved, [image]);
    expect(state().past).toEqual([]);
    expect(selectActiveImage(state())).toBe(image);
  });
});

describe("editor store: interface state", () => {
  it("shows notices with new ids", () => {
    state().showError("Nope");
    expect(state().notice).toMatchObject({ kind: "error", message: "Nope" });
    const first = state().notice?.id;
    state().showInfo("Copied");
    expect(state().notice).toMatchObject({ kind: "info", message: "Copied" });
    expect(state().notice?.id).not.toBe(first);
    state().dismissNotice();
    expect(state().notice).toBeNull();
  });

  it("sanitises export options", () => {
    state().setExportOptions({ format: "webp", scale: 3 });
    expect(state().exportOptions).toMatchObject({ format: "webp", scale: 3 });
    state().setExportOptions({ scale: 7 as never, quality: 0.1 });
    expect(state().exportOptions).toMatchObject({ scale: 2, quality: 0.5 });
  });
});
