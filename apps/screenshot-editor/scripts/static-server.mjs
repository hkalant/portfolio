#!/usr/bin/env node
// A small static file server that behaves like a strict static host such as
// Bitbucket's <workspace>.bitbucket.io: it serves the exported site only under
// its base path, maps "dir/" to "dir/index.html", and has no rewrites, clean
// URLs or single-page-app fallback. Anything else is a 404, so a URL that is
// missing the base path shows up as an error instead of silently working.
//
// Usage: node scripts/static-server.mjs [--dir out] [--base /screenshot-editor] [--port 4173] [--host 127.0.0.1]
// Without --base, the base path is read from <dir>/index.html.

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

const BASE_PATH_PATTERN = /^(|\/[a-z0-9][a-z0-9-]*)$/;

function parseArgs(argv) {
  const args = { dir: "out", base: undefined, port: 4173, host: "127.0.0.1" };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (
      !["--dir", "--base", "--port", "--host"].includes(flag) ||
      value === undefined
    ) {
      throw new Error(`Unknown or incomplete argument: ${flag}`);
    }
    i += 1;
    if (flag === "--port") args.port = Number(value);
    else args[flag.slice(2)] = value;
  }
  return args;
}

// Same rule as e2e/base-path.ts: the prefix in front of /_next/static/ is the base path.
function detectBasePath(indexHtml) {
  const match = /(?:src|href)="([^"]*)\/_next\/static\//.exec(indexHtml);
  if (!match)
    throw new Error(
      "Could not find /_next/static/ in index.html. Is this a Next.js export?",
    );
  return match[1];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.dir);
  const indexFile = path.join(root, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error(`${indexFile} does not exist. Run "npm run build" first.`);
  }
  const base = args.base ?? detectBasePath(readFileSync(indexFile, "utf8"));
  if (!BASE_PATH_PATTERN.test(base)) {
    throw new Error(
      `Base path must be empty or look like "/screenshot-editor"; got "${base}".`,
    );
  }

  const server = createServer((req, res) => {
    const send = (status, body, headers = {}) => {
      res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        ...headers,
      });
      res.end(req.method === "HEAD" ? undefined : body);
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(405, "Method Not Allowed\n", { Allow: "GET, HEAD" });
      return;
    }

    const urlPath = (req.url ?? "/").split(/[?#]/, 1)[0];
    if (!urlPath.startsWith(`${base}/`)) {
      send(404, "Not Found\n");
      return;
    }

    let relative;
    try {
      relative = decodeURIComponent(urlPath.slice(base.length + 1));
    } catch {
      send(400, "Bad Request\n");
      return;
    }
    if (
      relative.includes("\0") ||
      relative.split("/").some((part) => part === "..")
    ) {
      send(400, "Bad Request\n");
      return;
    }
    if (relative === "" || relative.endsWith("/")) relative += "index.html";

    const filePath = path.resolve(root, relative);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      send(400, "Bad Request\n");
      return;
    }

    let stats;
    try {
      stats = statSync(filePath);
    } catch {
      stats = undefined;
    }
    if (!stats || !stats.isFile()) {
      send(404, "Not Found\n");
      return;
    }

    const type =
      MIME_TYPES[path.extname(filePath).toLowerCase()] ??
      "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": stats.size,
      "Cache-Control": "no-store",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  });

  server.listen(args.port, args.host, () => {
    console.log(
      `Serving ${path.relative(process.cwd(), root) || "."} at http://${args.host}:${args.port}${base}/`,
    );
  });
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
