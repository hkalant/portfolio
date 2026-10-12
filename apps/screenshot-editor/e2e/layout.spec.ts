import { readFile } from "node:fs/promises";
import { expectDesignSize, RED, setSlider, upload } from "./helpers/editor";
import { expect, test } from "./helpers/fixtures";
import { makeSolidPng, readPngSize } from "./helpers/png";

test("the theme can be switched and is remembered", async ({ page }) => {
  await page.goto("./editor/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^Theme:/ });
  await expect(toggle).toHaveAccessibleName("Theme: System");
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Theme: Light");
  await expect(html).not.toHaveClass(/\bdark\b/);
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Theme: Dark");
  await expect(html).toHaveClass(/\bdark\b/);

  // Applied before the page renders, on every page.
  await page.goto("./");
  await expect(html).toHaveClass(/\bdark\b/);
});

test("the system theme follows the operating system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./editor/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("panels open from the bottom tabs and the page never scrolls sideways", async ({
    page,
  }) => {
    await page.goto("./editor/");
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await upload(page, makeSolidPng(1200, 750, RED));
    await expectDesignSize(page, 1328, 878);

    const style = page.getByRole("button", { name: "Style", exact: true });
    await style.click();
    await expect(style).toHaveAttribute("aria-pressed", "true");
    await setSlider(page, "Padding", "Home");
    await expectDesignSize(page, 1200, 750);

    await page.getByRole("button", { name: "Size", exact: true }).click();
    await page.getByRole("radio", { name: /^Story/ }).click();
    await expectDesignSize(page, 1080, 1920);

    await page.getByRole("button", { name: "Close panel" }).click();
    await expect(style).toHaveAttribute("aria-pressed", "false");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export PNG 2×" }).click(),
    ]);
    expect(readPngSize(await readFile(await download.path()))).toEqual({
      width: 2160,
      height: 3840,
    });
  });
});
