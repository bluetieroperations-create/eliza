import { registerAppShellPage } from "@elizaos/ui/app-shell-registry";
import { OdysseusVerbatimView } from "./OdysseusVerbatimView";

/**
 * Side-effect module: registers the "Odysseus (Verbatim)" page into the
 * elizaOS app shell. Loaded by the host app via
 * `import("@elizaos/plugin-odysseus-verbatim/register")` (mirrors the other
 * app-shell page plugins in `packages/app/src/plugin-registrations.ts`).
 */
registerAppShellPage({
  id: "odysseus-verbatim",
  pluginId: "@elizaos/plugin-odysseus-verbatim",
  label: "Odysseus (Verbatim)",
  icon: "Ship",
  path: "/odysseus-verbatim",
  order: 72,
  group: "developer",
  Component: OdysseusVerbatimView,
});
