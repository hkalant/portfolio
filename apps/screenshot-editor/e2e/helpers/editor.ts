import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import type { Rgba } from "./png";

export const RED: Rgba = [255, 0, 0, 255];

/** Each channel within `tolerance` of the #rrggbb colour. */
export function expectColor(actual: Rgba, hex: string, tolerance = 12) {
  const expected = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  expected.forEach((channel, i) =>
    expect(
      Math.abs(actual[i] - channel),
      `channel ${i} of ${actual} vs ${hex}`,
    ).toBeLessThanOrEqual(tolerance),
  );
}

/** Opens the system file picker through a button, the way a user does. */
export async function chooseFile(
  page: Page,
  button: string | RegExp,
  buffer: Buffer,
  name = "fixture.png",
) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: button }).click();
  await (await chooser).setFiles({ name, mimeType: "image/png", buffer });
}

export async function upload(
  page: Page,
  buffer: Buffer,
  name = "fixture.png",
  mimeType = "image/png",
) {
  await page
    .getByTestId("file-input")
    .setInputFiles({ name, mimeType, buffer });
}

/** The main export button, whatever format and scale it is set to. */
export const exportButton = (page: Page) =>
  page.getByRole("button", { name: /^Export (PNG|JPEG|WebP) \d×$/ });

/** Clicks the export button and returns the downloaded file. */
export async function exportImage(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportButton(page).click(),
  ]);
  const file = await download.path();
  return { name: download.suggestedFilename(), data: await readFile(file) };
}

/** The M1 name: exports and returns `{ name, png }`. */
export async function exportPng(page: Page) {
  const { name, data } = await exportImage(page);
  return { name, png: data };
}

export const stage = (page: Page) => page.getByTestId("design-stage");

export async function expectDesignSize(
  page: Page,
  width: number,
  height: number,
) {
  await expect(stage(page)).toHaveAttribute("data-width", String(width));
  await expect(stage(page)).toHaveAttribute("data-height", String(height));
}

/** Moves a slider to its minimum or maximum with the keyboard. */
export async function setSlider(page: Page, name: string, key: "Home" | "End") {
  const slider = page.getByRole("slider", { name });
  await slider.focus();
  await slider.press(key);
  return slider;
}

/**
 * Waits for the empty editor. A fresh page shows "Restoring…" until storage
 * answers, which the editor waits up to 5 s for (slower in WebKit on CI).
 */
export async function expectEmptyState(page: Page) {
  await expect(page.getByTestId("empty-state")).toBeVisible({
    timeout: 10_000,
  });
}

export async function openTab(page: Page, name: "Background" | "Style") {
  await page.getByRole("combobox", { name: "Tool" }).selectOption(name);
}

/** Picks a window frame in the Style tool, which changes the design size. */
export async function chooseFrame(page: Page, name: string) {
  await openTab(page, "Style");
  await page
    .getByRole("radiogroup", { name: "Frame", exact: true })
    .getByRole("radio", { name, exact: true })
    .click();
}

/** A shadow preset in the Style tool ("None" also exists as a frame). */
export function shadowOption(page: Page, name: string) {
  return page
    .getByRole("radiogroup", { name: "Shadow", exact: true })
    .getByRole("radio", { name, exact: true });
}

/** Picks a canvas size from the top bar's size menu. */
export async function chooseCanvasSize(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name: /^Canvas size/ }).click();
  await page.getByRole("radio", { name }).click();
}
