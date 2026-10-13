// For unit tests: a 2D context that records what is drawn instead of drawing
// it, and notes calls a browser would reject (bad numbers, colours, radii).

export type FakeContext = {
  context: CanvasRenderingContext2D;
  /** Every method call and property write, in order, numbers rounded. */
  log: string[];
  /** Calls a real canvas would throw on or silently ignore. */
  problems: string[];
};

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\((\d+), (\d+), (\d+), ([\d.e+-]+)\)$/;

export function isCanvasColor(value: string): boolean {
  if (HEX.test(value)) return true;
  const match = RGBA.exec(value);
  if (!match) return false;
  const [r, g, b, a] = match.slice(1).map(Number);
  return [r, g, b].every((c) => c >= 0 && c <= 255) && a >= 0 && a <= 1;
}

const format = (value: unknown) =>
  typeof value === "number"
    ? String(Math.round(value * 1000) / 1000)
    : typeof value === "string"
      ? value
      : typeof value;

const COLOR_PROPS = new Set(["fillStyle", "strokeStyle", "shadowColor"]);

export function createFakeContext({ conic = true } = {}): FakeContext {
  const log: string[] = [];
  const problems: string[] = [];
  const state: Record<string, unknown> = {};

  const gradient = () => ({
    addColorStop(offset: number, color: string) {
      log.push(`addColorStop(${format(offset)}, ${color})`);
      if (!(offset >= 0 && offset <= 1)) problems.push(`stop offset ${offset}`);
      if (!isCanvasColor(color)) problems.push(`stop colour ${color}`);
    },
  });

  const call = (name: string, args: unknown[]) => {
    const text = `${name}(${args.map(format).join(", ")})`;
    log.push(text);
    if (args.some((arg) => typeof arg === "number" && !Number.isFinite(arg)))
      problems.push(text);
    const numbers = args.map(Number);
    if (name === "arc" && numbers[2] < 0) problems.push(text);
    if (name === "createRadialGradient" && (numbers[2] < 0 || numbers[5] < 0))
      problems.push(text);
    if (name.startsWith("create") && name.endsWith("Gradient"))
      return gradient();
    return undefined;
  };

  const context = new Proxy(state, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop in target) return target[prop];
      if (prop === "createConicGradient" && !conic) return undefined;
      return (...args: unknown[]) => call(prop, args);
    },
    set(target, prop, value: unknown) {
      if (typeof prop !== "string") return false;
      target[prop] = value;
      log.push(`${prop} = ${format(value)}`);
      if (typeof value === "number" && !Number.isFinite(value))
        problems.push(`${prop} = ${value}`);
      if (
        COLOR_PROPS.has(prop) &&
        typeof value === "string" &&
        !isCanvasColor(value)
      )
        problems.push(`${prop} = ${value}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return { context, log, problems };
}
