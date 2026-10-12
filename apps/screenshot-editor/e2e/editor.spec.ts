import { expect, test } from "./helpers/fixtures";
import {
  chooseFile,
  expectColor,
  expectDesignSize,
  expectEmptyState,
  exportPng,
  openTab,
  RED,
  setSlider,
  stage,
  upload,
} from "./helpers/editor";
import {
  brightness,
  isRed,
  makeSolidPng,
  readPngSize,
  samplePixels,
} from "./helpers/png";

test.beforeEach(async ({ page }) => {
  await page.goto("./editor/");
  await expectEmptyState(page);
});

test("uploads a screenshot and exports it at 2x with rounded corners", async ({
  page,
}) => {
  await chooseFile(
    page,
    /click to add a screenshot/,
    makeSolidPng(1200, 750, RED),
  );
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

  await openTab(page, "Style");
  const radius = await setSlider(page, "Corner radius", "Home");
  await expect(radius).toHaveAttribute("aria-valuenow", "0");
  const square = await exportPng(page);
  const [squareCorner] = await samplePixels(page, square.png, [[129, 129]]);
  expect(isRed(squareCorner)).toBe(true);
});

test("padding changes the canvas size", async ({ page }) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await openTab(page, "Style");
  const padding = await setSlider(page, "Padding", "End");
  await expect(padding).toHaveAttribute("aria-valuenow", "200");
  await expectDesignSize(page, 1600, 1150);
  await setSlider(page, "Padding", "Home");
  await expectDesignSize(page, 1200, 750);
});

test("the chosen gradient and angle are what gets drawn", async ({ page }) => {
  await upload(page, makeSolidPng(400, 300, RED));
  const brookes = page.getByRole("button", { name: "Brookes" });
  await expect(brookes).toHaveAttribute("aria-pressed", "true");

  // At 135deg the top-left corner gets the first colour stop.
  const [brookesCorner] = await samplePixels(
    page,
    (await exportPng(page)).png,
    [[4, 4]],
  );
  expectColor(brookesCorner, "#424a52");

  // At 0deg the gradient runs bottom to top: the top gets the last stop.
  const angle = await setSlider(page, "Angle", "Home");
  await expect(angle).toHaveAttribute("aria-valuenow", "0");
  const turned = await exportPng(page);
  const { height } = readPngSize(turned.png);
  const [top, bottom] = await samplePixels(page, turned.png, [
    [4, 4],
    [4, height - 5],
  ]);
  expectColor(top, "#d10373");
  expectColor(bottom, "#424a52");

  // A preset brings its own colours and angle.
  const mist = page.getByRole("button", { name: "Mist" });
  await mist.click();
  await expect(mist).toHaveAttribute("aria-pressed", "true");
  await expect(brookes).toHaveAttribute("aria-pressed", "false");
  const [mistCorner] = await samplePixels(page, (await exportPng(page)).png, [
    [4, 4],
  ]);
  expectColor(mistCorner, "#e0eafc");
});

test("the shadow is drawn below a screenshot with rounded corners", async ({
  page,
}) => {
  await upload(page, makeSolidPng(1200, 750, RED));
  await page.getByRole("button", { name: "Mist" }).click(); // light background, so the shadow shows
  await openTab(page, "Style");

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
  await upload(page, makeSolidPng(400, 300, RED));
  await openTab(page, "Style");
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
  await upload(page, makeSolidPng(400, 300, RED));
  await openTab(page, "Style");
  await setSlider(page, "Padding", "Home");
  await expectDesignSize(page, 400, 300);
  await chooseFile(
    page,
    "Replace image",
    makeSolidPng(800, 600, [0, 0, 255, 255]),
    "second.png",
  );
  await expectDesignSize(page, 800, 600);
});

test("a large screenshot is downscaled and still exports sharp", async ({
  page,
}) => {
  // Longer than 3200px, so it is downscaled when loaded.
  await upload(page, makeSolidPng(4000, 2500, [0, 128, 255, 255]), "wide.png");
  await expectDesignSize(page, 1728, 1128);
  const { name, png } = await exportPng(page);
  expect(name).toBe("wide-2x.png");
  expect(readPngSize(png)).toEqual({ width: 3456, height: 2256 });
  const [center] = await samplePixels(page, png, [[1728, 1128]]);
  expectColor(center, "#0080ff", 4);
  expect(center[3]).toBe(255);
});

test("unsupported files are refused with a message", async ({ page }) => {
  await upload(page, Buffer.from("GIF89a"), "anim.gif", "image/gif");
  await expect(page.getByTestId("notice")).toContainText(
    "Unsupported file type",
  );
  await expectEmptyState(page);
});

test.describe("broken images", () => {
  // Browsers may log the decode failure; that is expected here.
  test.use({ allowedConsoleErrors: [/image|decode|corrupt|truncated/i] });

  test("an unreadable PNG shows an error", async ({ page }) => {
    await upload(page, Buffer.from("this is not a png"), "broken.png");
    await expect(page.getByTestId("notice")).toContainText(
      "Couldn't read that image",
    );
    await expectEmptyState(page);
  });
});
