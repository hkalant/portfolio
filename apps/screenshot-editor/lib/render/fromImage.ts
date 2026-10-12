import { isHexColor, luminance } from "@/lib/design/colors";
import type { GradientStop } from "@/lib/design/schema";
import { mixHex } from "./color";

/**
 * Gradient stops for a "From image" background, from the screenshot's
 * dominant colours: two or three, lightest first so the gradient never doubles
 * back, spread evenly. A single colour becomes a lighter and a darker shade of
 * itself. Null when there are no colours.
 */
export function fromImageStops(
  colors: readonly string[],
): GradientStop[] | null {
  const picked = colors.filter(isHexColor).slice(0, 3);
  if (picked.length === 0) return null;
  const list =
    picked.length === 1
      ? [mixHex(picked[0], "#ffffff", 0.3), mixHex(picked[0], "#000000", 0.25)]
      : [...picked].sort((a, b) => luminance(b) - luminance(a));
  return list.map((color, i) => ({
    offset: i / (list.length - 1),
    color: color.toLowerCase(),
  }));
}
