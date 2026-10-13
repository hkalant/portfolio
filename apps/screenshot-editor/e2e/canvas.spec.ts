import type { Page } from "@playwright/test";
import {
  chooseCanvasSize,
  chooseFrame,
  expectDesignSize,
  expectEmptyState,
  exportButton,
  exportImage,
  openTab,
  RED,
  stage,
  upload,
} from "./helpers/editor";
import { expect, test } from "./helpers/fixtures";
import {
  isRed,
  isWebp,
  makeSolidPng,
  readJpegSize,
  readPngSize,
  samplePixels,
} from "./helpers/png";

test.beforeEach(async ({ page }) => {
  await page.goto("./editor/");
  await expectEmptyState(page);
});

/** The autosaved design, read straight from IndexedDB. */
function savedDesign(page: Page) {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open("screenshot-editor");
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("autosave")) return resolve(null);
          const request = db
            .transaction("autosave")
            .objectStore("autosave")
            .get("design");
          request.onsuccess = () => resolve(request.result?.design ?? null);
          request.onerror = () => resolve(null);
        };
      }),
  );
}

/** Width and height of any image the page can decode. */
function imageSize(page: Page, file: Buffer) {
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes]));
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }, file.toString("base64"));
}

test("canvas size presets and custom sizes", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await chooseCanvasSize(page, /^Open Graph image/);
  await expectDesignSize(page, 1200, 630);
  await expect(
    page.getByRole("button", { name: /^Canvas size: Open Graph image/ }),
  ).toBeVisible();
  const og = await exportImage(page);
  expect(readPngSize(og.data)).toEqual({ width: 2400, height: 1260 });

  // Custom starts from the current size.
  await page.getByRole("button", { name: /^Canvas size/ }).click();
  await page.getByRole("radio", { name: "Custom" }).click();
  const width = page.getByRole("spinbutton", { name: "Width" });
  await expect(width).toHaveValue("1200");
  await width.fill("1000");
  await width.press("Enter");
  await expectDesignSize(page, 1000, 630);

  const lock = page.getByRole("button", { name: "Lock aspect ratio" });
  await lock.click();
  await width.fill("2000");
  await width.press("Enter");
  await expectDesignSize(page, 2000, 1260);

  // The lock survives closing the menu, and keeps the ratio at the limits.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Canvas size/ }).click();
  await expect(lock).toHaveAttribute("aria-pressed", "true");
  await width.fill("100");
  await width.press("Enter");
  await expectDesignSize(page, 159, 100);
  // Growing back keeps the locked ratio, not the rounded 159 × 100 one.
  await width.fill("1000");
  await width.press("Enter");
  await expectDesignSize(page, 1000, 630);

  await page.getByRole("radio", { name: /^Auto/ }).click();
  await expectDesignSize(page, 1344, 894);
});

test("the export button keeps focus while it exports", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  const button = exportButton(page);
  await expect(button).toBeEnabled();
  await button.focus();
  await expect(button).toBeFocused();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ]);
  await download.path();
  await expect(button).not.toHaveAttribute("aria-disabled");
  await expect(button).toBeFocused();
});

test("a short workspace hides the size readout and fits the canvas", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await expect(page.getByTestId("size-readout")).not.toHaveClass(/sr-only/);
  await page.setViewportSize({ width: 1280, height: 200 });
  await expect(page.getByTestId("size-readout")).toHaveClass(/sr-only/);
  const box = await stage(page).boundingBox();
  const main = await page.locator("main").boundingBox();
  expect(box && main).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(main!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(main!.y + main!.height);
});

// A 1200 x 750 shot in a macOS frame, plus 72px of padding on each side.
const FRAMED_W = 1344;
const FRAMED_H = 935;

test("undo and redo with the buttons and the keyboard", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });
  await expect(redo).toBeDisabled();

  await chooseFrame(page, "macOS");
  await expectDesignSize(page, FRAMED_W, FRAMED_H);
  await undo.click();
  await expectDesignSize(page, 1344, 894);
  await redo.click();
  await expectDesignSize(page, FRAMED_W, FRAMED_H);

  await page.keyboard.press("ControlOrMeta+z");
  await expectDesignSize(page, 1344, 894);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expectDesignSize(page, FRAMED_W, FRAMED_H);

  // Undoing the upload goes back to the empty state; redo brings it back.
  await undo.click();
  await undo.click();
  await expectEmptyState(page);
  await expect(undo).toBeDisabled();
  await redo.click();
  await expectDesignSize(page, 1344, 894);
});

