import { crc32, deflateSync } from "node:zlib";
import type { Page } from "@playwright/test";

export type Rgba = [number, number, number, number];

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

/** A PNG filled with one colour, built in memory so tests need no image files. */
export function makeSolidPng(
  width: number,
  height: number,
  [r, g, b, a]: Rgba,
): Buffer {
  const row = Buffer.alloc(1 + width * 4); // filter byte 0, then RGBA pixels
  for (let x = 0; x < width; x += 1) row.set([r, g, b, a], 1 + x * 4);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function readPngSize(png: Buffer): { width: number; height: number } {
  if (png.subarray(1, 4).toString("ascii") !== "PNG")
    throw new Error("Not a PNG file");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** Width and height from a JPEG's start-of-frame marker. */
export function readJpegSize(jpeg: Buffer): { width: number; height: number } {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("Not a JPEG file");
  let offset = 2;
  while (offset < jpeg.length) {
    if (jpeg[offset] !== 0xff) throw new Error("Bad JPEG marker");
    const marker = jpeg[offset + 1];
    const length = jpeg.readUInt16BE(offset + 2);
    // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    )
      return {
        height: jpeg.readUInt16BE(offset + 5),
        width: jpeg.readUInt16BE(offset + 7),
      };
    offset += 2 + length;
  }
  throw new Error("No JPEG frame header");
}

export const isWebp = (file: Buffer) =>
  file.subarray(0, 4).toString("ascii") === "RIFF" &&
  file.subarray(8, 12).toString("ascii") === "WEBP";

/** Decodes the image (PNG, JPEG or WebP) in the page and returns the RGBA values at the given pixels. */
export async function samplePixels(
  page: Page,
  png: Buffer,
  points: [number, number][],
): Promise<Rgba[]> {
  return page.evaluate(
    async ({ base64, points }) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes]));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No 2D context");
      context.drawImage(bitmap, 0, 0);
      const result = points.map(([x, y]) =>
        Array.from(context.getImageData(x, y, 1, 1).data),
      );
      canvas.width = 0;
      bitmap.close();
      return result as [number, number, number, number][];
    },
    { base64: png.toString("base64"), points },
  );
}

export const isRed = ([r, g, b]: Rgba) => r > 200 && g < 60 && b < 60;

/** Relative luminance-ish brightness, 0..255. */
export const brightness = ([r, g, b]: Rgba) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

/** A PNG of upright stripes, `stripe` px wide, alternating two colours. */
export function makeStripedPng(
  width: number,
  height: number,
  stripe: number,
  first: Rgba,
  second: Rgba,
): Buffer {
  const solid = makeSolidPng(width, height, first);
  const row = Buffer.alloc(1 + width * 4);
  for (let x = 0; x < width; x += 1)
    row.set(Math.floor(x / stripe) % 2 ? second : first, 1 + x * 4);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  // Same header as the solid PNG, new pixels.
  const header = solid.subarray(8, 8 + 25);
  return Buffer.concat([
    solid.subarray(0, 8),
    header,
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
