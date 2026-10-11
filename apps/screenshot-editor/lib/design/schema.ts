import { z } from "zod";
import { PADDING, RADIUS } from "./limits";

// The design document: everything needed to redraw a design, as plain JSON.
// Images are referenced by id; the decoded pixels live in the editor store.
// M1 holds a subset of the full model in docs/screenshot-editor-plan.md.

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a #rrggbb colour");

export const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: hexColorSchema,
});

export const linearBackgroundSchema = z.object({
  kind: z.literal("linear"),
  presetId: z.string().nullable(),
  /** CSS angle semantics: 0 points up, 90 points right. */
  angle: z.number().min(0).lt(360),
  stops: z.array(gradientStopSchema).min(2),
});

export const SHADOW_PRESET_IDS = [
  "none",
  "soft",
  "medium",
  "floating",
  "hard",
] as const;
export const shadowPresetIdSchema = z.enum(SHADOW_PRESET_IDS);

export const shadowSpecSchema = z.object({
  preset: shadowPresetIdSchema,
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().min(0),
  color: hexColorSchema,
  opacity: z.number().min(0).max(1),
});

export const shotLayerSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("shot"),
  imageId: z.string().min(1).nullable(),
  padding: z.number().int().min(PADDING.min).max(PADDING.max),
  radius: z.number().min(RADIUS.min).max(RADIUS.max),
  shadow: shadowSpecSchema,
});

export const designSchema = z.object({
  version: z.literal(1),
  canvas: z.object({ preset: z.literal("auto") }),
  background: linearBackgroundSchema,
  // M1 always has exactly one screenshot layer; M2 adds more layer kinds.
  layers: z.array(shotLayerSchema).length(1),
});

export type GradientStop = z.infer<typeof gradientStopSchema>;
export type LinearBackground = z.infer<typeof linearBackgroundSchema>;
export type ShadowPresetId = z.infer<typeof shadowPresetIdSchema>;
export type ShadowSpec = z.infer<typeof shadowSpecSchema>;
export type ShotLayer = z.infer<typeof shotLayerSchema>;
export type Design = z.infer<typeof designSchema>;
