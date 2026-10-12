import { z } from "zod";
import {
  BLUR,
  BORDER_WIDTH,
  INSET,
  MAX_FRAME_TEXT,
  NOISE,
  PADDING,
  RADIUS,
  ROTATION,
  SHOT_SCALE,
} from "./limits";
import { CUSTOM_SIZE, SIZE_PRESET_IDS } from "./sizes";

// The design document: everything needed to redraw a design, as plain JSON.
// Images are referenced by id; the decoded pixels live in the editor store.
// docs/screenshot-editor-m2-spec.md describes each field.

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a #rrggbb colour");

export const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: hexColorSchema,
});

/** CSS angle semantics: 0 points up, 90 points right. */
const angleSchema = z.number().min(0).lt(360);

export const linearBackgroundSchema = z.object({
  kind: z.literal("linear"),
  presetId: z.string().nullable(),
  angle: angleSchema,
  stops: z.array(gradientStopSchema).min(2),
});

export const radialBackgroundSchema = z.object({
  kind: z.literal("radial"),
  presetId: z.string().nullable(),
  stops: z.array(gradientStopSchema).min(2),
});

export const backgroundSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("solid"), color: hexColorSchema }),
  linearBackgroundSchema,
  radialBackgroundSchema,
  z.object({ kind: z.literal("mesh"), presetId: z.string().min(1) }),
  z.object({
    kind: z.literal("image"),
    source: z.discriminatedUnion("type", [
      z.object({ type: z.literal("upload"), imageId: z.string().min(1) }),
      z.object({
        type: z.literal("wallpaper"),
        wallpaperId: z.string().min(1),
      }),
    ]),
  }),
  z.object({ kind: z.literal("fromImage"), angle: angleSchema }),
  z.object({ kind: z.literal("transparent") }),
]);

export const backgroundFxSchema = z.object({
  noise: z.number().min(NOISE.min).max(NOISE.max),
  blur: z.number().min(BLUR.min).max(BLUR.max),
});

const sideSchema = z.number().int().min(CUSTOM_SIZE.min).max(CUSTOM_SIZE.max);

export const canvasSpecSchema = z.union([
  z.object({ preset: z.literal("auto") }),
  z.object({
    preset: z.enum(SIZE_PRESET_IDS),
    width: sideSchema,
    height: sideSchema,
  }),
  z.object({
    preset: z.literal("custom"),
    width: sideSchema,
    height: sideSchema,
  }),
]);

export const SHADOW_PRESET_IDS = [
  "none",
  "soft",
  "medium",
  "floating",
  "hard",
] as const;
export const shadowPresetIdSchema = z.enum(SHADOW_PRESET_IDS);

export const shadowSpecSchema = z.object({
  /** "custom" once any value was changed by hand. */
  preset: z.union([shadowPresetIdSchema, z.literal("custom")]),
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().min(0),
  color: hexColorSchema,
  opacity: z.number().min(0).max(1),
});

export const FRAME_KINDS = [
  "none",
  "macos",
  "browser",
  "windows",
  "minimal",
  "glass",
] as const;

export const frameSpecSchema = z.object({
  kind: z.enum(FRAME_KINDS),
  theme: z.enum(["light", "dark"]),
  title: z.string().max(MAX_FRAME_TEXT),
  url: z.string().max(MAX_FRAME_TEXT),
});

export const shotLayerSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("shot"),
  imageId: z.string().min(1).nullable(),
  padding: z.number().int().min(PADDING.min).max(PADDING.max),
  scale: z.number().min(SHOT_SCALE.min).max(SHOT_SCALE.max),
  position: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  rotation: z.number().int().min(ROTATION.min).max(ROTATION.max),
  radius: z.number().min(RADIUS.min).max(RADIUS.max),
  shadow: shadowSpecSchema,
  border: z.object({
    width: z.number().min(BORDER_WIDTH.min).max(BORDER_WIDTH.max),
    color: hexColorSchema,
    opacity: z.number().min(0).max(1),
  }),
  inset: z.object({
    size: z.number().min(INSET.min).max(INSET.max),
    color: z.union([hexColorSchema, z.literal("auto")]),
  }),
  frame: frameSpecSchema,
});

export const designSchema = z.object({
  version: z.literal(2),
  canvas: canvasSpecSchema,
  background: backgroundSchema,
  backgroundFx: backgroundFxSchema,
  // Exactly one screenshot layer until later milestones add more kinds.
  layers: z.tuple([shotLayerSchema]),
});

/** The milestone 1 design, kept so older saved designs can be migrated. */
export const designV1Schema = z.object({
  version: z.literal(1),
  canvas: z.object({ preset: z.literal("auto") }),
  background: linearBackgroundSchema,
  layers: z.tuple([
    z.object({
      id: z.string().min(1),
      kind: z.literal("shot"),
      imageId: z.string().min(1).nullable(),
      padding: z.number().int().min(PADDING.min).max(PADDING.max),
      radius: z.number().min(RADIUS.min).max(RADIUS.max),
      shadow: shadowSpecSchema.extend({ preset: shadowPresetIdSchema }),
    }),
  ]),
});

export type GradientStop = z.infer<typeof gradientStopSchema>;
export type LinearBackground = z.infer<typeof linearBackgroundSchema>;
export type RadialBackground = z.infer<typeof radialBackgroundSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type BackgroundKind = Background["kind"];
export type BackgroundFx = z.infer<typeof backgroundFxSchema>;
export type CanvasSpec = z.infer<typeof canvasSpecSchema>;
export type ShadowPresetId = z.infer<typeof shadowPresetIdSchema>;
export type ShadowSpec = z.infer<typeof shadowSpecSchema>;
export type FrameKind = (typeof FRAME_KINDS)[number];
export type FrameSpec = z.infer<typeof frameSpecSchema>;
export type ShotLayer = z.infer<typeof shotLayerSchema>;
export type ShotStyle = Omit<ShotLayer, "id" | "kind" | "imageId">;
export type Design = z.infer<typeof designSchema>;
export type DesignV1 = z.infer<typeof designV1Schema>;
