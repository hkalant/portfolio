import type { Page } from "@playwright/test";
import {
  chooseFile,
  expectColor,
  expectDesignSize,
  expectEmptyState,
  exportImage,
  openTab,
  RED,
  setSlider,
  shadowOption,
  upload,
} from "./helpers/editor";
import { expect, test } from "./helpers/fixtures";
import { brightness, isRed, makeSolidPng, samplePixels } from "./helpers/png";

test.beforeEach(async ({ page }) => {
  await page.goto("./editor/");
  await expectEmptyState(page);
});

const backgroundType = (page: Page, name: string) =>
  page
    .getByRole("radiogroup", { name: "Background type" })
    .getByRole("radio", { name, exact: true });

async function cornerPixel(page: Page) {
  const [pixel] = await samplePixels(page, (await exportImage(page)).data, [
    [4, 4],
  ]);
  return pixel;
}

test("solid, transparent and uploaded backgrounds are what gets exported", async ({
  page,
}) => {
  await upload(page, makeSolidPng(400, 300, RED));

  await backgroundType(page, "Solid").click();
  await expect(backgroundType(page, "Solid")).toHaveAttribute(
    "data-state",
    "on",
  );
  await page.getByRole("button", { name: /^Colour:/ }).click();
  const hex = page.getByLabel("Hex");
  await hex.fill("#123456");
  await hex.press("Enter");
  await page.keyboard.press("Escape");
  expectColor(await cornerPixel(page), "#123456", 2);

  await backgroundType(page, "None").click();
  expect((await cornerPixel(page))[3]).toBe(0);

  await backgroundType(page, "Image").click();
  await chooseFile(
    page,
    "Upload background",
    makeSolidPng(300, 200, [0, 0, 255, 255]),
    "sky.png",
  );
  expectColor(await cornerPixel(page), "#0000ff", 4);
  await setSlider(page, "Blur", "End");
  expectColor(await cornerPixel(page), "#0000ff", 8);

  await backgroundType(page, "From image").click();
  // A red screenshot makes a red gradient.
  const fromImage = await cornerPixel(page);
  expect(fromImage[0]).toBeGreaterThan(fromImage[1] + 40);

  await backgroundType(page, "Gradient").click();
  await expect(page.getByRole("button", { name: "Brookes" })).toBeVisible();
});

test("built-in wallpapers draw without errors", async ({ page }) => {
  await upload(page, makeSolidPng(400, 300, RED));
  await backgroundType(page, "Image").click();
  const first = page.getByRole("button", { name: "Waves" });
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  const corner = await cornerPixel(page);
  expect(corner[3]).toBe(255);
});

test("JPEG exports fill transparency with white", async ({ page }) => {
  await upload(page, makeSolidPng(400, 300, RED));
  await backgroundType(page, "None").click();
  await page.getByRole("button", { name: "Export options" }).click();
  await page.getByRole("radio", { name: "JPEG" }).click();
  await page.keyboard.press("Escape");
  expectColor(await cornerPixel(page), "#ffffff", 3);
});

test("window frames add a title bar above the screenshot", async ({ page }) => {
  // 1000 px wide: frame chrome at its base size.
  await upload(page, makeSolidPng(1000, 600, RED));
  await openTab(page, "Style");
  const frame = (name: string) =>
    page
      .getByRole("radiogroup", { name: "Frame", exact: true })
      .getByRole("radio", { name, exact: true });

  await frame("macOS").click();
  await expectDesignSize(page, 1144, 778);
  const bar: [number, number] = [(72 + 500) * 2, (72 + 17) * 2];
  const inside: [number, number] = [(72 + 500) * 2, (72 + 34 + 300) * 2];
  const [lightBar, imagePixel] = await samplePixels(
    page,
    (await exportImage(page)).data,
    [bar, inside],
  );
  expect(isRed(lightBar)).toBe(false);
  expect(brightness(lightBar)).toBeGreaterThan(200);
  expect(isRed(imagePixel)).toBe(true);

  await page.getByRole("radio", { name: "Dark" }).click();
  const [darkBar] = await samplePixels(page, (await exportImage(page)).data, [
    bar,
  ]);
  expect(brightness(darkBar)).toBeLessThan(80);

  await page.getByLabel("Window title").fill("My app");
  await frame("Browser").click();
  await expectDesignSize(page, 1144, 792);
  await page.getByLabel("Address").fill("example.com");
  await frame("Glass").click();
  await expectDesignSize(page, 1164, 764);
  await frame("None").click();
  await expectDesignSize(page, 1144, 744);
});

test("border and shadow", async ({ page }) => {
  await upload(page, makeSolidPng(400, 300, RED));
  await openTab(page, "Style");

  // A white border at 60 % over red is pink.
  await setSlider(page, "Border width", "End");
  const [borderPixel] = await samplePixels(
    page,
    (await exportImage(page)).data,
    [[(72 + 5) * 2, (72 + 150) * 2]],
  );
  expect(borderPixel[1]).toBeGreaterThan(100);

  // The shadow comes from the presets only.
  for (const name of ["None", "Soft", "Medium", "Floating"])
    await expect(shadowOption(page, name)).toBeVisible();
  await expect(shadowOption(page, "Hard")).toHaveCount(0);
  await expect(shadowOption(page, "Floating")).toHaveAttribute(
    "data-state",
    "on",
  );
});
