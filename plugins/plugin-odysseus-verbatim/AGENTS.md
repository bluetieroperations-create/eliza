# @elizaos/plugin-odysseus-verbatim

Embeds PewDiePie's [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus)
UI **verbatim** (byte-for-byte unmodified, MIT) inside elizaOS, in a full-bleed
iframe, with a thin on-load `/api/*` adapter.

## Purpose / role

This plugin serves Odysseus's real static front-end unchanged and mounts it as
an app-shell page. There is **no React re-implementation** of his UI — his
`index.html` + JS + CSS run in their own document inside an `<iframe>`. The only
elizaOS-side code is: static-file serving, a small read-only `/api` adapter that
answers his first-paint fetches with honest values, the iframe wrapper
component, and the registration glue.

**Attribution:** Odysseus is © the Odysseus Contributors (MIT). All credit for
the UI is his. The vendored copy under `vendor/odysseus/` retains his `LICENSE`,
`ACKNOWLEDGMENTS.md`, and `VENDORED_FROM.txt` (commit `f6b0dcb`). **Never edit
anything under `vendor/`** — Biome already ignores `**/vendor/**`.

## Plugin surface

No actions, providers, services, or evaluators. The surface is:

- **`routes`** (`src/routes.ts`) — elizaOS `Route[]`, all `GET`, all
  `rawPath: true` + `public: true`, all using the legacy `handler(req,res,rt)`
  form so they can stream binary asset bytes via the real `ServerResponse`:
  - `GET /odysseus-verbatim/app` — his unmodified `index.html` (SPA entry).
  - `GET /static/:assetPath*` — vendored static asset, byte-for-byte.
  - `GET /api/auth/status | /api/auth/features | /api/auth/settings | /api/models | /api/default-chat | /api/sessions` — on-load adapter.
- **`views`** (`src/index.ts`) — one GUI view `odysseus-verbatim` at
  `/odysseus-verbatim`, bundle `dist/views/bundle.js`, export
  `OdysseusVerbatimView`.
- **App-shell page** (`src/register.ts`) — `registerAppShellPage` for
  `/odysseus-verbatim` (order 72, `developer` group). Side-effect import loaded
  by the host app.

## Layout

```
src/
  index.ts                  Plugin object — routes + views
  paths.ts                  Path/URL constants; resolveVendorStaticDir()
  static-server.ts          Byte-for-byte vendored serving (traversal guard, MIME, mtime cache, logger)
  api-adapter.ts            On-load /api/* adapter (typed shapes; honest empties; ODYSSEUS_API_PATHS)
  routes.ts                 Route[] wiring static-server + api-adapter (rawPath + public + legacy handler)
  OdysseusVerbatimView.tsx  Thin full-bleed iframe wrapper (view bundle entry)
  register.ts               registerAppShellPage side-effect
  __tests__/odysseus-verbatim.test.ts
vendor/odysseus/            VENDORED — DO NOT EDIT (static/ = his 160 files, + LICENSE/ACKNOWLEDGMENTS/VENDORED_FROM)
```

## Commands

```bash
bun run --cwd plugins/plugin-odysseus-verbatim build         # js + views + types
bun run --cwd plugins/plugin-odysseus-verbatim build:js      # tsup
bun run --cwd plugins/plugin-odysseus-verbatim build:views   # Vite view bundle → dist/views/bundle.js
bun run --cwd plugins/plugin-odysseus-verbatim build:types   # tsc --noCheck declarations
bun run --cwd plugins/plugin-odysseus-verbatim test          # vitest
bun run --cwd plugins/plugin-odysseus-verbatim clean
```

## Config / env vars

None. The plugin reads no env vars and stores no config.

## How to extend

- **Add an on-load adapter endpoint:** add an entry to `ON_LOAD_ENDPOINTS` in
  `src/api-adapter.ts` with its pathname, a typed `build()` returning an honest
  shape, and a `status` marker (`REAL`/`STUB`/`TODO`). `ODYSSEUS_API_PATHS`
  derives the route list automatically. Never fabricate rows.
- **Wire a REAL endpoint:** read the elizaOS source in the handler and return
  the DTO fields his client renders. Prefer doing this behind the prefixed
  origin described in `docs/odysseus-verbatim-plan.md` to avoid the global
  `/api/*` namespace caveat.
- **Re-vendor his UI:** replace `vendor/odysseus/static/` wholesale from the
  upstream repo and update `VENDORED_FROM.txt`. Do not hand-edit individual
  vendored files.

## Conventions / gotchas

- **rawPath + public are load-bearing.** Without `rawPath`, elizaOS prefixes the
  route with the plugin name and his hardcoded `/static`/`/api` URLs break.
  Without `public`, the server 401s the SPA's `/api/*` calls before the handler
  runs, and a 401 from a non-auth endpoint sends his SPA to `/login`.
- **`/api/auth/status` must return a non-401 200.** That, not its body, is what
  keeps the SPA on-page. The body fields are cosmetic.
- **Two build steps** (tsup JS + Vite view bundle), like
  `plugin-task-coordinator`. The view bundle entry is `OdysseusVerbatimView.tsx`.
- **Global `/api/*` namespace caveat:** the adapter routes answer literal
  `/api/*` paths for the whole origin; elizaOS owns some natively. See README +
  `docs/odysseus-verbatim-plan.md` for the prefixed-origin follow-up.
- **vendor/ is sacrosanct.** Byte-for-byte. Biome ignores it; the static server
  streams it untransformed.
- See the root `AGENTS.md` for repo-wide rules (logger-only, ESM, strict TS).
```
