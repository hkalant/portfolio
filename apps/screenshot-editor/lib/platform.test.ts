import { describe, expect, it } from "vitest";
import { isApplePlatform, pasteShortcutLabel } from "./platform";

describe("platform helpers", () => {
  it("detects Apple platforms", () => {
    expect(isApplePlatform("MacIntel")).toBe(true);
    expect(isApplePlatform("macOS")).toBe(true);
    expect(isApplePlatform("iPad")).toBe(true);
    expect(isApplePlatform("Win32")).toBe(false);
    expect(isApplePlatform("Linux x86_64")).toBe(false);
  });

  it("labels the paste shortcut", () => {
    expect(pasteShortcutLabel("MacIntel")).toBe("⌘V");
    expect(pasteShortcutLabel("Windows")).toBe("Ctrl+V");
  });
});
