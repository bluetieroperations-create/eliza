import type { Plugin } from "@elizaos/core";
import { odysseusVerbatimRoutes } from "./routes.ts";

/**
 * @elizaos/plugin-odysseus-verbatim
 *
 * Embeds PewDiePie's Odysseus web UI (github.com/pewdiepie-archdaemon/odysseus,
 * MIT) inside elizaOS, served VERBATIM — his static files
 * (`vendor/odysseus/static/`) are shipped and served byte-for-byte, run inside
 * a full-bleed `<iframe>`, with a thin `/api/*` adapter that answers the
 * endpoints his shell hits on first paint.
 *
 * Architecture (see README.md + docs/odysseus-verbatim-plan.md):
 *   1. `routes` — STATIC + on-load API routes registered with `rawPath: true`
 *      and `public: true` so the SPA's origin-absolute `/static/*` and `/api/*`
 *      requests resolve without touching his bytes.
 *   2. `views` — a compiled iframe-wrapper bundle (`OdysseusVerbatimView`) the
 *      app shell mounts at `/odysseus-verbatim`.
 *   3. App-shell nav entry — registered as a side effect from `./register`
 *      (loaded by the host app), mirroring the other view plugins.
 *
 * No actions / providers / services / evaluators: this plugin is an embed +
 * static-serving surface only.
 */
const odysseusVerbatimPlugin: Plugin = {
  name: "@elizaos/plugin-odysseus-verbatim",
  description:
    "Serves PewDiePie's Odysseus UI verbatim (unmodified, MIT) inside elizaOS via a full-bleed iframe + on-load /api adapter.",
  routes: odysseusVerbatimRoutes,
  views: [
    {
      id: "odysseus-verbatim",
      label: "Odysseus (Verbatim)",
      description:
        "PewDiePie's Odysseus UI, served byte-for-byte inside an elizaOS iframe.",
      icon: "Ship",
      path: "/odysseus-verbatim",
      order: 72,
      bundlePath: "dist/views/bundle.js",
      componentExport: "OdysseusVerbatimView",
      tags: ["odysseus", "verbatim", "embed", "developer"],
      visibleInManager: true,
      desktopTabEnabled: true,
    },
  ],
};

export default odysseusVerbatimPlugin;
