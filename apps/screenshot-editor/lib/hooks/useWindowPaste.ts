"use client";

import { useEffect, useEffectEvent } from "react";
import { isEditableTarget } from "@/lib/dom";

/** Calls `onFiles` with the files in any paste that is not aimed at a text field. */
export function useWindowPaste(onFiles: (files: File[]) => void) {
  const handleFiles = useEffectEvent(onFiles);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const data = event.clipboardData;
      if (!data) return;
      let files = Array.from(data.files);
      if (files.length === 0) {
        files = Array.from(data.items)
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);
      }
      if (files.length === 0) return;
      event.preventDefault();
      handleFiles(files);
    };
    // Cancelling beforepaste lets some browsers (older Safari) offer Paste when
    // nothing editable is focused. It has no effect elsewhere.
    const onBeforePaste = (event: Event) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    document.addEventListener("beforepaste", onBeforePaste);
    return () => {
      window.removeEventListener("paste", onPaste);
      document.removeEventListener("beforepaste", onBeforePaste);
    };
  }, []);
}
