import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The base path the static export in out/ was built with, read from the
 * built HTML (the prefix in front of /_next/static/). Same rule as
 * scripts/static-server.mjs.
 */
export function readBasePath(
  outDir = path.join(__dirname, "..", "out"),
): string {
  const indexFile = path.join(outDir, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error(
      `${indexFile} is missing. Run "npm run build" before "npm run test:e2e".`,
    );
  }
  const match = /(?:src|href)="([^"]*)\/_next\/static\//.exec(
    readFileSync(indexFile, "utf8"),
  );
  if (!match) throw new Error(`Could not find /_next/static/ in ${indexFile}.`);
  const basePath = match[1];
  const expected = process.env.NEXT_PUBLIC_BASE_PATH;
  if (expected !== undefined && expected !== basePath) {
    throw new Error(
      `out/ was built with base path "${basePath}", but NEXT_PUBLIC_BASE_PATH is "${expected}". Run "npm run build" again.`,
    );
  }
  return basePath;
}
