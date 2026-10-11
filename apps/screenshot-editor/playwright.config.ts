import { defineConfig, devices } from "@playwright/test";
import { readBasePath } from "./e2e/base-path";

// The tests run against the built static export (npm run build), served the
// way a strict static host like Bitbucket serves it, under its base path.
const basePath = readBasePath();
const port = 4174;
const baseURL = `http://127.0.0.1:${port}${basePath}/`;
const allBrowsers = process.env.E2E_ALL_BROWSERS === "1";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    acceptDownloads: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(allBrowsers
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: {
    command: `node scripts/static-server.mjs --dir out --base "${basePath}" --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
