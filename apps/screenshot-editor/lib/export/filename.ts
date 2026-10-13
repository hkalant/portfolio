// Names browsers and apps give to pasted or unnamed images.
const GENERIC_NAMES = new Set([
  "image",
  "blob",
  "clipboard",
  "pasted-image",
  "untitled",
]);

const pad = (value: number) => String(value).padStart(2, "0");

function timestamp(now: Date): string {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date}-${time}`;
}

/** "My Dashboard.png" at 2x -> "my-dashboard-2x.png"; a pasted "image.png" -> "screenshot-YYYYMMDD-HHmmss-2x.png". */
export function exportFilename(
  sourceName: string | null,
  scale: number,
  now = new Date(),
  extension = "png",
): string {
  const stem = (sourceName ?? "").replace(/\.[^./]*$/, "");
  const cleaned = stem
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // drop accents left over by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const base =
    cleaned && !GENERIC_NAMES.has(cleaned)
      ? cleaned
      : `screenshot-${timestamp(now)}`;
  return `${base}-${scale}x.${extension}`;
}
