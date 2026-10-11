import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES } from "@/lib/design/limits";
import {
  ACCEPT_ATTR,
  IMAGE_MESSAGES,
  isAcceptedImageFile,
  pickImageFile,
  validateImageFile,
} from "./accept";

const file = (name: string, type: string, size = 10) => ({ name, type, size });

describe("isAcceptedImageFile", () => {
  it("accepts PNG, JPEG and WebP by MIME type", () => {
    expect(isAcceptedImageFile(file("a", "image/png"))).toBe(true);
    expect(isAcceptedImageFile(file("a", "image/jpeg"))).toBe(true);
    expect(isAcceptedImageFile(file("a", "image/webp"))).toBe(true);
  });

  it("accepts non-standard aliases", () => {
    expect(isAcceptedImageFile(file("a", "image/jpg"))).toBe(true);
    expect(isAcceptedImageFile(file("a", "image/pjpeg"))).toBe(true);
    expect(isAcceptedImageFile(file("a", "image/x-png"))).toBe(true);
  });

  it("falls back to the extension, whatever the MIME type says", () => {
    expect(isAcceptedImageFile(file("Shot.PNG", ""))).toBe(true);
    expect(
      isAcceptedImageFile(file("photo.webp", "application/octet-stream")),
    ).toBe(true);
    expect(isAcceptedImageFile(file("photo.jpeg", ""))).toBe(true);
  });

  it("rejects other formats", () => {
    expect(isAcceptedImageFile(file("a.gif", "image/gif"))).toBe(false);
    expect(isAcceptedImageFile(file("a.svg", "image/svg+xml"))).toBe(false);
    expect(isAcceptedImageFile(file("a.heic", "image/heic"))).toBe(false);
    expect(isAcceptedImageFile(file("notes.txt", "text/plain"))).toBe(false);
  });

  it("lists MIME types and extensions for the file picker", () => {
    expect(ACCEPT_ATTR).toBe(
      "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp",
    );
  });
});

describe("validateImageFile", () => {
  it("rejects unsupported and oversized files", () => {
    expect(validateImageFile(file("a.gif", "image/gif"))).toEqual({
      ok: false,
      message: IMAGE_MESSAGES.unsupported,
    });
    expect(
      validateImageFile(file("a.png", "image/png", MAX_FILE_BYTES + 1)),
    ).toEqual({
      ok: false,
      message: IMAGE_MESSAGES.tooLarge,
    });
    expect(
      validateImageFile(file("a.png", "image/png", MAX_FILE_BYTES)),
    ).toEqual({ ok: true });
  });

  it("works with real File objects", () => {
    expect(
      validateImageFile(new File(["x"], "shot.png", { type: "image/png" })),
    ).toEqual({ ok: true });
  });
});

describe("pickImageFile", () => {
  it("returns the first accepted file", () => {
    const files = [
      file("a.txt", "text/plain"),
      file("b.png", "image/png"),
      file("c.jpg", "image/jpeg"),
    ];
    expect(pickImageFile(files)?.name).toBe("b.png");
    expect(pickImageFile([file("a.gif", "image/gif")])).toBeNull();
    expect(pickImageFile([])).toBeNull();
  });
});
