import { readFileSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { logger } from "@elizaos/core";
import { resolveVendorStaticDir } from "./paths.ts";

/**
 * Serves the vendored Odysseus SPA (MIT, github.com/pewdiepie-archdaemon/odysseus)
 * byte-for-byte from `vendor/odysseus/static/`. No transformation is applied to
 * his files — the bytes on the wire are the bytes on disk.
 */

const STATIC_MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

interface CachedFile {
  body: Buffer;
  mtimeMs: number;
  contentType: string;
}

const STATIC_CACHE_MAX = 200;
const STATIC_CACHE_FILE_LIMIT = 2 * 1024 * 1024; // 2 MiB
const fileCache = new Map<string, CachedFile>();

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return STATIC_MIME[ext] ?? "application/octet-stream";
}

function cacheControlFor(relativePath: string): string {
  // Fonts and the lib/ vendored bundles are content-stable; cache hard.
  if (relativePath.startsWith("fonts/") || relativePath.startsWith("lib/")) {
    return "public, max-age=86400";
  }
  // HTML + JS + CSS revalidate so an updated vendor drop is picked up.
  return "public, max-age=0, must-revalidate";
}

function loadFile(absPath: string): CachedFile | null {
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(absPath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const cached = fileCache.get(absPath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached;
  }

  const body = readFileSync(absPath);
  const entry: CachedFile = {
    body,
    mtimeMs: stat.mtimeMs,
    contentType: contentTypeFor(absPath),
  };

  if (body.length <= STATIC_CACHE_FILE_LIMIT) {
    if (fileCache.size >= STATIC_CACHE_MAX) {
      const oldestKey = fileCache.keys().next().value;
      if (oldestKey !== undefined) fileCache.delete(oldestKey);
    }
    fileCache.set(absPath, entry);
  }
  return entry;
}

function sendBuffer(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  headers: Record<string, string | number>,
  body: Buffer,
): void {
  res.writeHead(status, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

function sendNotFound(res: ServerResponse): void {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

/**
 * Resolve a request-relative path against the vendored static root, refusing
 * any path that escapes the root (defense-in-depth path-traversal guard).
 */
function resolveWithinRoot(root: string, relativePath: string): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(relativePath);
    } catch {
      return null;
    }
  })();
  if (decoded === null) return null;

  const cleaned = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, cleaned);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return candidate;
}

/**
 * Serve the SPA entry — his unmodified `index.html`. Returns the file bytes
 * exactly as vendored.
 */
export function serveOdysseusSpaEntry(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const root = resolveVendorStaticDir();
  const entry = loadFile(path.join(root, "index.html"));
  if (!entry) {
    logger.error(
      { src: "[OdysseusVerbatimStatic]", root },
      "Vendored index.html not found — is vendor/odysseus/static/ present?",
    );
    sendNotFound(res);
    return;
  }
  sendBuffer(
    req,
    res,
    200,
    {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Length": entry.body.length,
      "Content-Type": entry.contentType,
    },
    entry.body,
  );
}

/**
 * Serve a vendored static asset addressed by the wildcard `:assetPath*` route
 * param (everything after `/static/`).
 */
export function serveOdysseusStaticAsset(
  req: IncomingMessage,
  res: ServerResponse,
  assetPath: string,
): void {
  const root = resolveVendorStaticDir();
  const abs = resolveWithinRoot(root, assetPath);
  if (abs === null) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  const entry = loadFile(abs);
  if (!entry) {
    sendNotFound(res);
    return;
  }

  const relativePath = path.relative(root, abs);
  sendBuffer(
    req,
    res,
    200,
    {
      "Cache-Control": cacheControlFor(relativePath),
      "Content-Length": entry.body.length,
      "Content-Type": entry.contentType,
    },
    entry.body,
  );
}
