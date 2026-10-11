import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <div className="space-y-2.5">
      <div className="text-sm font-medium">{label}</div>
      <ToggleGroup
        type="single"
        aria-label={label}
        value={value}
        // Radix reports "" when the active option is clicked again; keep the current one.
        onValueChange={(next) => {
          if (next) onChange(next as T);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
