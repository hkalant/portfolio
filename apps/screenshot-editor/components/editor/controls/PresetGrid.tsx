import type { GradientPreset } from "@/lib/design/gradients";
import { toCssLinearGradient } from "@/lib/design/gradients";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  presets: readonly GradientPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PresetGrid({ label, presets, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-2.5">
      <div className="text-sm font-medium" id="preset-grid-label">
        {label}
      </div>
      <div
        className="grid grid-cols-4 gap-2"
        role="group"
        aria-labelledby="preset-grid-label"
      >
        {presets.map((preset) => {
          const selected = preset.id === selectedId;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={selected}
              onClick={() => onSelect(preset.id)}
              className={cn(
                "aspect-square rounded-lg ring-offset-2 ring-offset-background transition-[box-shadow,transform] outline-none hover:scale-[1.04] focus-visible:ring-[3px] focus-visible:ring-ring",
                selected && "ring-2 ring-primary",
              )}
              style={{
                backgroundImage: toCssLinearGradient(
                  preset.angle,
                  preset.stops,
                ),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
