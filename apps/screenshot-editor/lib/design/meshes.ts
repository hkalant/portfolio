// Mesh backgrounds: a base colour with large, soft colour blobs on top.
// Positions and radii are fractions of the canvas, so a mesh fits any size.

export type MeshBlob = { x: number; y: number; r: number; color: string };

export type MeshPreset = {
  id: string;
  name: string;
  base: string;
  blobs: readonly MeshBlob[];
};

const blob = (x: number, y: number, r: number, color: string): MeshBlob => ({
  x,
  y,
  r,
  color,
});

/** The first preset is the default when switching to Mesh. */
export const MESH_PRESETS: readonly MeshPreset[] = [
  {
    id: "candy",
    name: "Candy",
    base: "#ffd6e8",
    blobs: [
      blob(0.1, 0.15, 0.6, "#ff9ad5"),
      blob(0.9, 0.2, 0.55, "#a78bfa"),
      blob(0.75, 0.95, 0.6, "#fcd34d"),
      blob(0.15, 0.9, 0.5, "#7dd3fc"),
    ],
  },
  {
    id: "lagoon",
    name: "Lagoon",
    base: "#0f766e",
    blobs: [
      blob(0.0, 0.0, 0.7, "#2dd4bf"),
      blob(1.0, 0.3, 0.6, "#0ea5e9"),
      blob(0.4, 1.0, 0.65, "#22c55e"),
    ],
  },
  {
    id: "dusk",
    name: "Dusk",
    base: "#1e1b4b",
    blobs: [
      blob(0.2, 0.2, 0.6, "#7c3aed"),
      blob(0.85, 0.35, 0.55, "#db2777"),
      blob(0.5, 1.0, 0.6, "#f97316"),
    ],
  },
  {
    id: "citrus",
    name: "Citrus",
    base: "#fef9c3",
    blobs: [
      blob(0.0, 0.3, 0.6, "#facc15"),
      blob(0.9, 0.1, 0.55, "#fb923c"),
      blob(0.6, 0.95, 0.6, "#a3e635"),
    ],
  },
  {
    id: "glacier",
    name: "Glacier",
    base: "#e0f2fe",
    blobs: [
      blob(0.15, 0.1, 0.55, "#bae6fd"),
      blob(0.9, 0.5, 0.6, "#c7d2fe"),
      blob(0.3, 0.95, 0.55, "#a5f3fc"),
    ],
  },
  {
    id: "ember",
    name: "Ember",
    base: "#450a0a",
    blobs: [
      blob(0.1, 0.9, 0.65, "#dc2626"),
      blob(0.85, 0.15, 0.6, "#f59e0b"),
      blob(0.55, 0.5, 0.4, "#be123c"),
    ],
  },
  {
    id: "orchid",
    name: "Orchid",
    base: "#f5d0fe",
    blobs: [
      blob(0.85, 0.85, 0.6, "#e879f9"),
      blob(0.1, 0.2, 0.55, "#c4b5fd"),
      blob(0.6, 0.1, 0.45, "#fbcfe8"),
    ],
  },
  {
    id: "graphite",
    name: "Graphite",
    base: "#111827",
    blobs: [
      blob(0.2, 0.1, 0.6, "#374151"),
      blob(0.9, 0.8, 0.6, "#1f2937"),
      blob(0.5, 0.5, 0.35, "#4b5563"),
    ],
  },
];

export const DEFAULT_MESH = MESH_PRESETS[0];

export function getMeshPreset(id: string): MeshPreset | undefined {
  return MESH_PRESETS.find((preset) => preset.id === id);
}
