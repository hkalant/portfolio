import { ANGLE } from "@/lib/design/limits";
import { GRADIENT_PRESETS } from "@/lib/design/gradients";
import { useEditorStore } from "@/lib/store/editor";
import { LabeledSlider } from "../controls/LabeledSlider";
import { PresetGrid } from "../controls/PresetGrid";

export function BackgroundPanel() {
  const background = useEditorStore((state) => state.design.background);
  const applyGradientPreset = useEditorStore(
    (state) => state.applyGradientPreset,
  );
  const setGradientAngle = useEditorStore((state) => state.setGradientAngle);

  return (
    <div className="space-y-6">
      <PresetGrid
        label="Gradient"
        presets={GRADIENT_PRESETS}
        selectedId={background.presetId}
        onSelect={applyGradientPreset}
      />
      <LabeledSlider
        label="Angle"
        value={background.angle}
        min={ANGLE.min}
        max={ANGLE.max}
        step={ANGLE.step}
        unit="°"
        onChange={setGradientAngle}
      />
    </div>
  );
}