test("Delete removes the screenshot and undo brings it back", async ({
  page,
}) => {
  await upload(page, makeSolidPng(400, 300, RED));
  await expect(stage(page)).toBeVisible();
  // From the page itself nothing happens: only the focused canvas deletes.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Backspace");
  await expect(stage(page)).toBeVisible();
  await stage(page).click();
  await expect(page.locator("[data-design-canvas]")).toBeFocused();
  await page.keyboard.press("Delete");
  await expectEmptyState(page);
  await page.keyboard.press("ControlOrMeta+z");
  await expectDesignSize(page, 544, 444);
});

test("the design is restored after a reload", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await chooseFrame(page, "macOS");
  await expectDesignSize(page, FRAMED_W, FRAMED_H);
  await expect
    .poll(async () => {
      const design = (await savedDesign(page)) as {
        layers?: { frame?: { kind?: string }; imageId?: string | null }[];
      } | null;
      return design?.layers?.[0];
    })
    .toMatchObject({
      frame: { kind: "macos" },
      imageId: expect.any(String),
    });

  await page.reload();
  await expectDesignSize(page, FRAMED_W, FRAMED_H);
  // A restored design starts a fresh history.
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  const { data } = await exportImage(page);
  const [center] = await samplePixels(page, data, [[1200, 750]]);
  expect(isRed(center)).toBe(true);
});

test("an edit made just before a reload is kept", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await expect
    .poll(async () => {
      const design = (await savedDesign(page)) as {
        layers?: { imageId?: string | null }[];
      } | null;
      return design?.layers?.[0]?.imageId ?? null;
    })
    .toEqual(expect.any(String));

  await openTab(page, "Style");
  const border = page.getByRole("slider", { name: "Border width" });
  await border.focus();
  for (let i = 0; i < 5; i += 1) await border.press("ArrowRight");
  await expect(border).toHaveAttribute("aria-valuenow", "5");
  // Quick arrow-key steps on a slider are one undo step.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(border).toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(border).toHaveAttribute("aria-valuenow", "5");

  // Straight away, well inside the save delay.
  await page.reload();
  await openTab(page, "Style");
  await expect(
    page.getByRole("slider", { name: "Border width" }),
  ).toHaveAttribute("aria-valuenow", "5");
});

test("an edit is kept when the browser drops the writes made on close", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await expect
    .poll(async () => {
      const design = (await savedDesign(page)) as {
        layers?: { imageId?: string | null }[];
      } | null;
      return design?.layers?.[0]?.imageId ?? null;
    })
    .toEqual(expect.any(String));

  await openTab(page, "Style");
  const border = page.getByRole("slider", { name: "Border width" });
  await border.focus();
  for (let i = 0; i < 5; i += 1) await border.press("ArrowRight");
  await expect(border).toHaveAttribute("aria-valuenow", "5");
  // As WebKit sometimes does on a quick reload: no IndexedDB write made from
  // here on lands, neither the delayed save nor the one made on close.
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("dropped", "AbortError");
    };
  });
  await page.reload();
  await openTab(page, "Style");
  await expect(
    page.getByRole("slider", { name: "Border width" }),
  ).toHaveAttribute("aria-valuenow", "5");
});

test("a tab left untouched doesn't overwrite another tab's work", async ({
  page,
}) => {
  const savedImageId = async () => {
    const design = (await savedDesign(page)) as {
      layers?: { imageId?: string | null }[];
    } | null;
    return design?.layers?.[0]?.imageId ?? null;
  };
  // A second tab opens while nothing is saved, and is never touched.
  const other = await page.context().newPage();
  await other.goto("./editor/");
  await expectEmptyState(other);

  await upload(page, makeSolidPng(1200, 750, RED));
  await expect.poll(savedImageId).toEqual(expect.any(String));

  // Hiding or closing it must not write its empty design over that work.
  await other.close({ runBeforeUnload: true });
  await page.reload();
  await expectDesignSize(page, 1344, 894);
  expect(await savedImageId()).toEqual(expect.any(String));
});

