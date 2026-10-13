import { ImageUp } from "lucide-react";
import { useId, useMemo, useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { defaultBackground } from "@/lib/design/defaults";
import {
  GRADIENT_PRESETS,
  toCssLinearGradient,
  type GradientGroup,
} from "@/lib/design/gradients";
import { ANGLE, BLUR } from "@/lib/design/limits";
import type {
  Background,
  BackgroundFx,
  Design,
  LinearBackground,
  RadialBackground,
} from "@/lib/design/schema";
import { DEFAULT_WALLPAPER, WALLPAPERS } from "@/lib/design/wallpapers";
import { ACCEPT_ATTR } from "@/lib/image/accept";
import { dominantColors, sampleImagePixels } from "@/lib/image/colors";
import { ingestFile } from "@/lib/image/ingest";
import { fromImageStops } from "@/lib/render/fromImage";
import { imageThumbnail, wallpaperThumbnail } from "@/lib/render/wallpaper";
import {
  selectActiveImage,
  selectLastBackgroundUpload,
  useEditorStore,
} from "@/lib/store/editor";
import {
  backgroundChoice,
  BackgroundKindPicker,
  type BackgroundChoice,
} from "../controls/BackgroundKindPicker";
import { ColorField } from "../controls/ColorField";
import { LabeledSlider } from "../controls/LabeledSlider";
import { SwatchGrid, type Swatch } from "../controls/SwatchGrid";

const SOLID_COLORS: readonly { name: string; color: string }[] = [
  { name: "White", color: "#ffffff" },
  { name: "Light grey", color: "#e5e7eb" },
  { name: "Black", color: "#0a0a0a" },
  { name: "Navy", color: "#1e2a5a" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Teal", color: "#14b8a6" },
  { name: "Green", color: "#22c55e" },
  { name: "Yellow", color: "#facc15" },
  { name: "Orange", color: "#f97316" },
  { name: "Pink", color: "#ec4899" },
];

function gradientSwatches(group: GradientGroup): readonly Swatch[] {
  return GRADIENT_PRESETS.filter((preset) => preset.group === group).map(
    (preset) => ({
      id: preset.id,
      name: preset.name,
      style: {
        backgroundImage: toCssLinearGradient(preset.angle, preset.stops),
      },
    }),
  );
}

const BROOKES_SWATCHES = gradientSwatches("brookes");
const GENERIC_SWATCHES = gradientSwatches("generic");

/** The newest gradient in the undo history, so switching back restores it. */
function lastGradient(past: readonly Design[]): Background | null {
  for (let i = past.length - 1; i >= 0; i -= 1) {
    const { background } = past[i];
    if (background.kind === "linear" || background.kind === "radial")
      return background;
  }
  return null;
}

/** Switches the background kind, starting from a sensible default for it. */
function chooseKind(choice: BackgroundChoice) {
  const state = useEditorStore.getState();
  switch (choice) {
    case "gradient":
      state.setBackground(lastGradient(state.past) ?? defaultBackground());
      break;
    case "solid":
      state.setBackground({ kind: "solid", color: "#ffffff" });
      break;
    case "image": {
      // Back to the last uploaded background, if there is one.
      const upload = selectLastBackgroundUpload(state);
      if (upload) state.setBackgroundImage(upload);
      else state.setWallpaper(DEFAULT_WALLPAPER.id);
      break;
    }
    case "fromImage":
      state.setFromImage();
      break;
    case "none":
      state.setTransparent();
      break;
  }
}

export function BackgroundPanel() {
  const background = useEditorStore((state) => state.design.background);
  const fx = useEditorStore((state) => state.design.backgroundFx);
  const choice = backgroundChoice(background.kind);

  return (
    <div className="space-y-6">
      <BackgroundKindPicker value={choice} onChange={chooseKind} />
      {(background.kind === "linear" || background.kind === "radial") && (
        <GradientControls background={background} />
      )}
      {background.kind === "solid" && (
        <SolidControls color={background.color} />
      )}
      {background.kind === "image" && <ImageControls background={background} />}
      {background.kind === "fromImage" && (
        <FromImageControls angle={background.angle} />
      )}
      {choice === "image" && <EffectsControls fx={fx} />}
    </div>
  );
}

function GradientControls({
  background,
}: {
  background: LinearBackground | RadialBackground;
}) {
  const applyGradientPreset = useEditorStore(
    (state) => state.applyGradientPreset,
  );
  const setGradientAngle = useEditorStore((state) => state.setGradientAngle);
  const setGradientStop = useEditorStore((state) => state.setGradientStop);
  const { stops } = background;
  const last = stops.length - 1;

  return (
    <>
      <SwatchGrid
        label="Oxford Brookes"
        swatches={BROOKES_SWATCHES}
        selectedId={background.presetId}
        onSelect={applyGradientPreset}
      />
      <SwatchGrid
        label="Generic"
        swatches={GENERIC_SWATCHES}
        selectedId={background.presetId}
        onSelect={applyGradientPreset}
      />
      {background.kind === "linear" && (
        <LabeledSlider
          label="Angle"
          value={background.angle}
          min={ANGLE.min}
          max={ANGLE.max}
          step={ANGLE.step}
          unit="°"
          onChange={setGradientAngle}
        />
      )}
      <div className="space-y-2">
        <ColorField
          label="Start colour"
          value={stops[0].color}
          onChange={(color) => setGradientStop(0, color)}
        />
        <ColorField
          label="End colour"
          value={stops[last].color}
          onChange={(color) => setGradientStop(last, color)}
        />
      </div>
    </>
  );
}

const SOLID_SWATCHES: readonly Swatch[] = SOLID_COLORS.map(
  ({ name, color }) => ({
    id: color,
    name,
    style: { backgroundColor: color },
  }),
);

function SolidControls({ color }: { color: string }) {
  const setSolidColor = useEditorStore((state) => state.setSolidColor);
  const setBackground = useEditorStore((state) => state.setBackground);
  return (
    <div className="space-y-4">
      <ColorField label="Colour" value={color} onChange={setSolidColor} />
      <SwatchGrid
        label="Quick colours"
        hideLabel
        swatches={SOLID_SWATCHES}
        selectedId={color}
        columns={10}
        shape="dot"
        // A click is its own undo step, unlike dragging in the colour picker.
        onSelect={(next) => setBackground({ kind: "solid", color: next })}
      />
    </div>
  );
}

const UPLOAD_TILE_ID = "upload";

function ImageControls({
  background,
}: {
  background: Extract<Background, { kind: "image" }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setWallpaper = useEditorStore((state) => state.setWallpaper);
  const setBackgroundImage = useEditorStore(
    (state) => state.setBackgroundImage,
  );
  // Stays in the grid after picking a wallpaper, so it can be picked again.
  const upload = useEditorStore(selectLastBackgroundUpload);
  const wallpaperSwatches = useMemo(
    () =>
      WALLPAPERS.map((wallpaper): Swatch => {
        const thumbnail = wallpaperThumbnail(wallpaper.id);
        const [from, to] = wallpaper.swatch;
        return {
          id: wallpaper.id,
          name: wallpaper.name,
          style: {
            backgroundImage: [
              thumbnail && `url("${thumbnail}")`,
              `linear-gradient(135deg, ${from}, ${to})`,
            ]
              .filter(Boolean)
              .join(", "),
          },
        };
      }),
    [],
  );
  const swatches = useMemo(() => {
    const thumbnail = upload && imageThumbnail(upload.source);
    if (!upload || !thumbnail) return wallpaperSwatches;
    const uploadTile: Swatch = {
      id: UPLOAD_TILE_ID,
      name: "Uploaded image",
      style: { backgroundImage: `url("${thumbnail}")` },
    };
    return [uploadTile, ...wallpaperSwatches];
  }, [upload, wallpaperSwatches]);
  const selectedId =
    background.source.type === "upload"
      ? UPLOAD_TILE_ID
      : background.source.wallpaperId;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires change
    if (file) void ingestFile(file, "background");
  };

  return (
    <div className="space-y-4">
      <SwatchGrid
        label="Wallpapers"
        swatches={swatches}
        selectedId={selectedId}
        columns={3}
        aspect="aspect-[4/3]"
        onSelect={(id) => {
          if (id !== UPLOAD_TILE_ID) setWallpaper(id);
          else if (upload && background.source.type !== "upload")
            setBackgroundImage(upload);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => inputRef.current?.click()}
      >
        <ImageUp aria-hidden />
        Upload background
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-label="Background image file"
        data-testid="background-file-input"
        onChange={onFileChange}
      />
    </div>
  );
}

function FromImageControls({ angle }: { angle: number }) {
  const setFromImageAngle = useEditorStore((state) => state.setFromImageAngle);
  const screenshot = useEditorStore(selectActiveImage);
  const source = screenshot?.source ?? null;
  const preview = useMemo(() => {
    const pixels = source && sampleImagePixels(source);
    const stops = pixels && fromImageStops(dominantColors(pixels));
    return stops ? toCssLinearGradient(90, stops) : null;
  }, [source]);

  return (
    <div className="space-y-4">
      <LabeledSlider
        label="Angle"
        value={angle}
        min={ANGLE.min}
        max={ANGLE.max}
        step={ANGLE.step}
        unit="°"
        onChange={setFromImageAngle}
      />
      {screenshot ? (
        preview && (
          <div className="space-y-2">
            <div
              className="h-6 rounded-md border"
              style={{ backgroundImage: preview }}
              aria-hidden
            />
            <p className="text-xs text-muted-foreground">
              Colours picked from your screenshot.
            </p>
          </div>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          Add a screenshot to build a gradient from its colours.
        </p>
      )}
    </div>
  );
}

function EffectsControls({ fx }: { fx: BackgroundFx }) {
  const headingId = useId();
  const setBlur = useEditorStore((state) => state.setBlur);
  return (
    <section aria-labelledby={headingId} className="space-y-5 border-t pt-5">
      <h3
        id={headingId}
        className="text-sm font-semibold text-muted-foreground"
      >
        Effects
      </h3>
      <LabeledSlider
        label="Blur"
        value={fx.blur}
        min={BLUR.min}
        max={BLUR.max}
        step={BLUR.step}
        unit="px"
        onChange={setBlur}
      />
    </section>
  );
}
