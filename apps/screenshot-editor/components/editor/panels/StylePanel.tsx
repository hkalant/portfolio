import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BORDER_WIDTH } from "@/lib/design/limits";
import type { ShadowPresetId } from "@/lib/design/schema";
import { SHADOW_LABELS, SHADOW_PRESET_ORDER } from "@/lib/design/shadows";
import { selectShot, useEditorStore } from "@/lib/store/editor";
import { ColorField } from "../controls/ColorField";
import { LabeledSlider } from "../controls/LabeledSlider";
import { Segmented } from "../controls/Segmented";
import { FrameOptions } from "./FramePanel";

const SHADOW_OPTIONS = SHADOW_PRESET_ORDER.map((id) => ({
  value: id,
  label: SHADOW_LABELS[id],
}));

const percent = (value: number) => Math.round(value * 100);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function StylePanel() {
  const shot = useEditorStore(selectShot);
  const setShadowPreset = useEditorStore((state) => state.setShadowPreset);
  const setBorder = useEditorStore((state) => state.setBorder);
  const resetStyle = useEditorStore((state) => state.resetStyle);
  const { shadow, border } = shot;

  return (
    <div className="space-y-8">
      <Section title="Frame">
        <FrameOptions />
      </Section>

      <Section title="Shadow">
        {/* No option is on while the shadow is hand-tuned ("custom"). */}
        <Segmented<ShadowPresetId | "custom">
          label="Shadow"
          hideLabel
          value={shadow.preset}
          options={SHADOW_OPTIONS}
          onChange={setShadowPreset}
        />
      </Section>

      <Section title="Border">
        <LabeledSlider
          label="Border width"
          value={border.width}
          min={BORDER_WIDTH.min}
          max={BORDER_WIDTH.max}
          step={BORDER_WIDTH.step}
          unit="px"
          onChange={(width) => setBorder({ width })}
        />
        <LabeledSlider
          label="Border opacity"
          value={percent(border.opacity)}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => setBorder({ opacity: value / 100 })}
        />
        <ColorField
          label="Border colour"
          value={border.color}
          onChange={(color) => setBorder({ color })}
        />
      </Section>

      <Button variant="outline" className="w-full" onClick={resetStyle}>
        Reset style
      </Button>
    </div>
  );
}
