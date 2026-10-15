"use client";

import {
  Circle,
  Highlighter,
  MousePointer2,
  MoveUpRight,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  ANNOTATION_COLOR_NAMES,
  ANNOTATION_COLORS,
  MAX_STEP_NUMBER,
  parseStepNumber,
} from "@/lib/design/annotations";
import { LINE_ENDS, type StepAnnotation } from "@/lib/design/schema";
import {
  selectSelectedAnnotation,
  useEditorStore,
  type AnnotationTool,
} from "@/lib/store/editor";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

const buttonClass =
  "flex size-8 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-selected aria-pressed:text-selected-foreground [&_svg]:size-4";

function ToolButton({
  label,
  hint,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  /** More in the tooltip than the name. */
  hint?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={hint ? `${label} (${hint})` : label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={buttonClass}
    >
      {children}
    </button>
  );
}

const Divider = () => (
  <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
);

/** A circle with the number the next step gets. */
function StepIcon({ number }: { number: number }) {
  const text = number > 99 ? "99+" : String(number);
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7.25" fill="currentColor" />
      <text
        x="8"
        y="8"
        dy="0.36em"
        textAnchor="middle"
        fontSize={text.length > 1 ? 7 : 9}
        fontWeight="700"
        className="fill-background group-aria-pressed:fill-selected"
      >
        {text}
      </text>
    </svg>
  );
}

/** A rectangle with square corners (lucide's square is rounded). */
function SquareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" />
    </svg>
  );
}

function RoundedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="4.5" />
    </svg>
  );
}

function FillIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/** The selected step's number: digits only. */
function StepNumberField({ step }: { step: StepAnnotation }) {
  const setStepNumber = useEditorStore((state) => state.setStepNumber);
  const sealHistory = useEditorStore((state) => state.sealHistory);
  // What is being typed; otherwise the field shows the step's number.
  const [draft, setDraft] = useState<string | null>(null);
  const [draftFor, setDraftFor] = useState(step.id);
  if (draftFor !== step.id) {
    setDraftFor(step.id);
    setDraft(null);
  }

  return (
    <label className="flex shrink-0 items-center gap-1.5 pl-1 text-xs text-muted-foreground">
      Step
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={String(MAX_STEP_NUMBER).length}
        aria-label="Step number"
        value={draft ?? String(step.number)}
        onChange={(event) => {
          // Numbers only: anything else typed or pasted is dropped.
          const digits = event.target.value.replace(/\D/g, "");
          setDraft(digits);
          const number = parseStepNumber(digits);
          if (number !== null) setStepNumber(step.id, number);
        }}
        onBlur={() => {
          setDraft(null);
          sealHistory();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="h-7 w-11 rounded-full border border-input bg-background/70 px-2 text-center text-sm text-foreground tabular-nums outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </label>
  );
}

const STRAIGHT_HINT = "hold Shift for 45° steps";

const SHAPE_TOOLS: readonly {
  tool: AnnotationTool;
  label: string;
  icon: ReactNode;
  hint?: string;
}[] = [
  { tool: "rect", label: "Rectangle", icon: <SquareIcon /> },
  { tool: "rounded", label: "Rounded rectangle", icon: <RoundedIcon /> },
  { tool: "circle", label: "Circle", icon: <Circle aria-hidden /> },
  {
    tool: "highlight",
    label: "Highlight",
    icon: <Highlighter aria-hidden />,
  },
  {
    tool: "arrow",
    label: "Arrow",
    icon: <MoveUpRight aria-hidden />,
    hint: STRAIGHT_HINT,
  },
];

/** Soft dots fading out: a blur. */
function BlurIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {[4, 9.33, 14.67, 20].flatMap((cx, i) =>
        [4, 9.33, 14.67, 20].map((cy, j) => (
          <circle
            key={`${i}-${j}`}
            cx={cx}
            cy={cy}
            r={2 - Math.abs(i + j - 3) * 0.45}
            opacity={1 - Math.abs(i + j - 3) * 0.22}
          />
        )),
      )}
    </svg>
  );
}

/** How strongly the selected blur box blurs, and new ones after it. */
function BlurStrength() {
  const selected = useEditorStore(selectSelectedAnnotation);
  const intensity = useEditorStore((state) => state.blurIntensity);
  const setBlurIntensity = useEditorStore((state) => state.setBlurIntensity);
  const sealHistory = useEditorStore((state) => state.sealHistory);
  const blur =
    selected?.kind === "shape" && selected.shape === "blur" ? selected : null;
  const value = blur?.intensity ?? intensity;
  return (
    <div className="flex shrink-0 items-center gap-2 px-2 text-xs text-muted-foreground">
      <span aria-hidden>Blur</span>
      <Slider
        className="w-28"
        thumbLabel="Blur strength"
        min={0}
        max={100}
        step={1}
        value={[Math.round(value * 100)]}
        onValueChange={([next]) =>
          setBlurIntensity(blur?.id ?? null, next / 100)
        }
        onValueCommit={() => sealHistory()}
      />
    </div>
  );
}

