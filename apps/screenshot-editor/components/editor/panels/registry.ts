import { AppWindow, Palette, SlidersHorizontal } from "lucide-react";
import type { ComponentType } from "react";
import type { PanelId } from "@/lib/store/editor";
import { BackgroundPanel } from "./BackgroundPanel";
import { FramePanel } from "./FramePanel";
import { StylePanel } from "./StylePanel";

/** The settings panels, in rail order. The desktop rail and the mobile tabs both use this. */
export const PANELS: readonly {
  id: PanelId;
  label: string;
  icon: typeof Palette;
  Component: ComponentType;
}[] = [
  {
    id: "background",
    label: "Background",
    icon: Palette,
    Component: BackgroundPanel,
  },
  { id: "frame", label: "Frame", icon: AppWindow, Component: FramePanel },
  {
    id: "style",
    label: "Style",
    icon: SlidersHorizontal,
    Component: StylePanel,
  },
];
