import { createViewBundleConfig } from "../../packages/scripts/view-bundle-vite.config.ts";

export default createViewBundleConfig({
  packageName: "@elizaos/plugin-odysseus-verbatim",
  viewId: "odysseus-verbatim",
  entry: "./src/OdysseusVerbatimView.tsx",
  outDir: "dist/views",
  componentExport: "OdysseusVerbatimView",
});
