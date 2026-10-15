import { describe, expect, it } from "vitest";
import {
  clickBox,
  dragBox,
  fitBoxToImage,
  isAnnotationColor,
  parseStepNumber,
  stepTextColor,
} from "./annotations";
import { migrateDesign } from "./migrate";
import { createDefaultDesign } from "./defaults";
import { designSchema } from "./schema";

describe("annotation colours", () => {
  it("allows only the three Oxford Brookes colours", () => {
    expect(isAnnotationColor("#424a52")).toBe(true);
    expect(isAnnotationColor("#d10373")).toBe(true);
    expect(isAnnotationColor("#f9c909")).toBe(true);
    expect(isAnnotationColor("#ff0000")).toBe(false);
    expect(isAnnotationColor("#D10373")).toBe(false);
  });

  it("puts a dark number on yellow and a white one on the others", () => {
    expect(stepTextColor("#f9c909")).toBe("#424a52");
    expect(stepTextColor("#d10373")).toBe("#ffffff");
  });

  it("rejects a design with any other colour", () => {
    const design = createDefaultDesign();
    const step = {
      id: "a",
      kind: "step",
      x: 0.5,
      y: 0.2,
      number: 1,
      color: "#00ff00",
    };
    expect(
      designSchema.safeParse({ ...design, annotations: [step] }).success,
    ).toBe(false);
    expect(
      designSchema.safeParse({
        ...design,
        annotations: [{ ...step, color: "#424a52" }],
      }).success,
    ).toBe(true);
  });
});

describe("parseStepNumber", () => {
  it("takes whole numbers from 1 to 999 only", () => {
    expect(parseStepNumber("7")).toBe(7);
    expect(parseStepNumber(" 12 ")).toBe(12);
    expect(parseStepNumber("999")).toBe(999);
    expect(parseStepNumber("0")).toBeNull();
    expect(parseStepNumber("1000")).toBeNull();
    expect(parseStepNumber("3a")).toBeNull();
    expect(parseStepNumber("A")).toBeNull();
    expect(parseStepNumber("1.5")).toBeNull();
    expect(parseStepNumber("")).toBeNull();
  });

  it("is enforced by the design schema", () => {
    const design = createDefaultDesign();
    const step = (number: unknown) => ({
      ...design,
      annotations: [
        { id: "a", kind: "step", x: 0, y: 0, number, color: "#424a52" },
      ],
    });
    expect(designSchema.safeParse(step(3)).success).toBe(true);
    expect(designSchema.safeParse(step("3")).success).toBe(false);
    expect(designSchema.safeParse(step("A")).success).toBe(false);
    expect(designSchema.safeParse(step(2.5)).success).toBe(false);
  });
});

describe("shape boxes", () => {
  // A screenshot half as tall as it is wide.
  const aspect = 0.5;

  it("drags out a box in any direction, kept on the screenshot", () => {
    expect(
      dragBox({ x: 0.5, y: 0.2 }, { x: 0.2, y: 0.1 }, "rect", aspect),
    ).toEqual({ x: 0.2, y: 0.1, width: 0.3, height: 0.1 });
    const box = dragBox({ x: 0.5, y: 0.2 }, { x: 2, y: 2 }, "rounded", aspect);
    expect(box.x + box.width).toBe(1);
    expect(box.y + box.height).toBe(aspect);
  });

  it("keeps a circle's box square and on the screenshot", () => {
    const box = dragBox(
      { x: 0.2, y: 0.1 },
      { x: 0.3, y: 0.4 },
      "circle",
      aspect,
    );
    expect(box.width).toBeCloseTo(box.height);
    expect(box.y + box.height).toBeLessThanOrEqual(aspect + 1e-9);
  });

  it("makes a default-size shape for a click, inside the screenshot", () => {
    const box = clickBox({ x: 0.99, y: 0.01 }, "rect", aspect);
    expect(box.x + box.width).toBeCloseTo(1);
    expect(box.y).toBe(0);
    const circle = clickBox({ x: 0.5, y: 0.25 }, "circle", aspect);
    expect(circle.width).toBe(circle.height);
  });

  it("keeps a moved or resized box on the screenshot", () => {
    expect(
      fitBoxToImage({ x: 0.9, y: -0.1, width: 0.3, height: 0.2 }, aspect),
    ).toEqual({ x: 0.7, y: 0, width: 0.3, height: 0.2 });
    const circle = fitBoxToImage(
      { x: 0, y: 0, width: 0.8, height: 0.3 },
      aspect,
      true,
    );
    expect(circle.width).toBe(circle.height);
  });
});

describe("saved designs", () => {
  it("get no annotations and step 1 when saved before annotations", () => {
    const old: Record<string, unknown> = { ...createDefaultDesign() };
    delete old.annotations;
    delete old.nextStep;
    const migrated = migrateDesign(old);
    expect(migrated?.annotations).toEqual([]);
    expect(migrated?.nextStep).toBe(1);
  });
});
