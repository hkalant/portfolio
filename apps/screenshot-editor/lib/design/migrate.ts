import { createDefaultDesign } from "./defaults";
import { designSchema, designV1Schema, type Design } from "./schema";

/** Size presets that were removed. Designs saved with one keep its size as a custom size. */
const RETIRED_SIZE_PRESETS: readonly string[] = ["product-hunt", "dribbble"];

function withoutRetiredSize(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const { canvas } = value as { canvas?: unknown };
  if (typeof canvas !== "object" || canvas === null) return value;
  const { preset } = canvas as { preset?: unknown };
  if (typeof preset !== "string" || !RETIRED_SIZE_PRESETS.includes(preset))
    return value;
  return { ...value, canvas: { ...canvas, preset: "custom" } };
}

/**
 * A valid current design from saved JSON of any known version, or null.
 * Fields added since that version get their defaults.
 */
export function migrateDesign(value: unknown): Design | null {
  const current = designSchema.safeParse(withoutRetiredSize(value));
  if (current.success) return current.data;

  const v1 = designV1Schema.safeParse(value);
  if (v1.success) {
    const defaults = createDefaultDesign();
    const [shot] = v1.data.layers;
    const migrated: Design = {
      ...defaults,
      background: v1.data.background,
      layers: [{ ...defaults.layers[0], ...shot }],
    };
    return designSchema.safeParse(migrated).success ? migrated : null;
  }
  return null;
}
