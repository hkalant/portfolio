"use client";

import Konva from "konva";
import { useEffect, useState } from "react";

/**
 * The current devicePixelRatio, updated when the browser zoom changes or the
 * window moves to another screen. Konva reads the ratio once at import, so it
 * is updated here too; remount the Stage (key={ratio}) to apply it.
 */
export function useDevicePixelRatio(): number {
  const [ratio, setRatio] = useState(() => window.devicePixelRatio || 1);

  useEffect(() => {
    const query = window.matchMedia(`(resolution: ${ratio}dppx)`);
    const onChange = () => {
      const next = window.devicePixelRatio || 1;
      Konva.pixelRatio = next;
      setRatio(next);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [ratio]);

  return ratio;
}
