import { describe, expect, it } from "vitest";
import { mixHex } from "./color";
import { fromImageStops } from "./fromImage";

describe("mixHex", () => {
  it("moves one colour towards another", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#ff0000", "#0000ff", 0.5)).toBe("#800080");
  });
});

describe("fromImageStops", () => {
  it("spreads three colours evenly, lightest first", () => {
    expect(fromImageStops(["#1428c8", "#f0c814", "#808080"])).toEqual([
      { offset: 0, color: "#f0c814" },
      { offset: 0.5, color: "#808080" },
      { offset: 1, color: "#1428c8" },
    ]);
  });

  it("uses at most three colours", () => {
    const stops = fromImageStops(["#ffffff", "#cccccc", "#888888", "#000000"]);
    expect(stops?.map((stop) => stop.color)).toEqual([
      "#ffffff",
      "#cccccc",
      "#888888",
    ]);
  });

  it("runs two colours from end to end", () => {
    expect(fromImageStops(["#000000", "#ffffff"])).toEqual([
      { offset: 0, color: "#ffffff" },
      { offset: 1, color: "#000000" },
    ]);
  });

  it("makes a lighter and a darker shade of a single colour", () => {
    expect(fromImageStops(["#FF0000"])).toEqual([
      { offset: 0, color: "#ff4d4d" },
      { offset: 1, color: "#bf0000" },
    ]);
  });

  it("is null without usable colours", () => {
    expect(fromImageStops([])).toBeNull();
    expect(fromImageStops(["red", "#12345"])).toBeNull();
  });
});
