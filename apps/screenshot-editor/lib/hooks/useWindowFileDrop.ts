"use client";

import { useEffect, useEffectEvent, useState } from "react";

const OVERLAY_TIMEOUT_MS = 200;

function carriesFilesOrLinks(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes("Files") || types.includes("text/uri-list");
}

/**
 * Lets files be dropped anywhere on the page and reports whether a drag is
 * over the window. Link drags are caught as well, so dropping an image from
 * another site shows a hint instead of navigating away from the editor.
 */
export function useWindowFileDrop(onDrop: (files: File[]) => void): {
  isDragging: boolean;
} {
  const [isDragging, setDragging] = useState(false);
  const handleDrop = useEffectEvent(onDrop);

  useEffect(() => {
    let timer: number | undefined;
    let dragStartedHere = false;

    const hide = () => {
      window.clearTimeout(timer);
      setDragging(false);
    };
    const onDragStart = () => {
      dragStartedHere = true;
    };
    const onDragEnd = () => {
      dragStartedHere = false;
      hide();
    };
    const onDragOver = (event: DragEvent) => {
      if (dragStartedHere || !carriesFilesOrLinks(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDragging(true);
      // dragleave is unreliable across child elements; hide after dragover stops instead.
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, OVERLAY_TIMEOUT_MS);
    };
    const onDropEvent = (event: DragEvent) => {
      if (dragStartedHere || !carriesFilesOrLinks(event)) return;
      event.preventDefault();
      hide();
      handleDrop(Array.from(event.dataTransfer?.files ?? []));
    };

    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragenter", onDragOver);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDropEvent);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragenter", onDragOver);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDropEvent);
    };
  }, []);

  return { isDragging };
}
