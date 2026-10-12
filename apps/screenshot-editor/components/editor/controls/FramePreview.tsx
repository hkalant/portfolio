import type { FrameKind } from "@/lib/design/schema";
import {
  framePalette,
  TRAFFIC_LIGHT_COLORS,
  type FrameTheme,
} from "@/lib/render/frame";
import { cn } from "@/lib/utils";

// Small HTML pictures of each frame for the frame picker. They use the same
// colours as the canvas, which never changes with the interface theme.

const BACKDROP = "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)";
const SCREEN = "#f8fafc";
const SCREEN_LINE = "#cbd5e1";

function Lights({ size = 3 }: { size?: number }) {
  return (
    <span className="flex gap-[2px]">
      {TRAFFIC_LIGHT_COLORS.map((color) => (
        <span
          key={color}
          className="rounded-full"
          style={{ width: size, height: size, backgroundColor: color }}
        />
      ))}
    </span>
  );
}

/** A screenshot stand-in: a light page with two lines of "text". */
function Screen({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-7 flex-col gap-[3px] p-[5px]", className)}
      style={{ backgroundColor: SCREEN }}
    >
      <span
        className="h-[3px] w-3/5 rounded-full"
        style={{ backgroundColor: SCREEN_LINE }}
      />
      <span
        className="h-[3px] w-2/5 rounded-full"
        style={{ backgroundColor: SCREEN_LINE }}
      />
    </div>
  );
}

function Bar({
  kind,
  theme,
}: {
  kind: Exclude<FrameKind, "none" | "glass">;
  theme: FrameTheme;
}) {
  const palette = framePalette(theme);
  const style = {
    backgroundColor: palette.bar,
    borderBottom: `1px solid ${palette.separator}`,
  };
  switch (kind) {
    case "macos":
      return (
        <div className="flex h-[8px] items-center px-[3px]" style={style}>
          <Lights />
        </div>
      );
    case "browser":
      return (
        <div
          className="relative flex h-[11px] items-center px-[3px]"
          style={style}
        >
          <Lights />
          <span
            className="absolute inset-y-[3px] left-1/2 w-2/5 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: palette.pill }}
          />
        </div>
      );
    case "windows":
      return (
        <div
          className="flex h-[8px] items-center justify-end gap-[4px] px-[3px]"
          style={{ ...style, color: palette.text }}
        >
          <span className="h-px w-[4px] bg-current" />
          <span className="size-[4px] border border-current" />
          <span className="relative size-[4px]">
            <span className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-current" />
            <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-current" />
          </span>
        </div>
      );
    case "minimal":
      return (
        <div
          className="flex h-[5px] items-center gap-[2px] px-[3px]"
          style={style}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-[2px] rounded-full"
              style={{ backgroundColor: palette.dot }}
            />
          ))}
        </div>
      );
  }
}

type Props = {
  kind: FrameKind;
  theme: FrameTheme;
  className?: string;
};

export function FramePreview({ kind, theme, className }: Props) {
  const palette = framePalette(theme);
  let picture;
  if (kind === "none") {
    picture = <Screen className="rounded-[3px] shadow-md" />;
  } else if (kind === "glass") {
    picture = (
      <div
        className="rounded-[5px] p-[4px] shadow-sm"
        style={{
          backgroundColor: palette.ringFill,
          boxShadow: `inset 0 0 0 1px ${palette.ringStroke}`,
        }}
      >
        <Screen className="rounded-[2px] shadow-md" />
      </div>
    );
  } else {
    picture = (
      <div
        className="overflow-hidden rounded-[3px] shadow-md"
        style={{ backgroundColor: palette.body }}
      >
        <Bar kind={kind} theme={theme} />
        <Screen />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex aspect-[4/3] w-full items-center justify-center rounded-md",
        className,
      )}
      style={{ backgroundImage: BACKDROP }}
    >
      <div className="w-[72%]">{picture}</div>
    </div>
  );
}
