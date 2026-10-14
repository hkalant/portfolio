import { Ban, ImageIcon, PaintBucket, type LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BackgroundKind } from "@/lib/design/schema";

/** What the picker offers. Gradients and uploaded images are both "image". */
export type BackgroundChoice = "image" | "solid" | "none";

const CHOICES: readonly {
  value: BackgroundChoice;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "solid", label: "Solid", icon: PaintBucket },
  { value: "none", label: "None", icon: Ban },
];

/** Null for kinds the picker no longer offers, such as "fromImage" in older designs. */
export function backgroundChoice(
  kind: BackgroundKind,
): BackgroundChoice | null {
  switch (kind) {
    case "linear":
    case "radial":
    case "image":
      return "image";
    case "transparent":
      return "none";
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
      className="grid grid-cols-3 gap-1 rounded-lg p-1"
    >
      {CHOICES.map(({ value: option, label, icon: Icon }) => (
        <ToggleGroupItem
          key={option}
          value={option}
          className="h-auto flex-col gap-1 rounded-md px-1 py-2"
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