/** The line tool; its button shows the end new lines get. */
function LineTool() {
  const tool = useEditorStore((state) => state.annotationTool);
  const lineEnd = useEditorStore((state) => state.lineEnd);
  const setTool = useEditorStore((state) => state.setAnnotationTool);
  return (
    <ToolButton
      label="Line"
      hint={STRAIGHT_HINT}
      pressed={tool === "line"}
      onClick={() => setTool(tool === "line" ? "select" : "line")}
    >
      <LineIcon end={lineEnd} />
    </ToolButton>
  );
}

/** A line with the chosen end, for the line tool's button. */
function LineIcon({ end }: { end: (typeof LINE_ENDS)[number] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <line
        x1="4"
        y1="20"
        x2={end === "flat" ? 19 : 18}
        y2={end === "flat" ? 5 : 6}
      />
      {end === "dot" && (
        <circle cx="18" cy="6" r="2.75" fill="currentColor" stroke="none" />
      )}
      {end === "round" && (
        <circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" />
      )}
      {end === "bar" && <line x1="14.5" y1="2.5" x2="21.5" y2="9.5" />}
    </svg>
  );
}

/** Tools for drawing steps, shapes and arrows on the screenshot. */
export function AnnotationToolbar() {
  const tool = useEditorStore((state) => state.annotationTool);
  const color = useEditorStore((state) => state.annotationColor);
  const filled = useEditorStore((state) => state.shapeFilled);
  const nextStep = useEditorStore((state) => state.design.nextStep);
  const selected = useEditorStore(selectSelectedAnnotation);
  const setTool = useEditorStore((state) => state.setAnnotationTool);
  const setColor = useEditorStore((state) => state.setAnnotationColor);
  const setFilled = useEditorStore((state) => state.setShapeFilled);
  const resetStepCount = useEditorStore((state) => state.resetStepCount);
  const removeAnnotation = useEditorStore((state) => state.removeAnnotation);

  // Clicking the active tool again goes back to selecting.
  const toggleTool = (next: AnnotationTool) =>
    setTool(tool === next ? "select" : next);
  const shapeTool = tool === "rect" || tool === "rounded" || tool === "circle";
  // Blur boxes have a strength instead of a colour or a fill.
  const blurMode =
    tool === "blur" ||
    (selected?.kind === "shape" && selected.shape === "blur");
  // Highlights are always a border and a light fill.
  const showFill =
    !blurMode &&
    (shapeTool ||
      (selected?.kind === "shape" && selected.shape !== "highlight"));

  return (
    <div
      role="toolbar"
      aria-label="Annotate"
      className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full glass p-1"
    >
      <ToolButton
        label="Select and move"
        pressed={tool === "select"}
        onClick={() => setTool("select")}
      >
        <MousePointer2 aria-hidden />
      </ToolButton>
      <Divider />
      <button
        type="button"
        aria-label={`Add step ${nextStep}`}
        title={`Add step ${nextStep}`}
        aria-pressed={tool === "step"}
        onClick={() => toggleTool("step")}
        className={cn(buttonClass, "group")}
      >
        <StepIcon number={nextStep} />
      </button>
      <ToolButton
        label="Reset step count"
        disabled={nextStep === 1}
        onClick={resetStepCount}
      >
        <RotateCcw aria-hidden />
      </ToolButton>
      <Divider />
      {SHAPE_TOOLS.map((shape) => (
        <ToolButton
          key={shape.tool}
          label={shape.label}
          hint={shape.hint}
          pressed={tool === shape.tool}
          onClick={() => toggleTool(shape.tool)}
        >
          {shape.icon}
        </ToolButton>
      ))}
      <LineTool />
      <ToolButton
        label="Blur"
        pressed={tool === "blur"}
        onClick={() => toggleTool("blur")}
      >
        <BlurIcon />
      </ToolButton>
      {showFill && (
        <>
          <Divider />
          <ToolButton
            label="Filled shape"
            pressed={filled}
            onClick={() => setFilled(true)}
          >
            <FillIcon filled />
          </ToolButton>
          <ToolButton
            label="Outline shape"
            pressed={!filled}
            onClick={() => setFilled(false)}
          >
            <FillIcon filled={false} />
          </ToolButton>
        </>
      )}
      {blurMode ? (
        <>
          <Divider />
          <BlurStrength />
        </>
      ) : (
        <>
          <Divider />
          <div
            role="radiogroup"
            aria-label="Annotation colour"
            className="flex items-center gap-1 px-1"
          >
            {ANNOTATION_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={ANNOTATION_COLOR_NAMES[swatch]}
                title={ANNOTATION_COLOR_NAMES[swatch]}
                onClick={() => setColor(swatch)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    "size-5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-shadow dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]",
                    color === swatch &&
                      "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: swatch }}
                />
              </button>
            ))}
          </div>
        </>
      )}
      {selected && (
        <>
          <Divider />
          {selected.kind === "step" && <StepNumberField step={selected} />}
          <ToolButton
            label="Delete annotation"
            onClick={() => removeAnnotation(selected.id)}
          >
            <Trash2 aria-hidden />
          </ToolButton>
        </>
      )}
    </div>
  );
}
