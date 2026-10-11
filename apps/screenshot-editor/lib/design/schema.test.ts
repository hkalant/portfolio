import { describe, expect, it } from "vitest";
import { createDefaultDesign } from "./defaults";
import { designSchema } from "./schema";

describe("design schema", () => {
  it("accepts the default design", () => {
    expect(designSchema.safeParse(createDefaultDesign()).success).toBe(true);
  });

  it("rejects out-of-range values", () => {
    const withPadding = createDefaultDesign();
    withPadding.layers[0].padding = 500;
    expect(designSchema.safeParse(withPadding).success).toBe(false);

    const withColor = createDefaultDesign();
    withColor.background.stops[0].color = "red";
    expect(designSchema.safeParse(withColor).success).toBe(false);

    const withAngle = createDefaultDesign();
    withAngle.background.angle = 360;
    expect(designSchema.safeParse(withAngle).success).toBe(false);
  });

  it("requires exactly one layer in M1", () => {
    const design = createDefaultDesign();
    expect(designSchema.safeParse({ ...design, layers: [] }).success).toBe(
      false,
    );
  });

  it("creates independent copies", () => {
    const a = createDefaultDesign();
    const b = createDefaultDesign();
    a.background.stops[0].color = "#000000";
    expect(b.background.stops[0].color).not.toBe("#000000");
  });
});
