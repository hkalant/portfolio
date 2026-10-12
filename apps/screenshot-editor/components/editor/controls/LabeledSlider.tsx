import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/lib/store/editor";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** How the value is shown next to the label; defaults to value + unit. */
  format?: (value: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  format,
  disabled,
  onChange,
}: Props) {
  const sealHistory = useEditorStore((state) => state.sealHistory);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {format ? format(value) : `${value}${unit}`}
        </span>
      </div>
      <Slider
        thumbLabel={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
        // One drag is one undo step, even when the next one follows quickly.
        onValueCommit={sealHistory}
      />
    </div>
  );
}
