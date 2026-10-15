import { useEffect, useState } from "react";
import { Circle, Group, Line, Rect, Text } from "react-konva";
import type { Rect as Box } from "@/lib/design/layout";
import type { FrameSpec } from "@/lib/design/schema";
import {
  ADDRESS_FONT_SIZE,
  addressContents,
  chromeLayout,
  FRAME_FONT_FAMILY,
  FRAME_FONT_PROBE,
  FRAME_FONT_WEIGHT,
  framePalette,
  type TextBox,
} from "@/lib/render/frame";

function fontLoaded(): boolean {
  try {
    return document.fonts?.check(FRAME_FONT_PROBE) ?? true;
  } catch {
    return true;
  }
}

/**
 * True once the frame font is loaded. Konva measures text when a node is
 * created, so text drawn before the font arrives must be created again.
 */
export function useFrameFont(): boolean {
  const [ready, setReady] = useState(fontLoaded);
  useEffect(() => {
    if (ready) return;
    let active = true;
    // A font that fails to load still ends the wait: the fallback is drawn.
    const done = () => {
      if (active) setReady(true);
    };
    document.fonts.load(FRAME_FONT_PROBE).then(done, done);
    return () => {
      active = false;
    };
  }, [ready]);
  return ready;
}

let measureContext: CanvasRenderingContext2D | null | undefined;

/** Width of `text` in the frame font, as Konva will draw it. */
function measureText(text: string, fontSize: number): number {
  if (measureContext === undefined)
    measureContext = document.createElement("canvas").getContext("2d");
  if (!measureContext || !text) return 0;
  measureContext.font = `${FRAME_FONT_WEIGHT} ${fontSize}px ${FRAME_FONT_FAMILY}`;
  return measureContext.measureText(text).width;
}

function FrameText({
  box,
  text,
  color,
}: {
  box: TextBox;
  text: string;
  color: string;
}) {
  return (
    <Text
      text={text}
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      align={box.align}
      verticalAlign="middle"
      fontSize={box.fontSize}
      fontFamily={FRAME_FONT_FAMILY}
      fontStyle={FRAME_FONT_WEIGHT}
      fill={color}
      // One line, cut off with "…" when it doesn't fit.
      wrap="none"
      ellipsis
      listening={false}
    />
  );
}

type Props = {
  frame: FrameSpec;
  /** The title bar, relative to the shot. */
  rect: Box;
  /** layout.shot.unit: the size of one detail unit in canvas px. */
  unit: number;
  /** The window's outer corner radius, which the controls keep clear of. */
  cornerRadius: number;
};

/** The title or address bar of a window frame. */
export function ChromeNode({ frame, rect, unit, cornerRadius }: Props) {
  const fontReady = useFrameFont();
  const parts = chromeLayout(frame.kind, rect, unit, frame.theme, cornerRadius);
  if (!parts) return null;
  const palette = framePalette(frame.theme);
  const { address, captions, title } = parts;
  const contents =
    address && frame.url
      ? addressContents(
          address,
          measureText(frame.url, ADDRESS_FONT_SIZE * unit),
          unit,
          frame.kind === "windows-browser" ? "left" : "center",
        )
      : null;

  return (
    <Group x={rect.x} y={rect.y} listening={false}>
      <Rect
        width={rect.width}
        height={rect.height}
        fill={palette.bar}
        listening={false}
      />
      {parts.dots.map((dot, i) => (
        <Circle
          key={i}
          x={dot.x}
          y={dot.y}
          radius={dot.radius}
          fill={dot.color}
          listening={false}
        />
      ))}
      {address && <Rect {...address} fill={palette.pill} listening={false} />}
      {contents && (
        <>
          <Rect
            {...contents.lock.shackle}
            stroke={palette.pillText}
            listening={false}
          />
          <Rect
            {...contents.lock.body}
            fill={palette.pillText}
            listening={false}
          />
        </>
      )}
      {captions && (
        <>
          <Line
            points={captions.minimise}
            stroke={palette.text}
            strokeWidth={captions.strokeWidth}
            listening={false}
          />
          <Rect
            {...captions.maximise}
            stroke={palette.text}
            strokeWidth={captions.strokeWidth}
            listening={false}
          />
          {captions.close.map((points, i) => (
            <Line
              key={i}
              points={points}
              stroke={palette.text}
              strokeWidth={captions.strokeWidth}
              lineCap="round"
              listening={false}
            />
          ))}
        </>
      )}
      {/* Remounted once the font is ready, so Konva measures the real glyphs. */}
      <Group key={fontReady ? "font" : "fallback"} listening={false}>
        {title && frame.title && (
          <FrameText
            box={title}
            text={frame.title}
            color={frame.kind === "windows" ? palette.text : palette.title}
          />
        )}
        {contents && (
          <FrameText
            box={contents.text}
            text={frame.url}
            color={palette.pillText}
          />
        )}
      </Group>
      <Rect {...parts.separator} fill={palette.separator} listening={false} />
    </Group>
  );
}
