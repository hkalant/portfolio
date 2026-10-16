import { describe, expect, it } from "vitest";
import {
  arrowCurve,
  arrowShape,
  bendToward,
  MAX_ARROW_BEND,
  tracePath,
} from "./arrowShape";
import { ARROW_STYLES, LINE_ENDS } from "./schema";

const tail = { x: 100, y: 300 };
const tip = { x: 500, y: 300 };

/** The points a path passes through, arcs and corners included roughly. */
function pathPoints(shape: NonNullable<ReturnType<typeof arrowShape>>) {
  const points: { x: number; y: number }[] = [];
  for (const command of shape.fill ?? shape.stroke?.path ?? []) {
    if (command.op === "M" || command.op === "L") points.push(command);
    if (command.op === "arcTo") points.push({ x: command.x1, y: command.y1 });
  }
  return points;
}

describe("arrow shapes", () => {
  it("draw every style, straight and bent, without reaching past the tip", () => {
    for (const style of ARROW_STYLES)
      for (const bend of [0, 0.3, -0.3]) {
        const shape = arrowShape(style, tail, tip, bend, 1200);
        expect(shape, `${style} ${bend}`).not.toBeNull();
        // The straight arrow's sharp tip is pushed just past the point for
        // rounding; nothing goes further.
        if (bend === 0)
          for (const p of pathPoints(shape!))
            expect(p.x, style).toBeLessThan(tip.x + 3);
        expect(shape!.spine[0]).toEqual(tail);
      }
  });

  it("draw lines with each end, the start left plain", () => {
    for (const end of LINE_ENDS) {
      const shape = arrowShape(end, tail, tip, 0.2, 1200)!;
      expect(shape.stroke?.cap, end).toBe("butt");
      expect(shape.spine[0]).toEqual(tail);
      expect(shape.spine[shape.spine.length - 1].x).toBeCloseTo(tip.x);
      // Only the dot and round ends are filled; the bar is part of the stroke.
      expect(shape.fill !== null, end).toBe(end === "dot" || end === "round");
    }
    // The dot is wider than the line; the bar reaches across it.
    const width = 0.006 * 1200;
    expect(
      arrowShape("dot", tail, tip, 0, 1200)!.bounds.height,
    ).toBeGreaterThan(3 * width);
    const bar = arrowShape("bar", tail, tip, 0, 1200)!;
    expect(bar.head.map((p) => p.x)).toEqual([tip.x, tip.x]);
    expect(Math.abs(bar.head[0].y - bar.head[1].y)).toBeGreaterThan(4 * width);
  });

  it("are nothing for a zero-length arrow", () => {
    expect(arrowShape("solid", tail, tail, 0, 1200)).toBeNull();
    expect(arrowShape("bold", tail, tip, 0, 0)).toBeNull();
  });

  it("repeat chevrons along the arrow, more on longer ones", () => {
    const count = (to: { x: number; y: number }) =>
      arrowShape("chevrons", tail, to, 0, 1200)!.stroke!.path.filter(
        (command) => command.op === "M",
      ).length;
    expect(count({ x: 140, y: 300 })).toBeGreaterThanOrEqual(1);
    expect(count(tip)).toBeGreaterThan(count({ x: 250, y: 300 }));
  });

  it("start the dotted style with a dot, apart from its line", () => {
    const shape = arrowShape("dotted", tail, tip, 0, 1200)!;
    const dot = shape.fill?.[1];
    expect(dot?.op === "arc" && dot.x - dot.r).toBeCloseTo(tail.x);
    const line = shape.stroke!.path[0];
    expect(line.op === "M" && line.x).toBeGreaterThan(tail.x + 15);
  });

  it("bend only across the middle, evenly", () => {
    // Pulled up by 100 px at the middle: the handle goes straight up from
    // the middle, whatever the pointer's position along the arrow.
    const bend = bendToward(tail, tip, { x: 420, y: 200 });
    expect(bend).toBeCloseTo(0.25);
    expect(arrowCurve(tail, tip, bend).handle).toEqual({ x: 300, y: 200 });
    // Downwards is the other way; too far stops at the limit; nearly
    // straight snaps to straight.
    expect(bendToward(tail, tip, { x: 300, y: 340 })).toBeCloseTo(-0.1);
    expect(bendToward(tail, tip, { x: 300, y: -900 })).toBe(MAX_ARROW_BEND);
    expect(bendToward(tail, tip, { x: 300, y: 304 })).toBe(0);
  });

  it("trace on any canvas-like context", () => {
    const calls: string[] = [];
    const record = (name: string) => () => {
      calls.push(name);
    };
    tracePath(
      {
        beginPath: record("beginPath"),
        moveTo: record("moveTo"),
        lineTo: record("lineTo"),
        arcTo: record("arcTo"),
        arc: record("arc"),
        closePath: record("closePath"),
      },
      arrowShape("refined", tail, tip, 0.2, 1200)!.fill!,
    );
    expect(calls[0]).toBe("beginPath");
    expect(calls).toContain("arcTo");
    expect(calls.at(-1)).toBe("closePath");
  });
});
