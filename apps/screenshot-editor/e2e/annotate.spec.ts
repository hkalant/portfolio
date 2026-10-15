import type { Page } from "@playwright/test";
import {
  expectColor,
  expectEmptyState,
  exportImage,
  RED,
  stage,
  upload,
  useAutoSize,
} from "./helpers/editor";
import { expect, test } from "./helpers/fixtures";
import { isRed, makeSolidPng, samplePixels } from "./helpers/png";

// A 400 x 300 screenshot on an auto canvas with 72 px padding: the canvas is
// 544 x 444 and the screenshot starts at (72, 72).
const PADDING = 72;
const IMAGE = { width: 400, height: 300 };

test.beforeEach(async ({ page }) => {
  await page.goto("./editor/");
  await expectEmptyState(page);
  await useAutoSize(page);
});

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Annotate" });
const tool = (page: Page, name: string | RegExp) =>
  toolbar(page).getByRole("button", { name, exact: typeof name === "string" });

/** Screen coordinates of a point given as fractions of the screenshot. */
async function onImage(page: Page, fx: number, fy: number) {
  const box = await stage(page).boundingBox();
  if (!box) throw new Error("No stage");
  const scale = box.width / (IMAGE.width + 2 * PADDING);
  return {
    x: box.x + (PADDING + fx * IMAGE.width) * scale,
    y: box.y + (PADDING + fy * IMAGE.height) * scale,
  };
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  const start = await onImage(page, ...from);
  const end = await onImage(page, ...to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
}

/** Export pixels at points given as fractions of the screenshot (2x export). */
async function pixelsOnImage(page: Page, points: [number, number][]) {
  return samplePixels(
    page,
    (await exportImage(page)).data,
    points.map(([fx, fy]) => [
      (PADDING + fx * IMAGE.width) * 2,
      (PADDING + fy * IMAGE.height) * 2,
    ]),
  );
}

test("the toolbar appears with a screenshot and offers three colours", async ({
  page,
}) => {
  await expect(toolbar(page)).toHaveCount(0);
  await upload(page, makeSolidPng(IMAGE.width, IMAGE.height, RED));
  await expect(toolbar(page)).toBeVisible();
  await expect(
    toolbar(page)
      .getByRole("radiogroup", { name: "Annotation colour" })
      .getByRole("radio"),
  ).toHaveCount(3);
  for (const name of ["Charcoal", "Pink", "Yellow"])
    await expect(toolbar(page).getByRole("radio", { name })).toBeVisible();
});

test("steps count up, take only numbers and can start again from 1", async ({
  page,
}) => {
  await upload(page, makeSolidPng(IMAGE.width, IMAGE.height, RED));
  await tool(page, "Add step 1").click();
  for (const [fx, fy] of [
    [0.2, 0.3],
    [0.5, 0.3],
  ] as const) {
    const point = await onImage(page, fx, fy);
    await page.mouse.click(point.x, point.y);
  }
  await expect(tool(page, "Add step 3")).toBeVisible();

  // A step is drawn in its colour, with a soft shadow, on the export.
  await toolbar(page).getByRole("radio", { name: "Charcoal" }).click();
  const third = await onImage(page, 0.8, 0.7);
  await page.mouse.click(third.x, third.y);
  // Left of the number, inside the circle.
  const [charcoal] = await pixelsOnImage(page, [[0.8 - 5 / IMAGE.width, 0.7]]);
  expectColor(charcoal, "#424a52", 20);

  await tool(page, "Reset step count").click();
  await expect(tool(page, "Add step 1")).toBeVisible();
  await expect(tool(page, "Reset step count")).toBeDisabled();

  // Select the first step and change its number: letters are dropped.
  await tool(page, "Select and move").click();
  const first = await onImage(page, 0.2, 0.3);
  await page.mouse.click(first.x, first.y);
  const field = toolbar(page).getByLabel("Step number");
  await expect(field).toHaveValue("1");
  await field.fill("");
  await field.pressSequentially("a7b");
  await expect(field).toHaveValue("7");
  await field.press("Enter");

  // Delete removes the selected step.
  await tool(page, "Delete annotation").click();
  await expect(field).toHaveCount(0);
});

test("shapes are drawn filled or as an outline in the chosen colour", async ({
  page,
}) => {
  await upload(page, makeSolidPng(IMAGE.width, IMAGE.height, RED));

  await tool(page, "Rectangle").click();
  await tool(page, "Filled shape").click();
  await toolbar(page).getByRole("radio", { name: "Pink" }).click();
  await drag(page, [0.1, 0.1], [0.4, 0.4]);

  await tool(page, "Rounded rectangle").click();
  await tool(page, "Outline shape").click();
  await toolbar(page).getByRole("radio", { name: "Yellow" }).click();
  await drag(page, [0.55, 0.1], [0.9, 0.4]);

  await tool(page, "Circle").click();
  await tool(page, "Filled shape").click();
  await toolbar(page).getByRole("radio", { name: "Charcoal" }).click();
  await drag(page, [0.2, 0.6], [0.35, 0.8]);

  const [filled, outlineInside, outlineEdge, circle, plain] =
    await pixelsOnImage(page, [
      [0.25, 0.25],
      [0.725, 0.25],
      [0.725, 0.1],
      // The circle's box is square: 60 x 60 px from (80, 180).
      [(80 + 30) / IMAGE.width, (180 + 30) / IMAGE.height],
      [0.5, 0.9],
    ]);
  expectColor(filled, "#d10373", 6);
  // An outline shape is transparent inside.
  expect(isRed(outlineInside)).toBe(true);
  expectColor(outlineEdge, "#f9c909", 20);
  expectColor(circle, "#424a52", 6);
  expect(isRed(plain)).toBe(true);
});

test("Escape puts the tool down and undo removes an annotation", async ({
  page,
}) => {
  await upload(page, makeSolidPng(IMAGE.width, IMAGE.height, RED));
  await tool(page, "Rectangle").click();
  await tool(page, "Filled shape").click();
  await drag(page, [0.3, 0.3], [0.7, 0.7]);
  const [drawn] = await pixelsOnImage(page, [[0.5, 0.5]]);
  expect(isRed(drawn)).toBe(false);

  await page.keyboard.press("Escape");
  await expect(tool(page, "Select and move")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  const [undone] = await pixelsOnImage(page, [[0.5, 0.5]]);
  expect(isRed(undone)).toBe(true);
});
