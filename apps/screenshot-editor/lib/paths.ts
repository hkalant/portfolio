// The site may be served from a subfolder (see next.config.ts). Next prefixes
// its own assets, links and imported files automatically; only URLs to files
// in public/ built by hand need withBasePath(). Keep the env read literal so
// Next can inline it.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function joinBasePath(base: string, path: string): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function withBasePath(path: string): string {
  return joinBasePath(BASE_PATH, path);
}
