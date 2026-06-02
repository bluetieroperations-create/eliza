# @elizaos/plugin-odysseus-verbatim

Serves **PewDiePie's Odysseus UI verbatim (unmodified) inside elizaOS.**

This plugin embeds the real [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus)
web application — his actual `index.html`, JavaScript, and CSS — **byte-for-byte
unchanged**, running in its own document inside a full-bleed `<iframe>` in the
elizaOS app shell. It is a deliberate "use his real code without rewriting any of
it" deliverable: there is **no React re-implementation** of his UI here.

> **Attribution.** Odysseus is © the Odysseus Contributors and is distributed
> under the **MIT License**. Source: <https://github.com/pewdiepie-archdaemon/odysseus>.
> The vendored copy under [`vendor/odysseus/`](./vendor/odysseus/) retains his
> [`LICENSE`](./vendor/odysseus/LICENSE) and [`ACKNOWLEDGMENTS.md`](./vendor/odysseus/ACKNOWLEDGMENTS.md);
> [`VENDORED_FROM.txt`](./vendor/odysseus/VENDORED_FROM.txt) records the exact
> source commit (`f6b0dcb`). All credit for the UI goes to him. **Do not edit
> anything under `vendor/`.**

---

## Architecture

Three pieces, no new server — everything rides elizaOS's existing plugin-route
mechanism (`runtime.routes`) and the app-shell page registry.

```
elizaOS app shell
  └─ /odysseus-verbatim          (app-shell nav page)
       └─ OdysseusVerbatimView   (thin React iframe wrapper, full-bleed)
            └─ <iframe src="/odysseus-verbatim/app">
                 └─ his UNMODIFIED index.html
                      ├─ GET /static/*    → vendored files, byte-for-byte
                      └─ GET /api/*        → thin on-load adapter (below)
```

1. **Vendored static tree** — `vendor/odysseus/static/` (160 files) is shipped
   in the package and served unmodified. His HTML/JS reference every asset with
   an origin-absolute `/static/...` URL and every backend call with an
   origin-absolute `/api/...` URL, so the plugin serves those exact paths and
   his bytes never have to change.

2. **iframe wrapper** — `OdysseusVerbatimView.tsx` renders a 100%×100%,
   border-less `<iframe>` pointing at `/odysseus-verbatim/app` (his `index.html`).
   His SPA boots in its own document; no styles bleed in either direction.

3. **`/api/*` adapter** — `api-adapter.ts` answers only the handful of endpoints
   his shell hits on first paint, so the UI renders instead of bouncing to
   `/login`. Every response is either a real elizaOS source or an **honest,
   structurally-valid EMPTY** response. **Nothing is fabricated.**

### Why `rawPath` + `public`

elizaOS normally prefixes a plugin's routes with `/<plugin-name>` and gates
`/api/*` behind auth. Because Odysseus's vendored bytes hardcode `/static/` and
`/api/`, the routes here are registered with:

- `rawPath: true` — use the path literally, no plugin-name prefix.
- `public: true` — bypass the API auth gate (elizaOS 401s an unauthenticated
  `/api/*` before plugin routes run; a public route is matched by
  `isPublicRuntimePluginRoute` and dispatched). Handlers are **read-only**.

They use the legacy `handler(req, res, runtime)` signature on purpose: it hands
us the real `http.ServerResponse`, which lets static assets (fonts, images)
stream with correct `Content-Type`/`Content-Length` instead of being coerced
through the JSON serializer the newer return-shape dispatcher applies.

---

## Endpoint map

Status legend: **REAL** = backed by a genuine elizaOS source · **STUB** =
honest, valid, empty (renders the shell, no fake rows) · **TODO** = not handled
here, documented for future wiring.

| Method | Path                  | Status | Response | Notes |
|--------|-----------------------|--------|----------|-------|
| GET    | `/api/auth/status`    | STUB   | `{ authenticated:true, is_admin:true, username:"elizaos-embed", privileges:{…all true} }` | A non-401 here is what keeps the SPA on-page (its global fetch wrapper redirects to `/login` only on a 401 from a non-auth endpoint). Identity is the honest embed label, not a fabricated user. |
| GET    | `/api/auth/features`  | STUB   | all features `true` | The SPA hides a feature only when a key is `=== false`; all-true hides nothing and asserts no fake config. |
| GET    | `/api/auth/settings`  | STUB   | `{ image_gen_enabled:false, tts_enabled:false, tts_provider:"disabled" }` | Honest: the embed wires no TTS/image provider. |
| GET    | `/api/models`         | STUB   | `{ items: [] }` | Empty model catalog → empty model picker. |
| GET    | `/api/default-chat`   | STUB   | `{ endpoint_url:null, model:null }` | SPA treats nulls as "unset" → shows the `/setup` welcome. |
| GET    | `/api/sessions`       | STUB   | `[]` | No persisted sessions in the embed → empty list. |
| GET    | *(other `/api/*`)*    | STUB   | `{}` | Defensive fall-through so unknown odysseus calls get valid JSON, not a 404 loop. |

