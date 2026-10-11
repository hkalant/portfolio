import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";
import { makeSolidPng, readPngSize } from "./helpers/png";

// Synthetic clipboard and drag events are only dependable in Chromium.
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "Synthetic paste and drop events need Chromium",
);

test.beforeEach(async ({ page }) => {
  await page.goto("./editor/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

async function paste(page: Page, png: Buffer, name: string) {
  await page.evaluate(
    ({ base64, name }) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], name, { type: "image/png" }));
      // A real paste targets the focused element, or the body.
      const target = document.activeElement ?? document.body;
      target.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { base64: png.toString("base64"), name },
  );
}

test("pasting a large screenshot shrinks it to fit", async ({ page }) => {
  await paste(page, makeSolidPng(4000, 2500, [0, 128, 255, 255]), "image.png");
  const stage = page.getByTestId("design-stage");
  await expect(stage).toHaveAttribute("data-width", "1728");
  await expect(stage).toHaveAttribute("data-height", "1128");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG 2×" }).click(),
  ]);
  // Pasted images are called "image.png", so the export gets a timestamped name.
  expect(download.suggestedFilename()).toMatch(
    /^screenshot-\d{8}-\d{6}-2x\.png$/,
  );
  expect(readPngSize(await readFile(await download.path()))).toEqual({
    width: 3456,
    height: 2256,
  });
});

test("dropping a file adds it", async ({ page }) => {
  const dataTransfer = await page.evaluateHandle(
    (base64) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], "dropped.png", { type: "image/png" }));
      return data;
    },
    makeSolidPng(640, 400, [0, 200, 0, 255]).toString("base64"),
  );
  const target = page.getByTestId("empty-state");
  await target.dispatchEvent("dragenter", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
  await expect(page.getByTestId("design-stage")).toHaveAttribute(
    "data-width",
    "768",
  );
});

test("dropping a link shows a hint and stays on the page", async ({ page }) => {
  const url = page.url();
  const dataTransfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData("text/uri-list", "https://example.com/picture.png");
    return data;
  });
  const target = page.getByTestId("empty-state");
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
  await expect(page.getByTestId("notice")).toContainText(
    "Drop a PNG, JPG or WebP file.",
  );
  expect(page.url()).toBe(url);
});
