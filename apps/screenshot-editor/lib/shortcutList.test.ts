import { describe, expect, it } from "vitest";
import { shortcutGroups } from "./shortcutList";

describe("shortcutGroups", () => {
  it("names ⌘ on Apple devices and Ctrl elsewhere", () => {
    const keys = (apple: boolean) =>
      shortcutGroups(apple).flatMap((group) =>
        group.items.map((item) => item.keys.join("+")),
      );
    expect(keys(true)).toContain("⌘+⇧+Z");
    expect(keys(false)).toContain("Ctrl+Y");
    expect(keys(false).join()).not.toContain("⌘");
  });
});
