import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import { Circle, Ellipse, Group, Rect, Text, Transformer } from "react-konva";
import {
  clickBox,
  dragBox,
  fitBoxToImage,
  imageAspect,
  isDrag,
  onImage,
  clampToImage,
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
  StepAnnotation,
} from "@/lib/design/schema";
import { EXPORT_HIDDEN } from "@/lib/export/exportImage";
import { CANVAS_FOCUS_ATTRIBUTE } from "@/lib/hooks/useShortcuts";
import { FRAME_FONT_FAMILY } from "@/lib/render/frame";
import { useEditorStore } from "@/lib/store/editor";
import { useFrameFont } from "./Chrome";

/** Marks annotation nodes, so a press on one doesn't clear the selection. */
const ANNOTATION_NAME = "annotation";

const SELECTION_COLOR = "#0a84ff";

type Props = {
  /** The screenshot, relative to the shot. Annotations are drawn over it. */
  image: LayoutRect;
};

function setCursor(node: Konva.Node | null, cursor: string) {
  const container = node?.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

function StepNode({ step, unit }: { step: StepAnnotation; unit: number }) {
  const radius = STEP_RADIUS * unit;
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

/** A shape drawn from its box's top-left corner. */
function ShapeBody({
  shape,
  width,
  height,
  unit,
}: {
  shape: Pick<ShapeAnnotation, "shape" | "color" | "filled">;
  width: number;
  height: number;
  unit: number;
}) {
  const paint = shape.filled
    ? { fill: shape.color }
    : {
        stroke: shape.color,
        strokeWidth: SHAPE_STROKE * unit,
        // Transparent but still pressable inside, to select and move it.
        fill: "rgba(0, 0, 0, 0)",
      };
  // A resize stretches the node until it ends; the border keeps its width.
  if (shape.shape === "circle")
    return (
      <Ellipse
        x={width / 2}
        y={height / 2}
        radiusX={width / 2}
        radiusY={height / 2}
        strokeScaleEnabled={false}
        {...paint}
      />
    );
  return (
    <Rect
      width={width}
      height={height}
      cornerRadius={
        shape.shape === "rounded"
          ? Math.min(SHAPE_CORNER * unit, width / 2, height / 2)
          : 0
      }
      strokeScaleEnabled={false}
      {...paint}
    />
  );
}

/** Steps and shapes over the screenshot, and the tools that add and edit them. */
export function AnnotationsNode({ image }: Props) {
  const annotations = useEditorStore((state) => state.design.annotations);
  const tool = useEditorStore((state) => state.annotationTool);
  const selectedId = useEditorStore((state) => state.selectedAnnotationId);
  const color = useEditorStore((state) => state.annotationColor);
  const filled = useEditorStore((state) => state.shapeFilled);
  const fontReady = useFrameFont();
  const rootRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Group>());
  const [draft, setDraft] = useState<Box | null>(null);

  // Lengths are in image widths; this turns them into canvas px.
  const unit = image.width;
  const aspect = imageAspect(image);
  const selecting = tool === "select";
  const selected = selecting
    ? (annotations.find((annotation) => annotation.id === selectedId) ?? null)
    : null;

  // Pressing the canvas adds a step or starts a shape; in select mode, a
  // press away from every annotation clears the selection.
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
          ? dragBox(start, end, tool, aspect)
          : clickBox(start, tool, aspect);
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
      const target = event.target;
      if (tool === "select") {
        const onAnnotation =
          target.findAncestor(`.${ANNOTATION_NAME}`, true) ||
          target.findAncestor("Transformer", true);
        if (!onAnnotation) store().selectAnnotation(null);
        return;
      }
      const point = pointer();
      if (!point || !onImage(point, aspect)) return;
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
      if (end && isDrag(start, end))
        setDraft(dragBox(start, end, tool, aspect));
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
  }, [tool, unit, aspect]);

  // The selection box follows the selected annotation's node.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selected ? nodes.current.get(selected.id) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selected]);

  const register = (id: string) => (node: Konva.Group | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };

  const dragProps = (annotation: Annotation) => ({
    draggable: selecting,
    onPointerDown: () => {
      if (selecting) useEditorStore.getState().selectAnnotation(annotation.id);
    },
    onDragStart: (event: KonvaEventObject<DragEvent>) => {
      // Not the shot's drag too.
      event.cancelBubble = true;
      const store = useEditorStore.getState();
      store.selectAnnotation(annotation.id);
      store.beginGesture();
      setCursor(event.target, "grabbing");
    },
    onDragMove: (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      const node = event.target;
      let to: Point;
      if (annotation.kind === "step") {
        to = clampToImage({ x: node.x() / unit, y: node.y() / unit }, aspect);
      } else {
        const box = fitBoxToImage(
          {
            x: node.x() / unit,
            y: node.y() / unit,
            width: annotation.width,
            height: annotation.height,
          },
          aspect,
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
      useEditorStore.getState().sealHistory();
      setCursor(event.target, "grab");
    },
    onMouseEnter: (event: KonvaEventObject<MouseEvent>) => {
      if (selecting) setCursor(event.target, "grab");
    },
    onMouseLeave: (event: KonvaEventObject<MouseEvent>) => {
      if (selecting) setCursor(event.target, "");
    },
  });

  const onTransformEnd = (shape: ShapeAnnotation) => () => {
    const node = nodes.current.get(shape.id);
    if (!node) return;
    const box = fitBoxToImage(
      {
        x: node.x() / unit,
        y: node.y() / unit,
        width: shape.width * node.scaleX(),
        height: shape.height * node.scaleY(),
      },
      aspect,
      shape.shape === "circle",
    );
    node.scale({ x: 1, y: 1 });
    const store = useEditorStore.getState();
    store.resizeShape(shape.id, box);
    store.sealHistory();
  };

  const selectedShape = selected?.kind === "shape" ? selected : null;

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
            {...dragProps(annotation)}
          >
            <StepNode step={annotation} unit={unit} />
          </Group>
        ) : (
          <Group
            key={annotation.id}
            ref={register(annotation.id)}
            name={ANNOTATION_NAME}
            x={annotation.x * unit}
            y={annotation.y * unit}
            onTransformStart={() => useEditorStore.getState().beginGesture()}
            onTransformEnd={onTransformEnd(annotation)}
            {...dragProps(annotation)}
          >
            <ShapeBody
              shape={annotation}
              width={annotation.width * unit}
              height={annotation.height * unit}
              unit={unit}
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
          />
        </Group>
      )}
      {selected && (
        <Transformer
          ref={transformerRef}
          name={EXPORT_HIDDEN}
          rotateEnabled={false}
          resizeEnabled={!!selectedShape}
          keepRatio={selectedShape?.shape === "circle"}
          enabledAnchors={
            selectedShape?.shape === "circle"
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
          boundBoxFunc={(previous, next) =>
            Math.abs(next.width) < 6 || Math.abs(next.height) < 6
              ? previous
              : next
          }
        />
      )}
    </Group>
  );
}
