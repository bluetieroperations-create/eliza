import type { IncomingMessage, ServerResponse } from "node:http";
import type { Route } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { handleOdysseusApiRequest, ODYSSEUS_API_PATHS } from "./api-adapter.ts";
import { SPA_ENTRY_PATH, STATIC_URL_PREFIX } from "./paths.ts";
import {
  serveOdysseusSpaEntry,
  serveOdysseusStaticAsset,
} from "./static-server.ts";

/**
 * elizaOS `Route[]` definitions for the verbatim Odysseus embed.
 *
 * All routes use:
 *   - `rawPath: true`  — the path is used as-is (no `/<plugin-name>` prefix),
 *     because Odysseus's vendored bytes reference `/static/*` and `/api/*`
 *     origin-absolute and must not be edited.
 *   - `public: true`   — bypasses the API auth gate. elizaOS's HTTP server 401s
 *     any unauthenticated `/api/*` (and would never reach a private plugin
 *     route); a public route is matched by `isPublicRuntimePluginRoute` and
 *     dispatched. The handlers are read-only and serve only the on-load shell.
 *
 * These use the legacy `handler(req, res, runtime)` signature (not the newer
 * return-shape `routeHandler`) on purpose: the legacy path hands us the real
 * `http.ServerResponse`, which lets us stream binary assets (fonts, images)
 * with correct Content-Type/Length without round-tripping through the JSON
 * serializer the return-shape dispatcher applies.
 */

/**
 * The host (`tryHandleRuntimePluginRoute`) invokes legacy handlers with the
 * real Node `http` request/response and an augmented `params` map. The plugin
 * `Route.handler` type is the minimal `RouteRequest`/`RouteResponse`, so we
 * narrow to the concrete Node types once at the boundary — the same idiom
 * first-party plugins use (see `plugin-browser/src/plugin.ts`).
 */
type HostRequest = IncomingMessage & { params?: Record<string, string> };

function logHandlerError(scope: string, error: unknown): void {
  logger.error(
    { src: "[OdysseusVerbatimRoutes]", scope },
    error instanceof Error ? error.message : "Unknown route handler error",
  );
}

function failClosed(res: ServerResponse, json: boolean): void {
  if (res.headersSent) return;
  if (json) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internal server error" }));
    return;
  }
  res.writeHead(500);
  res.end();
}

/** SPA entry — serves his unmodified `index.html`. */
const spaEntryRoute: Route = {
  type: "GET",
  path: SPA_ENTRY_PATH,
  name: "odysseus-verbatim-spa-entry",
  public: true,
  rawPath: true,
  handler: async (req, res): Promise<void> => {
    const httpReq = req as HostRequest;
    const httpRes = res as ServerResponse;
    try {
      serveOdysseusSpaEntry(httpReq, httpRes);
    } catch (error) {
      logHandlerError("spa-entry", error);
      failClosed(httpRes, false);
    }
  },
};

/** Static assets — `/static/<anything>` -> vendored file, byte-for-byte. */
const staticAssetRoute: Route = {
  type: "GET",
  path: `${STATIC_URL_PREFIX}/:assetPath*`,
  name: "odysseus-verbatim-static",
  public: true,
  rawPath: true,
  handler: async (req, res): Promise<void> => {
    const httpReq = req as HostRequest;
    const httpRes = res as ServerResponse;
    try {
      serveOdysseusStaticAsset(
        httpReq,
        httpRes,
        httpReq.params?.assetPath ?? "",
      );
    } catch (error) {
      logHandlerError("static-asset", error);
      failClosed(httpRes, false);
    }
  },
};

function buildApiRoute(pathname: string): Route {
  return {
    type: "GET",
    path: pathname,
    name: `odysseus-verbatim-api:${pathname}`,
    public: true,
    rawPath: true,
    handler: async (req, res): Promise<void> => {
      const httpReq = req as HostRequest;
      const httpRes = res as ServerResponse;
      try {
        handleOdysseusApiRequest(httpReq, httpRes, pathname);
      } catch (error) {
        logHandlerError(`api:${pathname}`, error);
        failClosed(httpRes, true);
      }
    },
  };
}

const apiAdapterRoutes: Route[] = ODYSSEUS_API_PATHS.map(buildApiRoute);

/** All routes contributed by the verbatim-odysseus plugin. */
export const odysseusVerbatimRoutes: Route[] = [
  spaEntryRoute,
  staticAssetRoute,
  ...apiAdapterRoutes,
];
