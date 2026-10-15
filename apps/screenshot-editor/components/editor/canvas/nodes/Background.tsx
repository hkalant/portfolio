import { useMemo } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import {
  DEFAULT_GRADIENT,
  linearGradientPoints,
  radialGradientGeometry,
  toKonvaColorStops,
} from "@/lib/design/gradients";
import type { Size } from "@/lib/design/layout";
import type {
  Background,
  BackgroundFx,
  GradientStop,
} from "@/lib/design/schema";
import { DEFAULT_WALLPAPER, getWallpaper } from "@/lib/design/wallpapers";
import { dominantColors, sampleImagePixels } from "@/lib/image/colors";
import type { LoadedImage } from "@/lib/image/load";
import { getBlurredImage, roundBlurSigma } from "@/lib/render/blur";
import { coverCrop, coverScale, sourceSize } from "@/lib/render/cover";
import { fromImageStops } from "@/lib/render/fromImage";
import { getWallpaperCanvas } from "@/lib/render/wallpaper";

type Props = {
  canvas: Size;
  background: Background;
  fx: BackgroundFx;
  /** The screenshot, for "fromImage" backgrounds. */
  screenshot: LoadedImage;
  /** The uploaded background image, for "image" backgrounds with an upload. */
  backgroundImage: LoadedImage | null;
};

type Source = HTMLImageElement | HTMLCanvasElement;

// Everything is drawn in design px at canvas size. The preview scales the stage
// down and the export renders it at up to 4x, so nothing here may depend on
// the on-screen size.

/** The design's background. Draws nothing when transparent. */
export function BackgroundNode({
  canvas,
  background,
  fx,
  screenshot,
  backgroundImage,
}: Props) {
  if (background.kind === "transparent") return null;
  return (
    <Group listening={false}>
      <Fill
        canvas={canvas}
        background={background}
        blur={fx.blur}
        screenshot={screenshot}
        backgroundImage={backgroundImage}
      />
    </Group>
  );
}

function Fill({
  canvas,
  background,
  blur,
  screenshot,
  backgroundImage,
}: Omit<Props, "fx"> & { blur: number }) {
  switch (background.kind) {
    case "solid":
      return (
        <Rect
          width={canvas.width}
          height={canvas.height}
          fill={background.color}
          listening={false}
        />
      );
    case "linear":
      return (
        <LinearFill
          canvas={canvas}
          angle={background.angle}
          stops={background.stops}
        />
      );
    case "radial":
      return <RadialFill canvas={canvas} stops={background.stops} />;
    case "image":
      if (background.source.type === "wallpaper")
        return (
          <WallpaperFill
            canvas={canvas}
            id={background.source.wallpaperId}
            blur={blur}
          />
        );
      // The upload may be missing, for example after a failed restore.
      return backgroundImage ? (
        <ImageFill
          canvas={canvas}
          source={backgroundImage.source}
          blur={blur}
        />
      ) : (
        <DefaultFill canvas={canvas} />
      );
    case "fromImage":
      return (
        <FromImageFill
          canvas={canvas}
          angle={background.angle}
          screenshot={screenshot}
        />
      );
    case "transparent":
      return null;
  }
}

function LinearFill({
  canvas,
  angle,
  stops,
}: {
  canvas: Size;
  angle: number;
  stops: readonly GradientStop[];
}) {
  const { start, end } = linearGradientPoints(
    angle,
    canvas.width,
    canvas.height,
  );
  return (
    <Rect
      width={canvas.width}
      height={canvas.height}
      fillLinearGradientStartPoint={start}
      fillLinearGradientEndPoint={end}
      fillLinearGradientColorStops={toKonvaColorStops(stops)}
      listening={false}
    />
  );
}

function DefaultFill({ canvas }: { canvas: Size }) {
  return (
    <LinearFill
      canvas={canvas}
      angle={DEFAULT_GRADIENT.angle}
      stops={DEFAULT_GRADIENT.stops}
    />
  );
}

function RadialFill({
  canvas,
  stops,
}: {
  canvas: Size;
  stops: readonly GradientStop[];
}) {
  const { center, radius } = radialGradientGeometry(
    canvas.width,
    canvas.height,
  );
  return (
    <Rect
      width={canvas.width}
      height={canvas.height}
      fillRadialGradientStartPoint={center}
      fillRadialGradientEndPoint={center}
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndRadius={radius}
      fillRadialGradientColorStops={toKonvaColorStops(stops)}
      listening={false}
    />
  );
}

function WallpaperFill({
  canvas,
  id,
  blur,
}: {
  canvas: Size;
  id: string;
  blur: number;
}) {
  const wallpaperId = (getWallpaper(id) ?? DEFAULT_WALLPAPER).id;
  const source = useMemo(() => getWallpaperCanvas(wallpaperId), [wallpaperId]);
  return source ? (
    <ImageFill canvas={canvas} source={source} blur={blur} />
  ) : (
    <DefaultFill canvas={canvas} />
  );
}

/**
 * An image cover-fitted to the canvas. With a blur, a pre-blurred smaller copy
 * is drawn instead, stretched over the same area so it is smoothed on the way up.
 */
function ImageFill({
  canvas,
  source,
  blur,
}: {
  canvas: Size;
  source: Source;
  blur: number;
}) {
  const size = sourceSize(source);
  const usable = size.width > 0 && size.height > 0;
  const scale = usable ? coverScale(size, canvas) : 1;
  // The blur is in canvas px; the copy is blurred in source px.
  const sigma = usable && blur > 0 ? roundBlurSigma(blur / scale) : 0;
  const blurred = useMemo(
    () => (sigma > 0 ? getBlurredImage(source, sigma) : null),
    [source, sigma],
  );
  if (!usable) return <DefaultFill canvas={canvas} />;

  const crop = coverCrop(size, canvas);
  // The blurred copy is smaller than the source: scale the crop to match. Its
  // edges were blurred with the edge pixels repeated, so they stay opaque.
  const fx = blurred ? blurred.width / size.width : 1;
  const fy = blurred ? blurred.height / size.height : 1;
  return (
    <KonvaImage
      image={blurred ?? source}
      width={canvas.width}
      height={canvas.height}
      crop={{
        x: crop.x * fx,
        y: crop.y * fy,
        width: crop.width * fx,
        height: crop.height * fy,
      }}
      listening={false}
    />
  );
}

function FromImageFill({
  canvas,
  angle,
  screenshot,
}: {
  canvas: Size;
  angle: number;
  screenshot: LoadedImage;
}) {
  const stops = useMemo(() => {
    const pixels = sampleImagePixels(screenshot.source);
    return (
      (pixels && fromImageStops(dominantColors(pixels))) ??
      DEFAULT_GRADIENT.stops
    );
  }, [screenshot.source]);
  return <LinearFill canvas={canvas} angle={angle} stops={stops} />;
}
