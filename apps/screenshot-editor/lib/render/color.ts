import { hexToRgb, rgbToHex } from "@/lib/design/colors";

/** "#rrggbb" `a` moved towards `b` by `amount` (0 = a, 1 = b). */
export function mixHex(a: string, b: string, amount: number): string {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}
