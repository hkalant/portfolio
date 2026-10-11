import { create } from "zustand";
import { createDefaultDesign } from "@/lib/design/defaults";
import { getGradientPreset, normalizeAngle } from "@/lib/design/gradients";
import { PADDING, RADIUS } from "@/lib/design/limits";
import type { Design, ShotLayer } from "@/lib/design/schema";
import { isShadowPresetId, SHADOW_PRESETS } from "@/lib/design/shadows";
import type { LoadedImage } from "@/lib/image/load";
import { clamp } from "@/lib/utils";

export type PanelId = "background" | "style";

export type Notice = { kind: "error"; message: string };

export type EditorState = {
  design: Design;
  /** Decoded images by id. The design refers to them through `imageId`. */
  images: Record<string, LoadedImage>;
  activePanel: PanelId;
  loading: boolean;
  exporting: boolean;
  notice: Notice | null;

  setImage: (image: LoadedImage) => void;
  clearImage: () => void;
  /** Frees images the design no longer refers to. Run after React has re-rendered. */
  pruneImages: () => void;
  applyGradientPreset: (id: string) => void;
  setGradientAngle: (degrees: number) => void;
  setPadding: (pixels: number) => void;
  setRadius: (pixels: number) => void;
  setShadowPreset: (id: string) => void;
  setActivePanel: (panel: PanelId) => void;
  setLoading: (loading: boolean) => void;
  setExporting: (exporting: boolean) => void;
  showError: (message: string) => void;
  dismissNotice: () => void;
};

// M1 has exactly one layer: the screenshot.
function updateShot(design: Design, patch: Partial<ShotLayer>): Design {
  const [shot, ...rest] = design.layers;
  return { ...design, layers: [{ ...shot, ...patch }, ...rest] };
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  design: createDefaultDesign(),
  images: {},
  activePanel: "background",
  loading: false,
  exporting: false,
  notice: null,

  setImage: (image) =>
    set((state) => ({
      images: { ...state.images, [image.id]: image },
      design: updateShot(state.design, { imageId: image.id }),
      notice: null,
    })),

  clearImage: () =>
    set((state) => ({ design: updateShot(state.design, { imageId: null }) })),

  pruneImages: () => {
    const { images, design } = get();
    const used = new Set(design.layers.map((layer) => layer.imageId));
    const unused = Object.values(images).filter((image) => !used.has(image.id));
    if (unused.length === 0) return;
    for (const image of unused) image.release();
    set({
      images: Object.fromEntries(
        Object.entries(images).filter(([id]) => used.has(id)),
      ),
    });
  },

  applyGradientPreset: (id) => {
    const preset = getGradientPreset(id);
    if (!preset) return;
    set((state) => ({
      design: {
        ...state.design,
        background: {
          kind: "linear",
          presetId: preset.id,
          angle: preset.angle,
          stops: preset.stops.map((stop) => ({ ...stop })),
        },
      },
    }));
  },

  setGradientAngle: (degrees) =>
    set((state) => ({
      design: {
        ...state.design,
        background: {
          ...state.design.background,
          angle: normalizeAngle(degrees),
        },
      },
    })),

  setPadding: (pixels) =>
    set((state) => ({
      design: updateShot(state.design, {
        padding: Math.round(clamp(pixels, PADDING.min, PADDING.max)),
      }),
    })),

  setRadius: (pixels) =>
    set((state) => ({
      design: updateShot(state.design, {
        radius: Math.round(clamp(pixels, RADIUS.min, RADIUS.max)),
      }),
    })),

  setShadowPreset: (id) => {
    // Radix toggle groups report "" when the active item is clicked again.
    if (!isShadowPresetId(id)) return;
    set((state) => ({
      design: updateShot(state.design, { shadow: { ...SHADOW_PRESETS[id] } }),
    }));
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setLoading: (loading) => set({ loading }),
  setExporting: (exporting) => set({ exporting }),
  showError: (message) => set({ notice: { kind: "error", message } }),
  dismissNotice: () => set({ notice: null }),
}));

export const selectShot = (state: EditorState): ShotLayer =>
  state.design.layers[0];

export const selectActiveImage = (state: EditorState): LoadedImage | null => {
  const id = state.design.layers[0].imageId;
  return id ? (state.images[id] ?? null) : null;
};
