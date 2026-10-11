import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGradientPreset } from "@/lib/design/gradients";
import { SHADOW_PRESETS } from "@/lib/design/shadows";
import type { LoadedImage } from "@/lib/image/load";
import { selectActiveImage, selectShot, useEditorStore } from "./editor";

const fakeImage = (id: string): LoadedImage => ({
  id,
  name: `${id}.png`,
  source: {} as HTMLImageElement,
  width: 1200,
  height: 750,
  release: vi.fn(),
});

const state = () => useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true);
});

describe("editor store", () => {
  it("sets an image and keeps the style settings", () => {
    state().setPadding(100);
    state().setRadius(20);
    state().setShadowPreset("hard");
    state().showError("old error");
    const image = fakeImage("a");
    state().setImage(image);
    const shot = selectShot(state());
    expect(shot.imageId).toBe("a");
    expect(shot.padding).toBe(100);
    expect(shot.radius).toBe(20);
    expect(shot.shadow.preset).toBe("hard");
    expect(state().notice).toBeNull();
    expect(selectActiveImage(state())).toBe(image);
  });

  it("clamps and rounds padding and radius", () => {
    state().setPadding(999);
    expect(selectShot(state()).padding).toBe(200);
    state().setPadding(-5);
    expect(selectShot(state()).padding).toBe(0);
    state().setPadding(10.6);
    expect(selectShot(state()).padding).toBe(11);
    state().setRadius(-4);
    expect(selectShot(state()).radius).toBe(0);
    state().setRadius(70);
    expect(selectShot(state()).radius).toBe(64);
  });

  it("applies gradient presets as copies and ignores unknown ids", () => {
    state().applyGradientPreset("mist");
    const background = state().design.background;
    const mist = getGradientPreset("mist");
    expect(background.presetId).toBe("mist");
    expect(background.stops).toEqual(mist?.stops);
    expect(background.stops).not.toBe(mist?.stops);
    state().applyGradientPreset("does-not-exist");
    expect(state().design.background.presetId).toBe("mist");
  });

  it("normalises the gradient angle", () => {
    state().setGradientAngle(400);
    expect(state().design.background.angle).toBe(40);
  });

  it("copies shadow presets and ignores the empty toggle value", () => {
    state().setShadowPreset("hard");
    expect(selectShot(state()).shadow).toEqual(SHADOW_PRESETS.hard);
    expect(selectShot(state()).shadow).not.toBe(SHADOW_PRESETS.hard);
    state().setShadowPreset("");
    expect(selectShot(state()).shadow.preset).toBe("hard");
  });

  it("frees images the design no longer uses", () => {
    const a = fakeImage("a");
    const b = fakeImage("b");
    state().setImage(a);
    state().setImage(b);
    expect(Object.keys(state().images).sort()).toEqual(["a", "b"]);
    expect(a.release).not.toHaveBeenCalled();
    state().pruneImages();
    expect(a.release).toHaveBeenCalledTimes(1);
    expect(b.release).not.toHaveBeenCalled();
    expect(Object.keys(state().images)).toEqual(["b"]);

    state().clearImage();
    expect(selectActiveImage(state())).toBeNull();
    state().pruneImages();
    expect(b.release).toHaveBeenCalledTimes(1);
    expect(state().images).toEqual({});
  });

  it("shows and dismisses errors", () => {
    state().showError("Nope");
    expect(state().notice).toEqual({ kind: "error", message: "Nope" });
    state().dismissNotice();
    expect(state().notice).toBeNull();
  });
});
