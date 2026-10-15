import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Circle, Ellipse, Group, Rect, Text, Transformer } from "react-konva";
import { create } from "zustand";
import {
  clampStepSize,
  clampToArea,
  clickBox,
  MAX_STEP_SIZE,
  MIN_STEP_SIZE,
  dragBox,
  fitBox,
  inArea,
  isDrag,
  SHAPE_CORNER,
  SHAPE_STROKE,
  STEP_RADIUS,
  stepTextColor,
  type Box,
  type Point,
} from "@/lib/design/annotations";
import type { Rect as LayoutRect } from "@/lib/design/layout";
import type {
  Annotation,
  ShapeAnnotation,
  ShapeKind,
  StepAnnotation,
} from "@/lib/design/schema";
import { EXPORT_HIDDEN } from "@/lib/export/exportImage";
import { CANVAS_FOCUS_ATTRIBUTE } from "@/lib/hooks/useShortcuts";
import { FRAME_FONT_FAMILY } from "@/lib/render/frame";
import { useEditorStore } from "@/lib/store/editor";
import { useFrameFont } from "./Chrome";

/** Marks annotation nodes, so a press on one picks it up instead of drawing. */
const ANNOTATION_NAME = "annotation";

const SELECTION_COLOR = "#0a84ff";

/** Screen px: a step, or an outline's border, can be pressed this far out. */
const MIN_HIT = 12;

/** Where the selected annotation is on screen, in stage px. Not part of the design. */
export type SelectionFrame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Read by the delete button over the canvas. Null while nothing is selected or it is moving. */
export const useSelectionFrame = create<{ frame: SelectionFrame | null }>()(
  () => ({ frame: null }),
);

function setFrame(frame: SelectionFrame | null) {
  const current = useSelectionFrame.getState().frame;
  const same =
    current === frame ||
    (current &&
      frame &&
      current.id === frame.id &&
      (["x", "y", "width", "height"] as const).every(
        (key) => Math.abs(current[key] - frame[key]) < 0.5,
      ));
  if (!same) useSelectionFrame.setState({ frame });
}

type Props = {
  /** The screenshot, relative to the shot. Annotations are placed from it. */
  image: LayoutRect;
  /** Where annotations can go (the whole canvas), in image widths. */
  area: Box;
  /** On-screen zoom of the stage, for sizes kept in screen pixels. */
  zoom: number;
  /** Whether the shot itself can be dragged (with the select tool). */
  shotDraggable: boolean;
};

