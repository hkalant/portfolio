"use client";

import { useEffect, useState } from "react";
import type { Size } from "@/lib/design/layout";

/**
 * Measures an element with ResizeObserver. Attach the returned callback as a
 * ref. Measure a box whose size does not depend on its children, or the
 * measurement can feed back into itself.
 */
export function useElementSize<T extends HTMLElement>(): [
  (element: T | null) => void,
  Size,
] {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, size];
}
