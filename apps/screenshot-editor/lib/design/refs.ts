import type { Design } from "./schema";

/** Ids of every image a design draws: the screenshot and an uploaded background. */
export function referencedImageIds(design: Design): string[] {
  const ids: string[] = [];
  for (const layer of design.layers) if (layer.imageId) ids.push(layer.imageId);
  const { background } = design;
  if (background.kind === "image" && background.source.type === "upload")
    ids.push(background.source.imageId);
  return ids;
}
