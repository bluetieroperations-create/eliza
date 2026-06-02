import { existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleOdysseusApiRequest,
  ODYSSEUS_API_PATHS,
} from "../api-adapter.ts";
import odysseusVerbatimPlugin from "../index.ts";
import { resolveVendorStaticDir } from "../paths.ts";
import { odysseusVerbatimRoutes } from "../routes.ts";

/** Capture a JSON response written by a handler through a fake ServerResponse. */
function captureJson(
  run: (req: IncomingMessage, res: ServerResponse) => void,
): { status: number; headers: Record<string, string>; body: unknown } {
  let status = 0;
  let payload = "";
  const headers: Record<string, string> = {};
  const res = {
    set statusCode(code: number) {
      status = code;
    },
    setHeader(name: string, value: string): void {
      headers[name.toLowerCase()] = value;
    },
    end(chunk?: string): void {
      if (typeof chunk === "string") payload = chunk;
    },
  } as unknown as ServerResponse;
  const req = { method: "GET" } as IncomingMessage;
  run(req, res);
  return {
    status,
    headers,
    body: payload.length > 0 ? JSON.parse(payload) : undefined,
  };
}

describe("odysseus-verbatim api adapter", () => {
  it("answers /api/auth/status with a non-401 authed shape (keeps SPA on-page)", () => {
    const result = captureJson((req, res) =>
      handleOdysseusApiRequest(req, res, "/api/auth/status"),
    );
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      authenticated: true,
      is_admin: true,
      username: expect.any(String),
    });
    const body = result.body as { privileges: Record<string, boolean> };
    expect(body.privileges.can_use_agent).toBe(true);
  });

  it("returns an empty array for /api/sessions (no fabricated rows)", () => {
    const result = captureJson((req, res) =>
      handleOdysseusApiRequest(req, res, "/api/sessions"),
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual([]);
  });

  it("returns { items: [] } for /api/models", () => {
    const result = captureJson((req, res) =>
      handleOdysseusApiRequest(req, res, "/api/models"),
    );
    expect(result.body).toEqual({ items: [] });
  });

  it("returns null endpoint/model for /api/default-chat", () => {
    const result = captureJson((req, res) =>
      handleOdysseusApiRequest(req, res, "/api/default-chat"),
    );
    expect(result.body).toEqual({ endpoint_url: null, model: null });
  });

  it("returns valid empty JSON for an unknown odysseus endpoint", () => {
    const result = captureJson((req, res) =>
      handleOdysseusApiRequest(req, res, "/api/whatever"),
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual({});
  });

  it("exposes exactly the on-load read endpoints", () => {
    expect([...ODYSSEUS_API_PATHS].sort()).toEqual(
      [
        "/api/auth/features",
        "/api/auth/settings",
        "/api/auth/status",
        "/api/default-chat",
        "/api/models",
        "/api/sessions",
      ].sort(),
    );
  });
});

describe("odysseus-verbatim routes", () => {
  it("registers the SPA entry, the /static wildcard, and one route per api path", () => {
    const paths = odysseusVerbatimRoutes.map((route) => route.path);
    expect(paths).toContain("/odysseus-verbatim/app");
    expect(paths).toContain("/static/:assetPath*");
    for (const apiPath of ODYSSEUS_API_PATHS) {
      expect(paths).toContain(apiPath);
    }
  });

  it("registers every route as public + rawPath GET (so the SPA can reach them)", () => {
    for (const route of odysseusVerbatimRoutes) {
      expect(route.type).toBe("GET");
      expect(route.rawPath).toBe(true);
      expect(route.public).toBe(true);
      expect(typeof route.handler).toBe("function");
    }
  });
});

describe("odysseus-verbatim vendored assets", () => {
  it("ships the vendored static tree with his index.html intact", () => {
    const root = resolveVendorStaticDir();
    expect(existsSync(root)).toBe(true);
    const indexHtml = path.join(root, "index.html");
    expect(statSync(indexHtml).isFile()).toBe(true);
    const appJs = path.join(root, "app.js");
    expect(statSync(appJs).isFile()).toBe(true);
  });
});

describe("odysseus-verbatim plugin object", () => {
  it("declares the iframe view + the static/api routes, no actions/services", () => {
    expect(odysseusVerbatimPlugin.name).toBe(
      "@elizaos/plugin-odysseus-verbatim",
    );
    expect(odysseusVerbatimPlugin.views?.[0]?.componentExport).toBe(
      "OdysseusVerbatimView",
    );
    expect(odysseusVerbatimPlugin.routes?.length).toBe(
      odysseusVerbatimRoutes.length,
    );
    expect(odysseusVerbatimPlugin.actions).toBeUndefined();
    expect(odysseusVerbatimPlugin.services).toBeUndefined();
  });
});