test("exports JPEG and WebP at other scales and remembers the choice", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await page.getByRole("button", { name: "Export options" }).click();
  await page.getByRole("radio", { name: "JPEG" }).click();
  await page.getByRole("radio", { name: "1×" }).click();
  await expect(page.getByTestId("export-size")).toContainText("1344 × 894 px");
  await page.keyboard.press("Escape");
  await expect(exportButton(page)).toHaveText("Export JPEG 1×");

  const jpeg = await exportImage(page);
  expect(jpeg.name).toBe("fixture-1x.jpg");
  expect(readJpegSize(jpeg.data)).toEqual({ width: 1344, height: 894 });

  const webpSupported = await page.evaluate(() =>
    document
      .createElement("canvas")
      .toDataURL("image/webp")
      .startsWith("data:image/webp"),
  );
  await page.getByRole("button", { name: "Export options" }).click();
  const webp = page.getByRole("radio", { name: "WebP" });
  if (!webpSupported) {
    await expect(webp).toBeDisabled();
    return;
  }
  await webp.click();
  await page.getByRole("radio", { name: "3×" }).click();
  await page.keyboard.press("Escape");
  const webpFile = await exportImage(page);
  expect(webpFile.name).toBe("fixture-3x.webp");
  expect(isWebp(webpFile.data)).toBe(true);
  expect(await imageSize(page, webpFile.data)).toEqual({
    width: 4032,
    height: 2682,
  });

  await page.reload();
  await expect(exportButton(page)).toHaveText("Export WebP 3×");
});

test("very large exports are capped to what the browser allows", async ({
  page,
}) => {
  await upload(page, makeSolidPng(400, 300, RED));
  await page.getByRole("button", { name: /^Canvas size/ }).click();
  await page.getByRole("radio", { name: "Custom" }).click();
  const width = page.getByRole("spinbutton", { name: "Width" });
  const height = page.getByRole("spinbutton", { name: "Height" });
  await width.fill("4000");
  await width.press("Enter");
  await height.fill("4000");
  await height.press("Enter");
  await page.keyboard.press("Escape");
  await expectDesignSize(page, 4000, 4000);
  await page.getByRole("button", { name: "Export options" }).click();
  await page.getByRole("radio", { name: "3×" }).click();
  // 12,000 px a side is over the 16,777,216 px area limit: 4096 x 4096 instead.
  await expect(page.getByTestId("export-size")).toContainText("4096 × 4096 px");
  await expect(page.getByTestId("size-readout")).toContainText("largest size");
});

test("the screenshot can be nudged and dragged on a fixed canvas", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await chooseCanvasSize(page, /^X post/);
  await expectDesignSize(page, 1600, 900);
  // The shot fits the 1456 x 756 space inside the padding: 1210 px wide,
  // centred, so its left edge is at 195 and x = 150 is background.
  const probe: [number, number] = [150 * 2, 450 * 2];
  const probeIsRed = async () => {
    const [pixel] = await samplePixels(page, (await exportImage(page)).data, [
      probe,
    ]);
    return isRed(pixel);
  };
  expect(await probeIsRed()).toBe(false);

  const canvas = page.locator("[data-design-canvas]");
  await canvas.focus();
  for (let i = 0; i < 5; i += 1) await page.keyboard.press("Shift+ArrowLeft");
  expect(await probeIsRed()).toBe(true);
  // Quick nudges are one undo step.
  await page.getByRole("button", { name: "Undo" }).click();
  expect(await probeIsRed()).toBe(false);

  const box = await stage(page).boundingBox();
  if (!box) throw new Error("No stage");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x - 60, center.y + 30, { steps: 6 });
  await page.mouse.up();
  expect(await probeIsRed()).toBe(true);
});

test("copies the design to the clipboard as a PNG", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium lets tests grant clipboard access",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await upload(page, makeSolidPng(400, 300, RED));
  await page.getByRole("button", { name: "Copy image" }).click();
  await expect(page.getByTestId("notice")).toContainText("Copied to clipboard");
  const copied = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item.getType("image/png"));
    return { width: bitmap.width, height: bitmap.height };
  });
  // (400 + 2 x 72) x (300 + 2 x 72) at the default 2x.
  expect(copied).toEqual({ width: 1088, height: 888 });

  // The keyboard shortcut does the same when no text is selected.
  await page
    .getByTestId("notice")
    .getByRole("button", { name: "Dismiss" })
    .click();
  await page.keyboard.press("ControlOrMeta+c");
  await expect(page.getByTestId("notice")).toContainText("Copied to clipboard");
});

test("leaving the editor and coming back keeps the design and its history", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await chooseFrame(page, "macOS");
  await expectDesignSize(page, FRAMED_W, FRAMED_H);
  // Straight away, before the autosave delay has passed.
  await page.getByRole("link", { name: "Screenshot Editor home" }).click();
  await page.getByRole("link", { name: "Open editor" }).click();
  await expectDesignSize(page, FRAMED_W, FRAMED_H);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

  // And the change was saved: a full reload restores it.
  await page.reload();
  await expectDesignSize(page, FRAMED_W, FRAMED_H);
});
