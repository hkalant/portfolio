"use client";

import {
  Circle,
  MousePointer2,
  MoveUpRight,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import {
  ANNOTATION_COLOR_NAMES,
  ANNOTATION_COLORS,
  MAX_STEP_NUMBER,
  parseStepNumber,
} from "@/lib/design/annotations";
import { isLineEnd, LINE_ENDS, type StepAnnotation } from "@/lib/design/schema";
import {
  selectSelectedAnnotation,
  useEditorStore,
  type AnnotationTool,
} from "@/lib/store/editor";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { StylePreview, styleLabel } from "./ArrowStyleMenu";

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
    tool: "arrow",
    label: "Arrow",
    icon: <MoveUpRight aria-hidden />,
    hint: STRAIGHT_HINT,
  },
];

/**
 * The line tool. Choosing it opens a little menu of line ends; pressing it
 * again while it's chosen opens the menu again.
 */
function LineTool() {
  const tool = useEditorStore((state) => state.annotationTool);
  const lineEnd = useEditorStore((state) => state.lineEnd);
  const color = useEditorStore((state) => state.annotationColor);
  const selected = useEditorStore(selectSelectedAnnotation);
  const setTool = useEditorStore((state) => state.setAnnotationTool);
  const setArrowStyle = useEditorStore((state) => state.setArrowStyle);
  const [open, setOpen] = useState(false);
  const active = tool === "line";
  // A selected line shows its own end, and picking one changes it.
  const selectedLine =
    selected?.kind === "arrow" && isLineEnd(selected.style) ? selected : null;
  const current = selectedLine?.style ?? lineEnd;
  const button = useRef<HTMLButtonElement>(null);

  return (
    <Popover open={open && active} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          ref={button}
          type="button"
          aria-label="Line"
          title={`Line (${STRAIGHT_HINT})`}
          aria-pressed={active}
          aria-haspopup="dialog"
          aria-expanded={open && active}
          onClick={() => {
            if (!active) setTool("line");
            setOpen(!(open && active));
          }}
          className={buttonClass}
        >
          <LineIcon end={lineEnd} />
        </button>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        sideOffset={8}
        aria-label="Line end"
        className="w-auto p-1"
        // The tool button toggles the menu itself.
        onInteractOutside={(event) => {
          if (button.current?.contains(event.target as Node))
            event.preventDefault();
        }}
      >
        <div
          role="radiogroup"
          aria-label="Line end"
          className="flex flex-col gap-0.5"
        >
          {LINE_ENDS.map((end) => (
            <button
              key={end}
              type="button"
              role="radio"
              aria-checked={current === end}
              aria-label={styleLabel(end)}
              title={styleLabel(end)}
              onClick={() => {
                setArrowStyle(selectedLine?.id ?? null, end);
                setOpen(false);
              }}
              className="flex h-9 w-12 items-center justify-center rounded-lg transition-colors outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-ring aria-checked:bg-accent aria-checked:ring-2 aria-checked:ring-foreground/25 aria-checked:ring-inset"
            >
              <StylePreview style={end} color={color} size={28} flat />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
  const showFill = shapeTool || selected?.kind === "shape";

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
