"use client";

import { useEffect, useEffectEvent } from "react";
import { isEditableTarget } from "@/lib/dom";
import { runCopy, runExport } from "@/lib/export/controller";
import { currentPlatform, isApplePlatform } from "@/lib/platform";
import {
  matchShortcut,
  shortcutApplies,
  type ShortcutContext,
} from "@/lib/shortcuts";
import { useEditorStore } from "@/lib/store/editor";

/** Marks the focusable element around the design stage (arrow keys nudge there). */
export const CANVAS_FOCUS_ATTRIBUTE = "data-design-canvas";

function focusContext(event: KeyboardEvent): ShortcutContext {
  const active = document.activeElement;
  const focus =
    active instanceof Element && active.closest(`[${CANVAS_FOCUS_ATTRIBUTE}]`)
      ? "canvas"
      : !active ||
          active === document.body ||
          active === document.documentElement
        ? "page"
        : "other";
  const selection = window.getSelection();
  return {
    editable: isEditableTarget(event.target),
    hasSelection:
      !!selection && !selection.isCollapsed && selection.toString() !== "",
    focus,
  };
}

/** Undo, redo, export, copy, open, delete and nudge from the keyboard. */
export function useShortcuts({ onOpen }: { onOpen: () => void }) {
  const open = useEffectEvent(onOpen);

  useEffect(() => {
    const apple = isApplePlatform(currentPlatform());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const command = matchShortcut(event, apple);
      if (!command || !shortcutApplies(command, focusContext(event))) return;
      const state = useEditorStore.getState();
      switch (command.type) {
        case "undo":
          state.undo();
          break;
        case "redo":
          state.redo();
          break;
        case "export":
          void runExport();
          break;
        case "copy":
          runCopy();
          break;
        case "open":
          open();
          break;
        case "delete":
          if (!state.design.layers[0].imageId) return;
          state.clearImage();
          break;
        case "nudge":
          if (state.design.canvas.preset === "auto") return;
          state.nudge(command.dx, command.dy);
          break;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