### Not yet wired (TODO)

His full product hits dozens more endpoints (memory, skills, presets, notes,
calendar, email, research, cookbook, gallery, image editing, shell, TTS/STT,
MCP, vault, …) backed by his Python server. Those are intentionally **not**
implemented here — wiring them would mean either porting his backend or
fabricating data, neither of which this deliverable does. A few of his list
panels (notes, presets) expect an array and currently receive the generic `{}`
fall-through; they log a benign client-side error and render empty. They are not
on the render-critical path. See `docs/odysseus-verbatim-plan.md` for the full
enumeration and the recommended path to wire real elizaOS equivalents (memory,
sessions) behind a prefixed origin.

### Namespace caveat

The adapter routes claim the literal `/api/auth/status`, `/api/models`, etc. for
the **whole agent origin** (not just the iframe), and elizaOS already serves its
own handlers at some of those paths natively. The routes only register when this
plugin is loaded, and they are read-only, but you should not load this plugin
alongside a surface that depends on elizaOS's native `/api/auth/status` shape.
The clean follow-up (documented in the plan) is to serve Odysseus under a
prefixed origin and inject a scoped fetch/base shim, which removes the caveat
entirely. This is called out honestly rather than papered over.

---

## What renders today

Verified with Playwright against the vendored files served over plain HTTP
(screenshots in `/home/nubs/ui-extracts/verbatim-test/`):

- His real UI boots: title "Odysseus Chat", full sidebar (New Chat, Search,
  Email, Tools, Brain, Calendar, Compare, Cookbook, Deep Research, Gallery,
  Library, Notes, Tasks, Theme), the `/setup` welcome screen, the
  "Message Odysseus…" composer with the Agent/Chat toggle and model picker, and
  his brand-red boat logo (`--brand-color: #e06c75`).
- **No redirect to `/login`.** With the adapter wired, all six on-load endpoints
  return `200`, the "Failed to load sessions" parse error disappears, and the
  bottom-left user chip shows `elizaos-embed` (from `/api/auth/status`).

The login/welcome screen rendering is the success criterion: it proves his SPA
loads, boots its module graph, and runs unmodified.

---

## Build & run

This plugin has two build outputs (mirrors `@elizaos/plugin-task-coordinator`):

```bash
bun run --cwd plugins/plugin-odysseus-verbatim build        # js + view bundle + types
bun run --cwd plugins/plugin-odysseus-verbatim build:js     # tsup server/plugin JS
bun run --cwd plugins/plugin-odysseus-verbatim build:views  # Vite view bundle → dist/views/bundle.js
bun run --cwd plugins/plugin-odysseus-verbatim build:types  # tsc --noCheck declarations
bun run --cwd plugins/plugin-odysseus-verbatim test         # vitest unit suite
bun run --cwd plugins/plugin-odysseus-verbatim clean
```

To load it: add `@elizaos/plugin-odysseus-verbatim` to the agent's plugin list
(registers the `routes` + `views`), and add the app-shell side-effect import to
`packages/app/src/plugin-registrations.ts`:

```ts
{
  key: "@elizaos/plugin-odysseus-verbatim/register",
  load: () => import("@elizaos/plugin-odysseus-verbatim/register"),
},
```

> **Worktree note.** This was authored in a fresh elizaOS worktree with **no
> `node_modules`**. A workspace `bun install` is required to build/typecheck the
> plugin here (do not run it casually — it is heavy). The plugin code is
> self-consistent, formatted with Biome (which ignores `vendor/`), and its pure
> adapter + path-guard logic was validated standalone. Building the view bundle
> and running the vitest suite is a documented follow-up, not a failure of this
> deliverable.

---

## Layout

```
plugins/plugin-odysseus-verbatim/
  package.json                package + scripts (mirrors plugin-task-coordinator)
  tsconfig.build.json         extends ../tsconfig.build.shared.json
  vite.config.views.ts        view-bundle build (entry: OdysseusVerbatimView.tsx)
  vitest.config.ts            unit test config
  README.md / CLAUDE.md / AGENTS.md
  src/
    index.ts                  Plugin object: routes + views
    paths.ts                  Path/URL constants + vendor dir resolver
    static-server.ts          Byte-for-byte vendored static serving (+ traversal guard, MIME, cache)
    api-adapter.ts            On-load /api/* adapter (typed, honest empties)
    routes.ts                 elizaOS Route[] (rawPath + public) wiring static + adapter
    OdysseusVerbatimView.tsx  Thin full-bleed iframe wrapper (the view bundle entry)
    register.ts               App-shell page registration (side-effect import)
    __tests__/odysseus-verbatim.test.ts
  vendor/odysseus/            VENDORED — DO NOT EDIT
    static/                   his 160 files, byte-for-byte
    LICENSE                   his MIT license
    ACKNOWLEDGMENTS.md        his upstream credits
    VENDORED_FROM.txt         source commit f6b0dcb
```

See the repo-wide rules in the root `AGENTS.md` (logger-only, ESM, strict TS).
```
