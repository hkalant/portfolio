import { describe, expect, it } from "vitest";
import { joinBasePath } from "./paths";

describe("joinBasePath", () => {
  it("works at the site root", () => {
    expect(joinBasePath("", "/x.png")).toBe("/x.png");
    expect(joinBasePath("", "x.png")).toBe("/x.png");
  });

  it("prefixes a subfolder", () => {
    expect(joinBasePath("/screenshot-editor", "x.png")).toBe(
      "/screenshot-editor/x.png",
    );
    expect(joinBasePath("/screenshot-editor", "/devices/phone.svg")).toBe(
      "/screenshot-editor/devices/phone.svg",
    );
  });
});
