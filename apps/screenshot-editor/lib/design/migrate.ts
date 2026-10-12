import { createDefaultDesign } from "./defaults";
import { designSchema, designV1Schema, type Design } from "./schema";

/**
 * A valid current design from saved JSON of any known version, or null.
 * Fields added since that version get their defaults.
 */
export function migrateDesign(value: unknown): Design | null {
  const current = designSchema.safeParse(value);
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
