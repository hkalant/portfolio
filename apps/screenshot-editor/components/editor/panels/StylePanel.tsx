import { ChevronDown, RotateCcw } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { alignedPosition, type Alignment } from "@/lib/design/layout";
import {
  BORDER_WIDTH,
  INSET,
  PADDING,
  RADIUS,
  ROTATION,
  SHADOW_BLUR,
  SHADOW_OFFSET,
  SHOT_SCALE,
} from "@/lib/design/limits";
import type { ShadowPresetId } from "@/lib/design/schema";
import { SHADOW_LABELS, SHADOW_PRESET_ORDER } from "@/lib/design/shadows";
import { edgeColor, sampleImagePixels } from "@/lib/image/colors";
import { resolveInsetColor } from "@/lib/render/frame";
import {
  selectActiveImage,
  selectShot,
  useEditorStore,
} from "@/lib/store/editor";
import { useDesignLayout } from "@/lib/store/hooks";
import { AlignGrid } from "../controls/AlignGrid";
import { ColorField } from "../controls/ColorField";
import { LabeledSlider } from "../controls/LabeledSlider";
import { Segmented } from "../controls/Segmented";

const SHADOW_OPTIONS = SHADOW_PRESET_ORDER.map((id) => ({
  value: id,
  label: SHADOW_LABELS[id],
}));

const INSET_COLOR_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "custom", label: "Custom" },
] as const;

const percent = (value: number) => Math.round(value * 100);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function StylePanel() {
  const shot = useEditorStore(selectShot);
  const image = useEditorStore(selectActiveImage);
  const fixedCanvas = useEditorStore(
    (state) => state.design.canvas.preset !== "auto",
  );
  const layout = useDesignLayout();
  const setPadding = useEditorStore((state) => state.setPadding);
  const setScale = useEditorStore((state) => state.setScale);
  const alignTo = useEditorStore((state) => state.alignTo);
  const setRotation = useEditorStore((state) => state.setRotation);
  const setRadius = useEditorStore((state) => state.setRadius);
  const setShadowPreset = useEditorStore((state) => state.setShadowPreset);
  const setShadow = useEditorStore((state) => state.setShadow);
  const setBorder = useEditorStore((state) => state.setBorder);
  const setInset = useEditorStore((state) => state.setInset);
  const resetStyle = useEditorStore((state) => state.resetStyle);
  const [shadowOpen, setShadowOpen] = useState(
    () => shot.shadow.preset === "custom",
  );
  const { shadow, border, inset } = shot;

  // Positions are stored to 4 places, so compare with a little slack.
  const isAligned = (horizontal: Alignment, vertical: Alignment) => {
    if (!layout) return false;
    const target = alignedPosition(layout, shot.padding, horizontal, vertical);
    return (
      Math.abs(target.x - shot.position.x) < 1e-3 &&
      Math.abs(target.y - shot.position.y) < 1e-3
    );
  };

  // "Custom" starts from the colour "Auto" was showing.
  const chooseInsetMode = (mode: "auto" | "custom") => {
    if (mode === "auto") {
      setInset({ color: "auto" });
    } else if (inset.color === "auto") {
      const pixels = image ? sampleImagePixels(image.source) : null;
      setInset({
        color: resolveInsetColor("auto", pixels && edgeColor(pixels)),
      });
    }
  };

  return (
    <div className="space-y-8">
      <Section title="Layout">
        <LabeledSlider
          label="Padding"
          value={shot.padding}
          min={PADDING.min}
          max={PADDING.max}
          step={PADDING.step}
          unit="px"
          onChange={setPadding}
        />
        {fixedCanvas ? (
          <>
            <LabeledSlider
              label="Scale"
              value={percent(shot.scale)}
              min={percent(SHOT_SCALE.min)}
              max={percent(SHOT_SCALE.max)}
              step={1}
              unit="%"
              onChange={(value) => setScale(value / 100)}
            />
            <AlignGrid
              label="Position"
              onAlign={alignTo}
              isActive={isAligned}
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Scale and position need a fixed canvas size.
          </p>
        )}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <LabeledSlider
              label="Rotation"
              value={shot.rotation}
              min={ROTATION.min}
              max={ROTATION.max}
              step={ROTATION.step}
              unit="°"
              onChange={setRotation}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Reset rotation"
            title="Reset rotation"
            disabled={shot.rotation === 0}
            onClick={() => setRotation(0)}
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </Button>
        </div>
      </Section>

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
          <Collapsible.Trigger className="group -mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring">
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

      <Section title="Inset">
        <LabeledSlider
          label="Inset"
          value={inset.size}
          min={INSET.min}
          max={INSET.max}
          step={INSET.step}
          unit="px"
          onChange={(size) => setInset({ size })}
        />
        <Segmented
          label="Inset colour"
          value={inset.color === "auto" ? "auto" : "custom"}
          options={INSET_COLOR_OPTIONS}
          onChange={chooseInsetMode}
        />
        {inset.color !== "auto" && (
          <ColorField
            label="Custom inset colour"
            value={inset.color}
            onChange={(color) => setInset({ color })}
          />
        )}
      </Section>

      <Button variant="outline" className="w-full" onClick={resetStyle}>
        Reset style
      </Button>
    </div>
  );
}
