import { PADDING, RADIUS } from "@/lib/design/limits";
import { SHADOW_LABELS, SHADOW_PRESET_ORDER } from "@/lib/design/shadows";
import { selectShot, useEditorStore } from "@/lib/store/editor";
import { LabeledSlider } from "../controls/LabeledSlider";
import { Segmented } from "../controls/Segmented";

const SHADOW_OPTIONS = SHADOW_PRESET_ORDER.map((id) => ({
  value: id,
  label: SHADOW_LABELS[id],
}));

export function StylePanel() {
  const shot = useEditorStore(selectShot);
  const setPadding = useEditorStore((state) => state.setPadding);
  const setRadius = useEditorStore((state) => state.setRadius);
  const setShadowPreset = useEditorStore((state) => state.setShadowPreset);

  return (
    <div className="space-y-6">
      <LabeledSlider
        label="Padding"
        value={shot.padding}
        min={PADDING.min}
        max={PADDING.max}
        step={PADDING.step}
        unit="px"
        onChange={setPadding}
      />
      <LabeledSlider
        label="Corner radius"
        value={shot.radius}
        min={RADIUS.min}
        max={RADIUS.max}
        step={RADIUS.step}
        unit="px"
        onChange={setRadius}
      />
      <Segmented
        label="Shadow"
        value={shot.shadow.preset}
        options={SHADOW_OPTIONS}
        onChange={setShadowPreset}
      />
    </div>
  );
}
