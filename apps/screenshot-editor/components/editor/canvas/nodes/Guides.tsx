import type { Size } from "@/lib/design/layout";

type Props = {
  canvas: Size;
  /** On-screen zoom of the stage, so guide lines stay 1 screen px wide. */
  zoom: number;
};

// Placeholder from the foundation phase. The frames work draws the snap guides
// here (named EXPORT_HIDDEN so exports leave them out).
export function GuidesNode(props: Props) {
  void props;
  return null;
}
