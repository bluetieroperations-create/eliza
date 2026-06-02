import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Filesystem + URL constants shared by the verbatim-odysseus plugin.
 *
 * The vendored Odysseus SPA (github.com/pewdiepie-archdaemon/odysseus, MIT) is
 * shipped UNMODIFIED under `vendor/odysseus/static/`. His `index.html` and JS
 * reference every asset with an origin-absolute `/static/...` path and every
 * backend call with an origin-absolute `/api/...` path. We therefore serve his
 * tree at those exact paths so the bytes never have to change.
 */

/** Plugin id — must match `name` in package.json and the registered routes. */
export const PLUGIN_ID = "@elizaos/plugin-odysseus-verbatim";

/** App-shell route the iframe wrapper is mounted at. */
export const APP_SHELL_PATH = "/odysseus-verbatim";

/**
 * URL the iframe `src` points at. Serving his real `index.html` here means his
 * SPA boots in its own document and pulls `/static/*` + `/api/*` from the same
 * origin. Trailing path kept distinct from `/static` so the SPA entry and its
 * assets do not alias.
 */
export const SPA_ENTRY_PATH = "/odysseus-verbatim/app";

/** URL prefix Odysseus expects all of its static assets under. */
export const STATIC_URL_PREFIX = "/static";

/**
 * Absolute path to the vendored static root. Resolved relative to this module
 * so it works both from `src/` (eliza-source mode) and `dist/` (built mode);
 * `vendor/` is shipped in the package `files` list alongside `dist/`.
 */
export function resolveVendorStaticDir(): string {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  // From `<pkg>/src/paths.ts`  -> ../vendor/odysseus/static
  // From `<pkg>/dist/paths.js` -> ../vendor/odysseus/static
  return path.resolve(thisDir, "..", "vendor", "odysseus", "static");
}
