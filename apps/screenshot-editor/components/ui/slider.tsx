import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A single-thumb slider. `thumbLabel` names the thumb for screen readers.
 *
 * On a touchscreen only the thumb drags (with a finger-sized hit area): a
 * swipe that starts on the track scrolls the page, as on native sliders,
 * instead of jumping the value to the finger.
 */
function Slider({
  className,
  thumbLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabel: string }) {
  // A touch that started off the thumb. The browser still captures it to the
  // slider, and Radix moves the value on every captured move, so its moves
  // and its end are cancelled too (Radix skips cancelled events).
  const ignored = React.useRef<number | null>(null);
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-pan-y items-center py-1 select-none data-[disabled]:opacity-50",
        className,
      )}
      onPointerDown={(event) => {
        const onThumb =
          event.target instanceof Element &&
          event.target.closest("[data-slot=slider-thumb]");
        if (event.pointerType === "touch" && !onThumb) {
          ignored.current = event.pointerId;
          event.preventDefault();
        } else onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        if (event.pointerId === ignored.current) event.preventDefault();
        else onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        if (event.pointerId !== ignored.current) return onPointerUp?.(event);
        ignored.current = null;
        event.preventDefault();
      }}
      onPointerCancel={(event) => {
        if (event.pointerId !== ignored.current)
          return onPointerCancel?.(event);
        ignored.current = null;
        event.preventDefault();
      }}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted-foreground/20"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-primary"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={thumbLabel}
        className="relative block size-4 shrink-0 touch-none rounded-full border border-primary bg-background shadow-sm transition-[box-shadow] outline-none after:absolute after:-inset-3 after:rounded-full after:content-[''] hover:ring-4 hover:ring-ring/40 focus-visible:ring-4 focus-visible:ring-ring"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
