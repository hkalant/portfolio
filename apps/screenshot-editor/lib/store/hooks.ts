"use client";

import { useMemo } from "react";
import { computeLayout, type DesignLayout } from "@/lib/design/layout";
import { selectActiveImage, useEditorStore } from "./editor";

/** Where everything goes in the current design, or null without a screenshot. */
export function useDesignLayout(): DesignLayout | null {
  const image = useEditorStore(selectActiveImage);
  const design = useEditorStore((state) => state.design);
  return useMemo(
    () => (image ? computeLayout(image, design) : null),
    [image, design],
  );
}
