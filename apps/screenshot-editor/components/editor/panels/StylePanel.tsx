import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  BORDER_WIDTH,
  RADIUS,
  SHADOW_BLUR,
  SHADOW_OFFSET,
} from "@/lib/design/limits";
import type { ShadowPresetId } from "@/lib/design/schema";
import { SHADOW_LABELS, SHADOW_PRESET_ORDER } from "@/lib/design/shadows";
import { selectShot, useEditorStore } from "@/lib/store/editor";
import { ColorField } from "../controls/ColorField";
import { LabeledSlider } from "../controls/LabeledSlider";
import { Segmented } from "../controls/Segmented";

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
  const setRadius = useEditorStore((state) => state.setRadius);
  const setShadowPreset = useEditorStore((state) => state.setShadowPreset);
  const setShadow = useEditorStore((state) => state.setShadow);
  const setBorder = useEditorStore((state) => state.setBorder);
  const resetStyle = useEditorStore((state) => state.resetStyle);
  const [shadowOpen, setShadowOpen] = useState(
    () => shot.shadow.preset === "custom",
  );
  const { shadow, border } = shot;

  return (
    <div className="space-y-8">
      <Section title="Corners">
        <LabeledSlider
          label="Corner radius"
          value={shot.radius}
          min={RADIUS.min}
          max={RADIUS.max}
          step={RADIUS.step}
          unit="px"
          onChange={setRadius}
        />
      </Section>

      <Section title="Shadow">
        {/* No option is on while the shadow is hand-tuned ("custom"). */}
        <Segmented<ShadowPresetId | "custom">
          label="Shadow"
          value={shadow.preset}
          options={SHADOW_OPTIONS}
          onChange={setShadowPreset}
        />
        <Collapsible.Root
          open={shadowOpen}
          onOpenChange={setShadowOpen}
          className="space-y-5"
        >
          <Collapsible.Trigger className="group -mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Customise shadow
            <ChevronDown
              className="size-4 transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </Collapsible.Trigger>
          <Collapsible.Content className="space-y-5">
            <LabeledSlider
              label="Shadow offset"
              value={shadow.offsetY}
              min={SHADOW_OFFSET.min}
              max={SHADOW_OFFSET.max}
              step={SHADOW_OFFSET.step}
              unit="px"
              onChange={(offsetY) => setShadow({ offsetY })}
            />
            <LabeledSlider
              label="Shadow blur"
              value={shadow.blur}
              min={SHADOW_BLUR.min}
              max={SHADOW_BLUR.max}
              step={SHADOW_BLUR.step}
              unit="px"
              onChange={(blur) => setShadow({ blur })}
            />
            <LabeledSlider
              label="Shadow opacity"
              value={percent(shadow.opacity)}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => setShadow({ opacity: value / 100 })}
            />
            <ColorField
              label="Shadow colour"
              value={shadow.color}
              onChange={(color) => setShadow({ color })}
            />
          </Collapsible.Content>
        </Collapsible.Root>
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
