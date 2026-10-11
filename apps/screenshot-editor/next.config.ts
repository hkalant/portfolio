import type { NextConfig } from "next";

// The site is a static export that can live in a subfolder, such as
// https://<workspace>.bitbucket.io/screenshot-editor/. NEXT_PUBLIC_BASE_PATH is the
// only place that prefix is set; Next inlines the same variable into browser code.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// One lowercase path segment without dots: Next drops the trailing slash from
// paths whose last segment looks like a file name, which breaks static hosting.
if (basePath !== "" && !/^\/[a-z0-9][a-z0-9-]*$/.test(basePath)) {
  throw new Error(
    `NEXT_PUBLIC_BASE_PATH must be empty or look like "/screenshot-editor" ` +
      `(lowercase letters, digits and dashes, no trailing slash); got "${basePath}".`,
  );
}

const nextConfig: NextConfig = {
  // `next build` writes plain HTML, CSS and JS to ./out. No server is needed.
  output: "export",
  basePath,
  // Write editor/index.html instead of editor.html, so /editor/ works on any static host.
  trailingSlash: true,
  // There is no image optimisation server in a static export.
  images: { unoptimized: true },
  reactStrictMode: true,
  // Building the same commit twice gives identical files, so a re-deploy changes nothing.
  // Locally (no GITHUB_SHA) Next falls back to a random build ID.
  generateBuildId: async () => process.env.GITHUB_SHA ?? null,
};

export default nextConfig;
