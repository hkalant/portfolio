import { describe, expect, it } from "vitest";
import {
  matchShortcut,
  shortcutApplies,
  type KeyInput,
  type ShortcutContext,
} from "./shortcuts";

const key = (value: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: value,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("matchShortcut", () => {
  it("uses ⌘ on Apple platforms and Ctrl elsewhere", () => {
    expect(matchShortcut(key("z", { metaKey: true }), true)).toEqual({
      type: "undo",
    });
    expect(matchShortcut(key("z", { ctrlKey: true }), false)).toEqual({
      type: "undo",
    });
    expect(matchShortcut(key("z", { ctrlKey: true }), true)).toBeNull();
    expect(matchShortcut(key("z", { metaKey: true }), false)).toBeNull();
  });

  it("redoes with Shift+Z everywhere and Ctrl+Y off Apple platforms", () => {
    expect(
      matchShortcut(key("Z", { metaKey: true, shiftKey: true }), true),
    ).toEqual({
      type: "redo",
    });
    expect(matchShortcut(key("y", { ctrlKey: true }), false)).toEqual({
      type: "redo",
    });
    expect(matchShortcut(key("y", { metaKey: true }), true)).toBeNull();
  });

  it("maps export, copy and open", () => {
    const mod = { ctrlKey: true };
    expect(matchShortcut(key("s", mod), false)).toEqual({ type: "export" });
    expect(matchShortcut(key("c", mod), false)).toEqual({ type: "copy" });
    expect(matchShortcut(key("C", { ...mod, shiftKey: true }), false)).toEqual({
      type: "copy",
    });
    expect(matchShortcut(key("o", mod), false)).toEqual({ type: "open" });
    expect(matchShortcut(key("v", mod), false)).toBeNull(); // paste is handled by the paste event
  });

  it("nudges with arrows, 10 px with Shift", () => {
    expect(matchShortcut(key("ArrowLeft"), false)).toEqual({
      type: "nudge",
      dx: -1,
      dy: 0,
    });
    expect(matchShortcut(key("ArrowDown", { shiftKey: true }), false)).toEqual({
      type: "nudge",
      dx: 0,
      dy: 10,
    });
  });

  it("deletes with Delete or Backspace, and ignores Alt and unknown keys", () => {
    expect(matchShortcut(key("Backspace"), true)).toEqual({ type: "delete" });
    expect(matchShortcut(key("Delete"), false)).toEqual({ type: "delete" });
    expect(
      matchShortcut(key("z", { ctrlKey: true, altKey: true }), false),
    ).toBeNull();
    expect(matchShortcut(key("a"), false)).toBeNull();
    expect(
      matchShortcut(key("ArrowLeft", { ctrlKey: true }), false),
    ).toBeNull();
  });
});

describe("shortcutApplies", () => {
  const context = (patch: Partial<ShortcutContext> = {}): ShortcutContext => ({
    editable: false,
    hasSelection: false,
    focus: "page",
    ...patch,
  });

  it("does nothing while typing", () => {
    expect(shortcutApplies({ type: "undo" }, context({ editable: true }))).toBe(
      false,
    );
  });

  it("leaves ⌘C to selected text", () => {
    expect(shortcutApplies({ type: "copy" }, context())).toBe(true);
    expect(
      shortcutApplies({ type: "copy" }, context({ hasSelection: true })),
    ).toBe(false);
  });

  it("deletes and nudges only on the canvas", () => {
    expect(
      shortcutApplies({ type: "delete" }, context({ focus: "canvas" })),
    ).toBe(true);
    expect(shortcutApplies({ type: "delete" }, context())).toBe(false);
    expect(
      shortcutApplies({ type: "delete" }, context({ focus: "other" })),
    ).toBe(false);
    const nudge = { type: "nudge", dx: 1, dy: 0 } as const;
    expect(shortcutApplies(nudge, context())).toBe(false);
    expect(shortcutApplies(nudge, context({ focus: "canvas" }))).toBe(true);
  });

  it("ignores key events without a key", () => {
    expect(
      matchShortcut(
        { ...key("a"), key: undefined as unknown as string },
        false,
      ),
    ).toBeNull();
  });

  it("undoes from any control", () => {
    expect(shortcutApplies({ type: "undo" }, context({ focus: "other" }))).toBe(
      true,
    );
  });
});
