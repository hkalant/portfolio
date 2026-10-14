import {
  Ban,
  ImageIcon,
  PaintBucket,
  Pipette,
  type LucideIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BackgroundKind } from "@/lib/design/schema";

/** What the picker offers. Gradients and uploaded images are both "image". */
export type BackgroundChoice = "image" | "solid" | "fromImage" | "none";

const CHOICES: readonly {
  value: BackgroundChoice;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "solid", label: "Solid", icon: PaintBucket },
  { value: "fromImage", label: "From image", icon: Pipette },
  { value: "none", label: "None", icon: Ban },
];

export function backgroundChoice(kind: BackgroundKind): BackgroundChoice {
  switch (kind) {
    case "linear":
    case "radial":
    case "image":
      return "image";
    case "transparent":
      return "none";
    default:
      return kind;
  }
}

type Props = {
  value: BackgroundChoice;
  onChange: (choice: BackgroundChoice) => void;
};

export function BackgroundKindPicker({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      aria-label="Background type"
      value={value}
      // Radix reports "" when the active option is clicked again; keep the current one.
      onValueChange={(next) => {
        const choice = CHOICES.find((option) => option.value === next);
        if (choice) onChange(choice.value);
      }}
      className="grid grid-cols-4 gap-1 rounded-lg p-1"
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
