import { create } from "zustand";
import { isHexColor } from "@/lib/design/colors";
import { createDefaultDesign, defaultShotStyle } from "@/lib/design/defaults";
import { isFrameKind } from "@/lib/design/frames";
import {
  DEFAULT_GRADIENT,
  getGradientPreset,
  normalizeAngle,
} from "@/lib/design/gradients";
import { alignedPosition, computeLayout } from "@/lib/design/layout";
import type { Alignment } from "@/lib/design/layout";
import {
  BLUR,
  BORDER_WIDTH,
  INSET,
  MAX_FRAME_TEXT,
  NOISE,
  PADDING,
  RADIUS,
  ROTATION,
  SHADOW_BLUR,
  SHADOW_OFFSET,
  SHOT_SCALE,
} from "@/lib/design/limits";
import { getMeshPreset } from "@/lib/design/meshes";
import { referencedImageIds } from "@/lib/design/refs";
import type {
  Background,
  Design,
  FrameSpec,
  ShadowSpec,
  ShotLayer,
} from "@/lib/design/schema";
import { isShadowPresetId, SHADOW_PRESETS } from "@/lib/design/shadows";
import { CUSTOM_SIZE, getSizePreset } from "@/lib/design/sizes";
import { getWallpaper } from "@/lib/design/wallpapers";
import {
  DEFAULT_EXPORT_OPTIONS,
  sanitizeExportOptions,
  type ExportOptions,
} from "@/lib/export/options";
import type { LoadedImage } from "@/lib/image/load";
import { clamp } from "@/lib/utils";

export type PanelId = "background" | "frame" | "style";
/** The mobile layout also has a Size tab; null means its panel is closed. */
export type MobilePanelId = PanelId | "size";

/** `id` changes with every notice, so repeating a message still re-announces it. */
export type Notice = { id: number; kind: "error" | "info"; message: string };

/** Undo steps kept in each direction. */
export const HISTORY_LIMIT = 100;
/** Changes with the same key closer together than this become one undo step. */
export const MERGE_WINDOW_MS = 1000;
/** Distinct images the history may keep alive (decoded images are large). */
export const HISTORY_IMAGE_LIMIT = 5;

type ShadowPatch = Partial<Omit<ShadowSpec, "preset">>;
type BorderPatch = Partial<ShotLayer["border"]>;
type InsetPatch = Partial<ShotLayer["inset"]>;
type FramePatch = Partial<FrameSpec>;