function setCursor(node: Konva.Node | null, cursor: string) {
  const container = node?.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

function StepNode({
  step,
  unit,
  zoom,
}: {
  step: StepAnnotation;
  unit: number;
  zoom: number;
}) {
  const radius = STEP_RADIUS * step.size * unit;
  // Small steps (zoomed out, on a phone) are still easy to press.
  const hitRadius = Math.max(radius, MIN_HIT / zoom);
  const digits = String(step.number).length;
  const fontSize = radius * (digits >= 3 ? 0.78 : digits === 2 ? 0.98 : 1.12);
  return (
    <>
      <Circle
        radius={radius}
        fill={step.color}
        shadowColor="#000000"
        shadowOpacity={0.28}
        shadowBlur={radius * 0.8}
        shadowOffsetY={radius * 0.2}
        hitFunc={(context, shape) => {
          context.beginPath();
          context.arc(0, 0, hitRadius, 0, Math.PI * 2, false);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
      <Text
        text={String(step.number)}
        x={-radius}
        y={-radius}
        width={2 * radius}
        height={2 * radius}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        fontFamily={FRAME_FONT_FAMILY}
        fontStyle="700"
        fill={stepTextColor(step.color)}
        listening={false}
      />
    </>
  );
}

const cornerRadius = (
  shape: ShapeKind,
  width: number,
  height: number,
  unit: number,
) =>
  shape === "rounded"
    ? Math.min(SHAPE_CORNER * unit, width / 2, height / 2)
    : 0;

/** A shape drawn from its box's top-left corner. */
function ShapeBody({
  shape,
  width,
  height,
  unit,
  zoom,
  borderOnly = false,
}: {
  shape: Pick<ShapeAnnotation, "shape" | "color" | "filled">;
  width: number;
  height: number;
  unit: number;
  zoom: number;
  /** An outline is pressed only by its border, so steps and shapes can go inside. */
  borderOnly?: boolean;
}) {
  const strokeWidth = SHAPE_STROKE * unit;
  const paint = shape.filled
    ? { fill: shape.color }
    : {
        stroke: shape.color,
        strokeWidth,
        hitStrokeWidth: Math.max(strokeWidth, MIN_HIT / zoom),
        // Transparent, but pressable inside to pick it up.
        fill: "rgba(0, 0, 0, 0)",
        fillEnabled: !borderOnly,
      };
  if (shape.shape === "circle")
    return (
      <Ellipse
        x={width / 2}
        y={height / 2}
        radiusX={width / 2}
        radiusY={height / 2}
        {...paint}
      />
    );
  return (
    <Rect
      width={width}
      height={height}
      cornerRadius={cornerRadius(shape.shape, width, height, unit)}
      {...paint}
    />
  );
}

/** The size of a shape annotation's node, in canvas px. */
function shapeSize(group: Konva.Group) {
  const body = group.getChildren()[0];
  if (body instanceof Konva.Ellipse)
    return { width: 2 * body.radiusX(), height: 2 * body.radiusY() };
  return { width: body?.width() ?? 0, height: body?.height() ?? 0 };
}

/** Puts a shape annotation's node at a box in canvas px, unstretched. */
function placeShape(
  group: Konva.Group,
  box: Box,
  shape: ShapeKind,
  unit: number,
) {
  group.setAttrs({ x: box.x, y: box.y, scaleX: 1, scaleY: 1 });
  const body = group.getChildren()[0];
  const { width, height } = box;
  if (body instanceof Konva.Ellipse)
    body.setAttrs({
      x: width / 2,
      y: height / 2,
      radiusX: width / 2,
      radiusY: height / 2,
    });
  else
    body?.setAttrs({
      width,
      height,
      cornerRadius: cornerRadius(shape, width, height, unit),
    });
}

/** Steps and shapes over the screenshot, and the tools that add and edit them. */
export function AnnotationsNode({ image, area, zoom, shotDraggable }: Props) {
  const annotations = useEditorStore((state) => state.design.annotations);
  const tool = useEditorStore((state) => state.annotationTool);
  const selectedId = useEditorStore((state) => state.selectedAnnotationId);
  const color = useEditorStore((state) => state.annotationColor);
  const filled = useEditorStore((state) => state.shapeFilled);
  const fontReady = useFrameFont();
  const rootRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Group>());
  // While the selection is dragged or resized, its delete button hides.
  const moving = useRef(false);
  const [draft, setDraft] = useState<Box | null>(null);

  // Lengths are in image widths; this turns them into canvas px.
  const unit = image.width;
  const selecting = tool === "select";
  // Any tool can pick up, move and delete an annotation.
  const selected =
    annotations.find((annotation) => annotation.id === selectedId) ?? null;
  // The cursor away from annotations.
  const restCursor = selecting ? (shotDraggable ? "grab" : "") : "crosshair";

  // Pressing the canvas away from every annotation clears the selection, and
  // with a drawing tool adds a step or starts a shape.
  useEffect(() => {
    const root = rootRef.current;
    const stage = root?.getStage();
    if (!root || !stage) return;
    const store = useEditorStore.getState;
    const pointer = (): Point | null => {
      const position = root.getRelativePointerPosition();
      return position ? { x: position.x / unit, y: position.y / unit } : null;
    };
    let start: Point | null = null;
    let end: Point | null = null;

    const finish = () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      if (!start || tool === "select" || tool === "step") return;
      const box =
        end && isDrag(start, end)
          ? dragBox(start, end, tool, area)
          : clickBox(start, tool, area);
      start = end = null;
      setDraft(null);
      store().addShape(tool, box);
    };
    const cancel = () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      start = end = null;
      setDraft(null);
    };

    const onDown = (event: KonvaEventObject<PointerEvent>) => {
      // Konva keeps the focus where it was (often a toolbar button); move it
      // to the canvas so Delete, Escape and the arrow keys act here.
      const canvas = stage
        .container()
        .closest<HTMLElement>(`[${CANVAS_FOCUS_ATTRIBUTE}]`);
      canvas?.focus({ preventScroll: true });
      if (event.evt.button !== undefined && event.evt.button !== 0) return;
      // An annotation selects itself; the selection box resizes.
      const target = event.target;
      if (
        target.findAncestor(`.${ANNOTATION_NAME}`, true) ||
        target.findAncestor("Transformer", true)
      )
        return;
      store().selectAnnotation(null);
      if (tool === "select") return;
      const point = pointer();
      if (!point || !inArea(point, area)) return;
      if (tool === "step") {
        store().addStep(point);
        return;
      }
      start = end = point;
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", cancel);
    };
    const onMove = () => {
      if (!start || tool === "select" || tool === "step") return;
      end = pointer();
      if (end && isDrag(start, end)) setDraft(dragBox(start, end, tool, area));
    };

    stage.on("pointerdown.annotate", onDown);
    stage.on("pointermove.annotate", onMove);
    setCursor(root, tool === "select" ? "" : "crosshair");
    return () => {
      stage.off("pointerdown.annotate");
      stage.off("pointermove.annotate");
      cancel();
      setCursor(root, "");
    };
  }, [tool, unit, area]);

  // The selection box follows the selected annotation's node (a step's
  // node is replaced when the font loads).
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selected ? nodes.current.get(selected.id) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selected, fontReady]);

  // Deselected mid-resize (Escape, Delete, undo): the shape never hears the
  // resize end, so finish the gesture here.
  const selectedKey = selected?.id;
  useEffect(
    () => () => {
      if (!moving.current) return;
      moving.current = false;
      useEditorStore.getState().sealHistory();
    },
    [selectedKey],
  );

  /** Tells the delete button where the selection is now. */
  const showFrame = (id: string | undefined) => {
    const node = id ? nodes.current.get(id) : undefined;
    if (!id || !node || !node.getStage()) {
      setFrame(null);
      return;
    }
    const rect = node.getClientRect({ skipShadow: true });
    setFrame({ id, ...rect });
  };

  // After every render: the selection, the layout or the zoom may have changed.
  useLayoutEffect(() => {
    if (!moving.current) showFrame(selected?.id);
  });
  useEffect(() => () => setFrame(null), []);

  const register = (id: string) => (node: Konva.Group | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };

  const startMoving = () => {
    moving.current = true;
    setFrame(null);
    useEditorStore.getState().beginGesture();
  };
  const stopMoving = (id: string) => {
    moving.current = false;
    useEditorStore.getState().sealHistory();
    showFrame(id);
  };

  const dragProps = (annotation: Annotation) => ({
    draggable: true,
    onPointerDown: (event: KonvaEventObject<PointerEvent>) => {
      if (event.evt.button !== undefined && event.evt.button !== 0) return;
      useEditorStore.getState().selectAnnotation(annotation.id);
    },
    onDragStart: (event: KonvaEventObject<DragEvent>) => {
      // Not the shot's drag too.
      event.cancelBubble = true;
      useEditorStore.getState().selectAnnotation(annotation.id);
      startMoving();
      setCursor(event.target, "grabbing");
    },
    onDragMove: (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      const node = event.target;
      let to: Point;
      if (annotation.kind === "step") {
        to = clampToArea({ x: node.x() / unit, y: node.y() / unit }, area);
      } else {
        const box = fitBox(
          {
            x: node.x() / unit,
            y: node.y() / unit,
            width: annotation.width,
            height: annotation.height,
          },
          area,
          annotation.shape === "circle",
        );
        to = { x: box.x, y: box.y };
      }
      // Kept on the screenshot even when the stored position doesn't change.
      node.position({ x: to.x * unit, y: to.y * unit });
      useEditorStore.getState().moveAnnotation(annotation.id, to);
    },
    onDragEnd: (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      stopMoving(annotation.id);
      setCursor(event.target, "grab");
    },
    onMouseEnter: (event: KonvaEventObject<MouseEvent>) => {
      setCursor(event.target, "grab");
    },
    onMouseLeave: (event: KonvaEventObject<MouseEvent>) => {
      if (!moving.current) setCursor(event.target, restCursor);
    },
  });

  const transformProps = (shape: ShapeAnnotation) => ({
    onTransformStart: startMoving,
    // The stretch goes into the shape's size as it happens, so the border
    // keeps its width.
    onTransform: (event: KonvaEventObject<Event>) => {
      const node = event.currentTarget as Konva.Group;
      const size = shapeSize(node);
      placeShape(
        node,
        {
          x: node.x(),
          y: node.y(),
          width: size.width * node.scaleX(),
          height: size.height * node.scaleY(),
        },
        shape.shape,
        unit,
      );
    },
    onTransformEnd: (event: KonvaEventObject<Event>) => {
      const node = event.currentTarget as Konva.Group;
      const size = shapeSize(node);
      const box = fitBox(
        {
          x: node.x() / unit,
          y: node.y() / unit,
          width: (size.width * node.scaleX()) / unit,
          height: (size.height * node.scaleY()) / unit,
        },
        area,
        shape.shape === "circle",
      );
      // Set here too: if the box ends where it began, nothing re-renders it.
      placeShape(
        node,
        {
          x: box.x * unit,
          y: box.y * unit,
          width: box.width * unit,
          height: box.height * unit,
        },
        shape.shape,
        unit,
      );
      transformerRef.current?.forceUpdate();
      useEditorStore.getState().resizeShape(shape.id, box);
      stopMoving(shape.id);
    },
  });

  // A step is resized from a corner and stays round; the stretch becomes its
  // size when the resize ends.
  const stepTransformProps = (step: StepAnnotation) => ({
    onTransformStart: startMoving,
    onTransformEnd: (event: KonvaEventObject<Event>) => {
      const node = event.currentTarget as Konva.Group;
      const size = clampStepSize(step.size * node.scaleX());
      const centre = clampToArea(
        { x: node.x() / unit, y: node.y() / unit },
        area,
      );
      // Set here too: if nothing changes, nothing re-renders it.
      node.setAttrs({
        x: centre.x * unit,
        y: centre.y * unit,
        scaleX: 1,
        scaleY: 1,
      });
      transformerRef.current?.forceUpdate();
      useEditorStore.getState().resizeStep(step.id, centre, size);
      stopMoving(step.id);
    },
  });

  const selectedShape = selected?.kind === "shape" ? selected : null;
  // Steps and circles keep their proportions, from the corners.
  const roundSelection =
    selected?.kind === "step" || selectedShape?.shape === "circle";

  return (
    <Group ref={rootRef} x={image.x} y={image.y}>
      {annotations.map((annotation) =>
        annotation.kind === "step" ? (
          <Group
            key={`${annotation.id}-${fontReady ? "font" : "fallback"}`}
            ref={register(annotation.id)}
            name={ANNOTATION_NAME}
            x={annotation.x * unit}
            y={annotation.y * unit}
            {...stepTransformProps(annotation)}
            {...dragProps(annotation)}
          >
            <StepNode step={annotation} unit={unit} zoom={zoom} />
          </Group>
        ) : (
          <Group
            key={annotation.id}
            ref={register(annotation.id)}
            name={ANNOTATION_NAME}
            x={annotation.x * unit}
            y={annotation.y * unit}
            {...transformProps(annotation)}
            {...dragProps(annotation)}
          >
            <ShapeBody
              shape={annotation}
              width={annotation.width * unit}
              height={annotation.height * unit}
              unit={unit}
              zoom={zoom}
              borderOnly={!selecting}
            />
          </Group>
        ),
      )}
      {draft && (
        <Group
          name={EXPORT_HIDDEN}
          x={draft.x * unit}
          y={draft.y * unit}
          opacity={0.75}
          listening={false}
        >
          <ShapeBody
            shape={{
              shape: tool === "select" || tool === "step" ? "rect" : tool,
              color,
              filled,
            }}
            width={draft.width * unit}
            height={draft.height * unit}
            unit={unit}
            zoom={zoom}
          />
        </Group>
      )}
      {selected && (
        <Transformer
          ref={transformerRef}
          name={EXPORT_HIDDEN}
          rotateEnabled={false}
          keepRatio={roundSelection}
          enabledAnchors={
            roundSelection
              ? ["top-left", "top-right", "bottom-left", "bottom-right"]
              : undefined
          }
          flipEnabled={false}
          ignoreStroke
          borderStroke={SELECTION_COLOR}
          anchorStroke={SELECTION_COLOR}
          anchorSize={9}
          anchorCornerRadius={5}
          padding={selected.kind === "step" ? 3 : 0}
          // Not smaller than a few screen pixels.
          boundBoxFunc={(previous, next) => {
            if (Math.abs(next.width) < 6 || Math.abs(next.height) < 6)
              return previous;
            if (selected.kind !== "step") return next;
            // A step stays between its smallest and largest size. The box is
            // in screen px, with the selection's padding on each side.
            const standard = 2 * STEP_RADIUS * unit * zoom;
            const size = (Math.abs(next.width) - 6) / standard;
            return size < MIN_STEP_SIZE || size > MAX_STEP_SIZE
              ? previous
              : next;
          }}
        />
      )}
    </Group>
  );
}
