import { expect, test } from "./helpers/fixtures";
import { expectEmptyState } from "./helpers/editor";

test("the home page links to the editor", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Make your screenshots look good.",
  );
  await page.getByRole("link", { name: "Open editor" }).click();
  await expect(page).toHaveURL(/\/editor\/$/);
  await expectEmptyState(page);
});

test("the editor loads when opened directly", async ({ page }) => {
  await page.goto("./editor/");
  await expect(page).toHaveTitle("Editor · Screenshot Editor");
  await expectEmptyState(page);
  await expect(
    page.getByRole("button", { name: "Export PNG 2×" }),
  ).toBeDisabled();
});

test("the favicon and assets carry the base path", async ({
  page,
  baseURL,
}) => {
  await page.goto("./");
  const basePath = new URL(baseURL ?? "").pathname.replace(/\/$/, "");
  const icon = await page
    .locator('link[rel="icon"]')
    .first()
    .getAttribute("href");
  expect(icon?.startsWith(`${basePath}/`)).toBe(true);
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("src") ?? ""),
    );
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts)
    expect(src.startsWith(`${basePath}/_next/`)).toBe(true);
});

test("pages answer HEAD requests, which Next's prefetcher sends", async ({
  request,
}) => {
  const response = await request.head("./editor/");
  expect(response.status()).toBe(200);
});