export type EditorState = {
  design: Design;
  /** Older designs, oldest first. */
  past: Design[];
  /** Undone designs, next redo first. */
  future: Design[];
  /** Goes up with every change to `design`, including undo, redo and restore. */
  revision: number;
  /** Key and time of the last commit, for merging rapid changes into one step. */
  mergeKey: string | null;
  mergeAt: number;

  /** Decoded images by id. The design refers to them by id. */
  images: Record<string, LoadedImage>;
  activePanel: PanelId;
  mobilePanel: MobilePanelId | null;
  loading: boolean;
  /** Reading the autosaved design on startup. */
  restoring: boolean;
  exporting: boolean;
  notice: Notice | null;
  exportOptions: ExportOptions;

  undo: () => void;
  redo: () => void;
  /** Ends the current merge, so the next change starts a new undo step. */
  sealHistory: () => void;

  setImage: (image: LoadedImage) => void;
  clearImage: () => void;
  /** Frees images no design in the history refers to. Run after React has re-rendered. */
  pruneImages: () => void;

  setBackground: (background: Background) => void;
  setBackgroundImage: (image: LoadedImage) => void;
  applyGradientPreset: (id: string) => void;
  setGradientKind: (kind: "linear" | "radial") => void;
  setGradientAngle: (degrees: number) => void;
  setGradientStop: (index: number, color: string) => void;
  setSolidColor: (color: string) => void;
  applyMeshPreset: (id: string) => void;
  setWallpaper: (id: string) => void;
  setFromImage: () => void;
  setFromImageAngle: (degrees: number) => void;
  setTransparent: () => void;
  setNoise: (amount: number) => void;
  setBlur: (pixels: number) => void;

  setCanvasPreset: (id: string) => void;
  setCustomSize: (width: number, height: number) => void;

  setPadding: (pixels: number) => void;
  setScale: (scale: number) => void;
  setPosition: (x: number, y: number) => void;
  /** Moves the shot by canvas pixels (fixed canvases only). */
  nudge: (dx: number, dy: number) => void;
  alignTo: (horizontal: Alignment, vertical: Alignment) => void;
  setRotation: (degrees: number) => void;
  setRadius: (pixels: number) => void;
  setShadowPreset: (id: string) => void;
  setShadow: (patch: ShadowPatch) => void;
  setBorder: (patch: BorderPatch) => void;
  setInset: (patch: InsetPatch) => void;
  setFrame: (patch: FramePatch) => void;
  resetStyle: () => void;

  /** Replaces the design (an autosave restore). Clears the history. */
  loadDesign: (design: Design, images: LoadedImage[]) => void;

  setActivePanel: (panel: PanelId) => void;
  setMobilePanel: (panel: MobilePanelId | null) => void;
  setLoading: (loading: boolean) => void;
  setRestoring: (restoring: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setExportOptions: (patch: Partial<ExportOptions>) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  dismissNotice: () => void;
};

// One screenshot layer until later milestones add more.
function updateShot(design: Design, patch: Partial<ShotLayer>): Design {
  const [shot] = design.layers;
  return { ...design, layers: [{ ...shot, ...patch }] };
}

const shotOf = (design: Design) => design.layers[0];

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const finite = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

function sameDesign(a: Design, b: Design): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** Drops the oldest past designs until the history keeps few enough images alive. */
function trimPastForImages(past: Design[], present: Design): Design[] {
  const countImages = (designs: Design[]) =>
    new Set(designs.flatMap(referencedImageIds)).size;
  let start = 0;
  while (
    start < past.length &&
    countImages([...past.slice(start), present]) > HISTORY_IMAGE_LIMIT
  )
    start += 1;
  return start === 0 ? past : past.slice(start);
}

/**
 * Applies a design change as one history step, or merges it into the previous
 * step when `mergeKey` matches a commit less than MERGE_WINDOW_MS ago.
 * Returns `state` itself (no update at all) when nothing changed.
 */
function commitDesign(
  state: EditorState,
  next: Design,
  mergeKey?: string,
  extra?: Partial<EditorState>,
): Partial<EditorState> | EditorState {
  if (sameDesign(next, state.design)) return extra ? extra : state;
  const now = Date.now();
  const merge =
    mergeKey !== undefined &&
    mergeKey === state.mergeKey &&
    now - state.mergeAt < MERGE_WINDOW_MS;
  const past = merge
    ? state.past
    : [...state.past, state.design].slice(-HISTORY_LIMIT);
  return {
    ...extra,
    design: next,
    past: trimPastForImages(past, next),
    future: [],
    revision: state.revision + 1,
    mergeKey: mergeKey ?? null,
    mergeAt: now,
  };
}

export const useEditorStore = create<EditorState>()((set, get) => {
  /** For actions that only change the design. A null recipe result changes nothing. */
  const commit = (recipe: (design: Design) => Design | null, key?: string) =>
    set((state) => {
      const next = recipe(state.design);
      return next ? commitDesign(state, next, key) : state;
    });

  const commitShot = (
    recipe: (shot: ShotLayer, design: Design) => Partial<ShotLayer> | null,
    key?: string,
  ) =>
    commit((design) => {
      const patch = recipe(shotOf(design), design);
      return patch ? updateShot(design, patch) : null;
    }, key);

  const setBackgroundTo = (background: Background, key?: string) =>
    commit((design) => ({ ...design, background }), key);

  return {
    design: createDefaultDesign(),
    past: [],
    future: [],
    revision: 0,
    mergeKey: null,
    mergeAt: 0,
    images: {},
    activePanel: "background",
    mobilePanel: null,
    loading: false,
    restoring: false,
    exporting: false,
    notice: null,
    exportOptions: { ...DEFAULT_EXPORT_OPTIONS },

    undo: () =>
      set((state) => {
        const previous = state.past.at(-1);
        if (!previous) return state;
        return {
          design: previous,
          past: state.past.slice(0, -1),
          future: [state.design, ...state.future].slice(0, HISTORY_LIMIT),
          revision: state.revision + 1,
          mergeKey: null,
        };
      }),

    redo: () =>
      set((state) => {
        const [next, ...rest] = state.future;
        if (!next) return state;
        return {
          design: next,
          past: [...state.past, state.design].slice(-HISTORY_LIMIT),
          future: rest,
          revision: state.revision + 1,
          mergeKey: null,
        };
      }),

    sealHistory: () =>
      set((state) => (state.mergeKey === null ? state : { mergeKey: null })),

    setImage: (image) =>
      set((state) =>
        commitDesign(
          state,
          updateShot(state.design, { imageId: image.id }),
          undefined,
          { images: { ...state.images, [image.id]: image }, notice: null },
        ),
      ),

    clearImage: () => commitShot(() => ({ imageId: null })),

    pruneImages: () => {
      const { images, design, past, future } = get();
      const used = new Set(
        [...past, design, ...future].flatMap(referencedImageIds),
      );
      const unused = Object.values(images).filter(
        (image) => !used.has(image.id),
      );
      if (unused.length === 0) return;
      for (const image of unused) image.release();
      set(() => ({
        images: Object.fromEntries(
          Object.entries(images).filter(([id]) => used.has(id)),
        ),
      }));
    },

    setBackground: (background) => setBackgroundTo(background),

    setBackgroundImage: (image) =>
      set((state) =>
        commitDesign(
          state,
          {
            ...state.design,
            background: {
              kind: "image",
              source: { type: "upload", imageId: image.id },
            },
          },
          undefined,
          { images: { ...state.images, [image.id]: image }, notice: null },
        ),
      ),

    applyGradientPreset: (id) => {
      const preset = getGradientPreset(id);
      if (!preset) return;
      commit((design) => {
        const stops = preset.stops.map((stop) => ({ ...stop }));
        const background: Background =
          design.background.kind === "radial"
            ? { kind: "radial", presetId: preset.id, stops }
            : {
                kind: "linear",
                presetId: preset.id,
                angle: preset.angle,
                stops,
              };
        return { ...design, background };
      });
    },

    setGradientKind: (kind) =>
      commit((design) => {
        const current = design.background;
        const fromGradient =
          current.kind === "linear" || current.kind === "radial";
        if (current.kind === kind) return null;
        const stops = fromGradient
          ? current.stops.map((stop) => ({ ...stop }))
          : DEFAULT_GRADIENT.stops.map((stop) => ({ ...stop }));
        const presetId = fromGradient ? current.presetId : DEFAULT_GRADIENT.id;
        const background: Background =
          kind === "radial"
            ? { kind: "radial", presetId, stops }
            : {
                kind: "linear",
                presetId,
                angle:
                  getGradientPreset(presetId ?? "")?.angle ??
                  DEFAULT_GRADIENT.angle,
                stops,
              };
        return { ...design, background };
      }),

    setGradientAngle: (degrees) =>
      commit((design) => {
        const background = design.background;
        if (background.kind !== "linear") return null;
        return {
          ...design,
          background: { ...background, angle: normalizeAngle(degrees) },
        };
      }, "gradient-angle"),

    setGradientStop: (index, color) =>
      commit((design) => {
        const background = design.background;
        if (background.kind !== "linear" && background.kind !== "radial")
          return null;
        if (!isHexColor(color) || !background.stops[index]) return null;
        const stops = background.stops.map((stop, i) =>
          i === index ? { ...stop, color: color.toLowerCase() } : { ...stop },
        );
        return {
          ...design,
          background: { ...background, presetId: null, stops },
        };
      }, `gradient-stop-${index}`),

    setSolidColor: (color) => {
      if (!isHexColor(color)) return;
      setBackgroundTo({ kind: "solid", color: color.toLowerCase() }, "solid");
    },

    applyMeshPreset: (id) => {
      if (!getMeshPreset(id)) return;
      setBackgroundTo({ kind: "mesh", presetId: id });
    },

    setWallpaper: (id) => {
      if (!getWallpaper(id)) return;
      setBackgroundTo({
        kind: "image",
        source: { type: "wallpaper", wallpaperId: id },
      });
    },

    setFromImage: () =>
      commit((design) => {
        if (design.background.kind === "fromImage") return null;
        const angle =
          design.background.kind === "linear"
            ? design.background.angle
            : DEFAULT_GRADIENT.angle;
        return { ...design, background: { kind: "fromImage", angle } };
      }),

    setFromImageAngle: (degrees) =>
      commit((design) => {
        if (design.background.kind !== "fromImage") return null;
        return {
          ...design,
          background: { kind: "fromImage", angle: normalizeAngle(degrees) },
        };
      }, "from-image-angle"),

    setTransparent: () => setBackgroundTo({ kind: "transparent" }),

    setNoise: (amount) => {
      if (!finite(amount)) return;
      commit(
        (design) => ({
          ...design,
          backgroundFx: {
            ...design.backgroundFx,
            noise: round(clamp(amount, NOISE.min, NOISE.max), 2),
          },
        }),
        "noise",
      );
    },

    setBlur: (pixels) => {
      if (!finite(pixels)) return;
      commit(
        (design) => ({
          ...design,
          backgroundFx: {
            ...design.backgroundFx,
            blur: Math.round(clamp(pixels, BLUR.min, BLUR.max)),
          },
        }),
        "blur",
      );
    },

    setCanvasPreset: (id) => {
      if (id === "auto") {
        commit((design) => ({ ...design, canvas: { preset: "auto" } }));
        return;
      }
      const preset = getSizePreset(id);
      if (!preset) return;
      commit((design) => ({
        ...design,
        canvas: {
          preset: preset.id,
          width: preset.width,
          height: preset.height,
        },
      }));
    },

    setCustomSize: (width, height) => {
      if (!finite(width) || !finite(height)) return;
      const side = (value: number) =>
        Math.round(clamp(value, CUSTOM_SIZE.min, CUSTOM_SIZE.max));
      commit(
        (design) => ({
          ...design,
          canvas: {
            preset: "custom",
            width: side(width),
            height: side(height),
          },
        }),
        "custom-size",
      );
    },

    setPadding: (pixels) => {
      if (!finite(pixels)) return;
      commitShot(
        () => ({
          padding: Math.round(clamp(pixels, PADDING.min, PADDING.max)),
        }),
        "padding",
      );
    },

    setScale: (scale) => {
      if (!finite(scale)) return;
      commitShot(
        () => ({
          scale: round(clamp(scale, SHOT_SCALE.min, SHOT_SCALE.max), 2),
        }),
        "scale",
      );
    },

    setPosition: (x, y) => {
      if (!finite(x) || !finite(y)) return;
      commitShot(
        () => ({
          position: {
            x: round(clamp(x, 0, 1), 4),
            y: round(clamp(y, 0, 1), 4),
          },
        }),
        "position",
      );
    },

    nudge: (dx, dy) => {
      if (!finite(dx) || !finite(dy)) return;
      commitShot((shot, design) => {
        if (design.canvas.preset === "auto") return null;
        const { width, height } = design.canvas;
        return {
          position: {
            x: round(clamp(shot.position.x + dx / width, 0, 1), 4),
            y: round(clamp(shot.position.y + dy / height, 0, 1), 4),
          },
        };
      }, "position");
    },

    alignTo: (horizontal, vertical) => {
      const state = get();
      const image = selectActiveImage(state);
      if (!image || state.design.canvas.preset === "auto") return;
      const layout = computeLayout(image, state.design);
      const position = alignedPosition(
        layout,
        shotOf(state.design).padding,
        horizontal,
        vertical,
      );
      commitShot(() => ({
        position: { x: round(position.x, 4), y: round(position.y, 4) },
      }));
    },

    setRotation: (degrees) => {
      if (!finite(degrees)) return;
      commitShot(
        () => ({
          rotation: Math.round(clamp(degrees, ROTATION.min, ROTATION.max)) + 0,
        }),
        "rotation",
      );
    },

    setRadius: (pixels) => {
      if (!finite(pixels)) return;
      commitShot(
        () => ({ radius: Math.round(clamp(pixels, RADIUS.min, RADIUS.max)) }),
        "radius",
      );
    },

    setShadowPreset: (id) => {
      // Radix toggle groups report "" when the active item is clicked again.
      if (!isShadowPresetId(id)) return;
      commitShot(() => ({ shadow: { ...SHADOW_PRESETS[id] } }));
    },

    setShadow: (patch) =>
      commitShot(
        (shot) => {
          const next: ShadowSpec = { ...shot.shadow, preset: "custom" };
          if (finite(patch.offsetX))
            next.offsetX = Math.round(
              clamp(patch.offsetX, SHADOW_OFFSET.min, SHADOW_OFFSET.max),
            );
          if (finite(patch.offsetY))
            next.offsetY = Math.round(
              clamp(patch.offsetY, SHADOW_OFFSET.min, SHADOW_OFFSET.max),
            );
          if (finite(patch.blur))
            next.blur = Math.round(
              clamp(patch.blur, SHADOW_BLUR.min, SHADOW_BLUR.max),
            );
          if (finite(patch.opacity))
            next.opacity = round(clamp(patch.opacity, 0, 1), 2);
          if (patch.color !== undefined) {
            if (!isHexColor(patch.color)) return null;
            next.color = patch.color.toLowerCase();
          }
          return { shadow: next };
        },
        `shadow-${Object.keys(patch).sort().join()}`,
      ),

    setBorder: (patch) =>
      commitShot(
        (shot) => {
          const next = { ...shot.border };
          if (finite(patch.width))
            next.width = Math.round(
              clamp(patch.width, BORDER_WIDTH.min, BORDER_WIDTH.max),
            );
          if (finite(patch.opacity))
            next.opacity = round(clamp(patch.opacity, 0, 1), 2);
          if (patch.color !== undefined) {
            if (!isHexColor(patch.color)) return null;
            next.color = patch.color.toLowerCase();
          }
          return { border: next };
        },
        `border-${Object.keys(patch).sort().join()}`,
      ),

    setInset: (patch) =>
      commitShot(
        (shot) => {
          const next = { ...shot.inset };
          if (finite(patch.size))
            next.size = Math.round(clamp(patch.size, INSET.min, INSET.max));
          if (patch.color !== undefined) {
            if (patch.color !== "auto" && !isHexColor(patch.color)) return null;
            next.color =
              patch.color === "auto" ? "auto" : patch.color.toLowerCase();
          }
          return { inset: next };
        },
        `inset-${Object.keys(patch).sort().join()}`,
      ),

    setFrame: (patch) =>
      commitShot(
        (shot) => {
          const next = { ...shot.frame };
          if (patch.kind !== undefined) {
            if (!isFrameKind(patch.kind)) return null;
            next.kind = patch.kind;
          }
          if (patch.theme !== undefined) {
            if (patch.theme !== "light" && patch.theme !== "dark") return null;
            next.theme = patch.theme;
          }
          if (typeof patch.title === "string")
            next.title = patch.title.slice(0, MAX_FRAME_TEXT);
          if (typeof patch.url === "string")
            next.url = patch.url.slice(0, MAX_FRAME_TEXT);
          return { frame: next };
        },
        `frame-${Object.keys(patch).sort().join()}`,
      ),

    resetStyle: () => commitShot(() => defaultShotStyle()),

    loadDesign: (design, images) =>
      set((state) => ({
        design,
        past: [],
        future: [],
        revision: state.revision + 1,
        mergeKey: null,
        images: {
          ...state.images,
          ...Object.fromEntries(images.map((image) => [image.id, image])),
        },
      })),

    setActivePanel: (panel) => set(() => ({ activePanel: panel })),
    setMobilePanel: (panel) => set(() => ({ mobilePanel: panel })),
    setLoading: (loading) => set(() => ({ loading })),
    setRestoring: (restoring) => set(() => ({ restoring })),
    setExporting: (exporting) => set(() => ({ exporting })),
    setExportOptions: (patch) =>
      set((state) => ({
        exportOptions: sanitizeExportOptions({
          ...state.exportOptions,
          ...patch,
        }),
      })),
    showError: (message) =>
      set((state) => ({
        notice: { id: (state.notice?.id ?? 0) + 1, kind: "error", message },
      })),
    showInfo: (message) =>
      set((state) => ({
        notice: { id: (state.notice?.id ?? 0) + 1, kind: "info", message },
      })),
    dismissNotice: () => set(() => ({ notice: null })),
  };
});

export const selectShot = (state: EditorState): ShotLayer =>
  state.design.layers[0];

export const selectActiveImage = (state: EditorState): LoadedImage | null => {
  const id = state.design.layers[0].imageId;
  return id ? (state.images[id] ?? null) : null;
};

/** The uploaded background image, if the background is one. */
export const selectBackgroundImage = (
  state: EditorState,
): LoadedImage | null => {
  const { background } = state.design;
  if (background.kind !== "image" || background.source.type !== "upload")
    return null;
  return state.images[background.source.imageId] ?? null;
};

export const selectCanUndo = (state: EditorState) => state.past.length > 0;
export const selectCanRedo = (state: EditorState) => state.future.length > 0;
