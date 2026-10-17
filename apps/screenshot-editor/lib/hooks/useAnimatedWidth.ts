"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Animates a box's width as its content grows or shrinks. A browser can't
 * transition between two automatic widths, so this measures the content
 * (`contentRef`, laid out at its natural width) and sets that width on the
 * box (`boxRef`), whose CSS transitions it. The first width is set without
 * a transition, so nothing animates in on mount.
 */
export function useAnimatedWidth<
  Box extends HTMLElement,
  Content extends HTMLElement,
>() {
  const boxRef = useRef<Box>(null);
  const contentRef = useRef<Content>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const fit = (animate: boolean) => {
      const style = getComputedStyle(box);
      const width =
        content.offsetWidth +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) +
        parseFloat(style.borderRightWidth);
      if (!animate) box.style.transition = "none";
      box.style.width = `${width}px`;
      if (!animate) {
        // Apply the jump before the transition comes back.
        void box.offsetWidth;
        box.style.transition = "";
      }
    };
    fit(false);
    const observer = new ResizeObserver(() => fit(true));
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { boxRef, contentRef };
}
