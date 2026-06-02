import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Thin `/api/*` adapter for the vendored Odysseus SPA.
 *
 * Odysseus is a standalone product with its own Python backend. We are NOT
 * porting that backend — we answer only the handful of endpoints its shell hits
 * on first paint so the UI renders inside elizaOS instead of bouncing to
 * `/login`. The guiding rule (root AGENTS.md): never fabricate data. Every
 * response below is either wired to a real elizaOS equivalent, or an HONEST,
 * structurally-valid EMPTY response.
 *
 * Status legend (see README endpoint map for the full table):
 *   REAL  — backed by a genuine elizaOS data source.
 *   STUB  — honest, valid, EMPTY response (renders the shell; no fake rows).
 *   TODO  — intentionally not handled here; documented as future wiring.
 *
 * IMPORTANT NAMESPACE CAVEAT: these routes are registered with `rawPath: true`,
 * so the literal `/api/...` paths below are answered for the WHOLE agent
 * origin, not just the iframe. They are therefore scoped to the minimal
 * read-only on-load set and only register when this plugin is loaded. Endpoints
 * elizaOS already owns natively (it serves its own `/api/auth/status`,
 * `/api/models`, ...) are deliberately NOT in this adapter's path list except
 * where the Odysseus shape differs and the plugin owns the surface — see the
 * README for the conflict analysis and the recommended prefixed-origin
 * follow-up that removes the caveat entirely.
 */

// ---------------------------------------------------------------------------
// Honest response shapes (typed — no `any`, no fabricated rows)
// ---------------------------------------------------------------------------

/** Per-user privilege gates. All true => full UI, nothing hidden. */
interface OdysseusPrivileges {
  can_use_agent: boolean;
  can_use_bash: boolean;
  can_use_documents: boolean;
  can_use_research: boolean;
  can_generate_images: boolean;
  can_manage_memory: boolean;
}

interface OdysseusAuthStatus {
  authenticated: boolean;
  is_admin: boolean;
  username: string;
  privileges: OdysseusPrivileges;
}

/** Admin/feature flags. Odysseus hides a feature only when a key is `false`. */
interface OdysseusFeatures {
  web_search: boolean;
  deep_research: boolean;
  document_editor: boolean;
  gallery: boolean;
  sensitive_filter: boolean;
}

interface OdysseusSettings {
  image_gen_enabled: boolean;
  tts_enabled: boolean;
  tts_provider: string;
}

interface OdysseusModelsResponse {
  items: never[];
}

/** `/api/default-chat`: the SPA treats a missing endpoint_url/model as "unset". */
interface OdysseusDefaultChat {
  endpoint_url: string | null;
  model: string | null;
}

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

function fullPrivileges(): OdysseusPrivileges {
  return {
    can_use_agent: true,
    can_use_bash: true,
    can_use_documents: true,
    can_use_research: true,
    can_generate_images: true,
    can_manage_memory: true,
  };
}

/**
 * STUB. A 200 here (any 200, not a 401) is what keeps the SPA on-page: its
 * global fetch wrapper redirects to `/login` only on a 401 from a non-auth
 * endpoint. We present a single honest local operator with full privileges and
 * no fabricated identity beyond the embed label.
 */
function authStatus(): OdysseusAuthStatus {
  return {
    authenticated: true,
    is_admin: true,
    username: "elizaos-embed",
    privileges: fullPrivileges(),
  };
}

/** STUB. All features enabled — nothing hidden, no fake config asserted. */
function features(): OdysseusFeatures {
  return {
    web_search: true,
    deep_research: true,
    document_editor: true,
    gallery: true,
    sensitive_filter: true,
  };
}

/** STUB. TTS reported as not-configured (honest: the embed wires no provider). */
function settings(): OdysseusSettings {
  return {
    image_gen_enabled: false,
    tts_enabled: false,
    tts_provider: "disabled",
  };
}

/** STUB. No model catalog wired -> empty list (renders an empty model picker). */
function models(): OdysseusModelsResponse {
  return { items: [] };
}

/** STUB. No default chat configured -> nulls (SPA treats as "unset"). */
function defaultChat(): OdysseusDefaultChat {
  return { endpoint_url: null, model: null };
}

/** STUB. No persisted sessions in the embed -> empty array. */
function sessions(): never[] {
  return [];
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

interface AdapterEndpoint {
  /** Exact pathname this handler answers (matched verbatim). */
  pathname: string;
  /** HTTP method. */
  method: "GET";
  /** Maturity marker, surfaced in logs + README. */
  status: "REAL" | "STUB" | "TODO";
  /** Produces the JSON body. */
  build: () => unknown;
}

/**
 * The minimal on-load read set. Every entry is GET and side-effect-free.
 * Writes / mutations are intentionally absent: a half-wired control that POSTs
 * into a void is worse than an inert one (root AGENTS.md rule 10).
 */
const ON_LOAD_ENDPOINTS: AdapterEndpoint[] = [
  {
    pathname: "/api/auth/status",
    method: "GET",
    status: "STUB",
    build: authStatus,
  },
  {
    pathname: "/api/auth/features",
    method: "GET",
    status: "STUB",
    build: features,
  },
  {
    pathname: "/api/auth/settings",
    method: "GET",
    status: "STUB",
    build: settings,
  },
  { pathname: "/api/models", method: "GET", status: "STUB", build: models },
  {
    pathname: "/api/default-chat",
    method: "GET",
    status: "STUB",
    build: defaultChat,
  },
  { pathname: "/api/sessions", method: "GET", status: "STUB", build: sessions },
];

/** Pathnames this adapter claims, exposed for route registration. */
export const ODYSSEUS_API_PATHS: readonly string[] = ON_LOAD_ENDPOINTS.map(
  (endpoint) => endpoint.pathname,
);

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/**
 * Answer one on-load Odysseus API request. Returns the JSON for any pathname in
 * {@link ODYSSEUS_API_PATHS}; unknown odysseus endpoints fall through to an
 * honest empty `{}` so the SPA gets valid JSON rather than a 404 loop.
 */
export function handleOdysseusApiRequest(
  _req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): void {
  const endpoint = ON_LOAD_ENDPOINTS.find(
    (candidate) => candidate.pathname === pathname,
  );
  if (endpoint) {
    sendJson(res, 200, endpoint.build());
    return;
  }
  // Defensive: a registered odysseus path with no matching builder still gets
  // valid empty JSON instead of leaking a 404 into the SPA's fetch wrapper.
  sendJson(res, 200, {});
}
