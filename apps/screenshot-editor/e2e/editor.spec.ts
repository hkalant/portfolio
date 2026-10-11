import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";
import {
  brightness,
  isRed,
  makeSolidPng,
  readPngSize,
  samplePixels,
} from "./helpers/png";

const RED = [255, 0, 0, 255] as const;

async function upload(
  page: Page,
  buffer: Buffer,
  name = "fixture.png",
  mimeType = "image/png",
) {
  await page
    .getByTestId("file-input")
    .setInputFiles({ name, mimeType, buffer });
}

async function exportPng(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG 2×" }).click(),
  ]);
  const file = await download.path();
  return { name: download.suggestedFilename(), png: await readFile(file) };
}

const stage = (page: Page) => page.getByTestId("design-stage");

async function expectDesignSize(page: Page, width: number, height: number) {
  await expect(stage(page)).toHaveAttribute("data-width", String(width));
  await expect(stage(page)).toHaveAttribute("data-height", String(height));
}

async function setSlider(page: Page, name: string, key: "Home" | "End") {
  const slider = page.getByRole("slider", { name });
  await slider.focus();
  await slider.press(key);
  return slider;
}

test.beforeEach(async ({ page }) => {
  await page.goto("./editor/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("uploads a screenshot and exports it at 2x with rounded corners", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, [...RED]));
  // 1200 x 750 plus 64px default padding on each side.
  await expectDesignSize(page, 1328, 878);

  const first = await exportPng(page);
  expect(first.name).toBe("fixture-2x.png");
  expect(readPngSize(first.png)).toEqual({ width: 2656, height: 1756 });
  // The image starts at (128, 128) in export pixels; with a 12px (24 export px)
  // radius, the pixel just inside its corner is cut away.
  const [center, background, roundedCorner] = await samplePixels(
    page,
    first.png,
    [
      [1328, 878],
      [4, 4],
      [129, 129],
    ],
  );
  expect(isRed(center)).toBe(true);
  expect(background[3]).toBe(255);
  expect(isRed(background)).toBe(false);
  expect(isRed(roundedCorner)).toBe(false);

  await page.getByRole("tab", { name: "Style" }).click();
  const radius = await setSlider(page, "Corner radius", "Home");
  await expect(radius).toHaveAttribute("aria-valuenow", "0");
  const square = await exportPng(page);
  const [squareCorner] = await samplePixels(page, square.png, [[129, 129]]);
  expect(isRed(squareCorner)).toBe(true);
});

test("padding changes the canvas size", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, [...RED]));
  await page.getByRole("tab", { name: "Style" }).click();
  const padding = await setSlider(page, "Padding", "End");
  await expect(padding).toHaveAttribute("aria-valuenow", "200");
  await expectDesignSize(page, 1600, 1150);
  await setSlider(page, "Padding", "Home");
  await expectDesignSize(page, 1200, 750);
});

test("gradient presets can be picked", async ({ page }) => {
  await upload(page, makeSolidPng(400, 300, [...RED]));
  const lavender = page.getByRole("button", { name: "Lavender" });
  const mist = page.getByRole("button", { name: "Mist" });
  await expect(lavender).toHaveAttribute("aria-pressed", "true");
  await mist.click();
  await expect(mist).toHaveAttribute("aria-pressed", "true");
  await expect(lavender).toHaveAttribute("aria-pressed", "false");
});

test("the shadow is drawn below a screenshot with rounded corners", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, [...RED]));
  await page.getByRole("button", { name: "Mist" }).click(); // light background, so the shadow shows
  await page.getByRole("tab", { name: "Style" }).click();

  // 20 export px below the bottom edge of the image, horizontally centred.
  const probe: [number, number] = [1328, (64 + 750) * 2 + 20];

  await page.getByRole("radio", { name: "None" }).click();
  await expect(page.getByRole("radio", { name: "None" })).toHaveAttribute(
    "data-state",
    "on",
  );
  const [withoutShadow] = await samplePixels(
    page,
    (await exportPng(page)).png,
    [probe],
  );

  await page.getByRole("radio", { name: "Floating" }).click();
  await expect(page.getByRole("radio", { name: "Floating" })).toHaveAttribute(
    "data-state",
    "on",
  );
  const [withShadow] = await samplePixels(page, (await exportPng(page)).png, [
    probe,
  ]);

  expect(brightness(withShadow)).toBeLessThanOrEqual(
    0.9 * brightness(withoutShadow),
  );
});

test("clicking the active shadow option again keeps it selected", async ({
  page,
}) => {
  await upload(page, makeSolidPng(400, 300, [...RED]));
  await page.getByRole("tab", { name: "Style" }).click();
  const floating = page.getByRole("radio", { name: "Floating" });
  await floating.click();
  await floating.click();
  await expect(floating).toHaveAttribute("data-state", "on");
  await expect(stage(page)).toBeVisible();
});

test("the sample image loads", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample image" }).click();
  // The 2880 x 1800 sample is shown at 1600 x 1000, plus padding.
  await expectDesignSize(page, 1728, 1128);
  const { name, png } = await exportPng(page);
  expect(name).toBe("sample-screenshot-2x.png");
  expect(readPngSize(png)).toEqual({ width: 3456, height: 2256 });
});

test("replacing the image keeps the style", async ({ page }) => {
  await upload(page, makeSolidPng(400, 300, [...RED]));
  await page.getByRole("tab", { name: "Style" }).click();
  await setSlider(page, "Padding", "Home");
  await expectDesignSize(page, 400, 300);
  await upload(page, makeSolidPng(800, 600, [0, 0, 255, 255]), "second.png");
  await expectDesignSize(page, 800, 600);
});

test("unsupported files are refused with a message", async ({ page }) => {
  await upload(page, Buffer.from("GIF89a"), "anim.gif", "image/gif");
  await expect(page.getByTestId("notice")).toContainText(
    "Unsupported file type",
  );
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test.describe("broken images", () => {
  // Browsers may log the decode failure; that is expected here.
  test.use({ allowedConsoleErrors: [/image|decode|corrupt|truncated/i] });

  test("an unreadable PNG shows an error", async ({ page }) => {
    await upload(page, Buffer.from("this is not a png"), "broken.png");
    await expect(page.getByTestId("notice")).toContainText(
      "Couldn't read that image",
    );
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });
});
