import { describe, expect, it } from "vitest";
import { MESH_PRESETS, type MeshPreset } from "@/lib/design/meshes";
import { createFakeContext } from "./fakeContext";
import { blobCircle, BLOB_FALLOFF, drawMesh, meshCss } from "./mesh";

const preset: MeshPreset = {
  id: "test",
  name: "Test",
  base: "#102030",
  blobs: [
    { x: 0, y: 0, r: 0.5, color: "#ff0000" },
    { x: 1, y: 1, r: 0.25, color: "#00ff00" },
  ],
};

describe("BLOB_FALLOFF", () => {
  it("fades from opaque at the centre to transparent at the edge", () => {
    expect(BLOB_FALLOFF[0]).toEqual([0, 1]);
    expect(BLOB_FALLOFF.at(-1)).toEqual([1, 0]);
    for (let i = 1; i < BLOB_FALLOFF.length; i += 1) {
      expect(BLOB_FALLOFF[i][0]).toBeGreaterThan(BLOB_FALLOFF[i - 1][0]);
      expect(BLOB_FALLOFF[i][1]).toBeLessThan(BLOB_FALLOFF[i - 1][1]);
    }
  });
});

describe("blobCircle", () => {
  it("places blobs by fractions of the canvas and sizes them by its longer side", () => {
    expect(blobCircle(preset.blobs[0], 1600, 900)).toEqual({
      x: 0,
      y: 0,
      r: 800,
    });
    expect(
      blobCircle({ x: 0.5, y: 0.25, r: 0.5, color: "#000000" }, 1080, 1920),
    ).toEqual({
      x: 540,
      y: 480,
      r: 960,
    });
  });
});

describe("drawMesh", () => {
  it("paints the base, then one radial gradient per blob, inside the canvas", () => {
    const { context, log, problems } = createFakeContext();
    drawMesh(context, preset, 400, 200);
    expect(problems).toEqual([]);
    expect(log[0]).toBe("save()");
    expect(log.slice(1, 3)).toEqual([
      "fillStyle = #102030",
      "fillRect(0, 0, 400, 200)",
    ]);
    expect(
      log.filter((entry) => entry.startsWith("createRadialGradient")),
    ).toEqual([
      "createRadialGradient(0, 0, 0, 0, 0, 200)",
      "createRadialGradient(400, 200, 0, 400, 200, 100)",
    ]);
    // Each blob only fills its own box, clipped to the canvas.
    expect(
      log.filter((entry) => entry.startsWith("fillRect")).slice(1),
    ).toEqual(["fillRect(0, 0, 200, 200)", "fillRect(300, 100, 100, 100)"]);
    expect(log.at(-1)).toBe("restore()");
  });

  it("draws every preset without problems at any size", () => {
    for (const mesh of MESH_PRESETS)
      for (const [width, height] of [
        [1, 1],
        [1600, 900],
        [1080, 1920],
      ]) {
        const { context, problems } = createFakeContext();
        drawMesh(context, mesh, width, height);
        expect(problems, mesh.id).toEqual([]);
      }
  });
});

describe("meshCss", () => {
  it("stacks one radial gradient per blob over the base colour, last blob on top", () => {
    const css = meshCss(preset);
    expect(css.backgroundColor).toBe("#102030");
    const layers = css.backgroundImage.split("radial-gradient(").slice(1);
    expect(layers).toHaveLength(2);
    expect(layers[0]).toMatch(/^25% 25% at 100% 100%, rgba\(0, 255, 0, 1\) 0%/);
    expect(layers[1]).toMatch(/^50% 50% at 0% 0%, rgba\(255, 0, 0, 1\) 0%/);
    expect(layers[1]).toMatch(/rgba\(255, 0, 0, 0\) 100%\)$/);
  });
});
