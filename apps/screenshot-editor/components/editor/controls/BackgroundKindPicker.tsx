import { ImageIcon, PaintBucket, type LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BackgroundKind } from "@/lib/design/schema";

/** What the picker offers. Gradients and uploaded images are both "image". */
export type BackgroundChoice = "image" | "solid";

const CHOICES: readonly {
  value: BackgroundChoice;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "solid", label: "Solid", icon: PaintBucket },
];

/**
 * Null for kinds the picker no longer offers: "fromImage" and "transparent"
 * in older designs.
 */
export function backgroundChoice(
  kind: BackgroundKind,
): BackgroundChoice | null {
  switch (kind) {
    case "linear":
    case "radial":
    case "image":
      return "image";
    case "solid":
      return "solid";
    default:
      return null;
  }
}

type Props = {
  value: BackgroundChoice | null;
  onChange: (choice: BackgroundChoice) => void;
};

export function BackgroundKindPicker({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      aria-label="Background type"
      value={value ?? ""}
      // Radix reports "" when the active option is clicked again; keep the current one.
      onValueChange={(next) => {
        const choice = CHOICES.find((option) => option.value === next);
        if (choice) onChange(choice.value);
      }}
      // A Liquid Glass capsule, like the toolbar over the canvas.
      className="grid grid-cols-2 gap-1 rounded-full glass bg-(--glass) p-1 contrast-more:bg-background"
    >
      {CHOICES.map(({ value: option, label, icon: Icon }) => (
        <ToggleGroupItem
          key={option}
          value={option}
          className="h-9 gap-1.5 rounded-full px-3 text-sm"
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
