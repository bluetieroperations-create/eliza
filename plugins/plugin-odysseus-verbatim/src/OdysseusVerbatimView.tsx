import type { CSSProperties } from "react";

/**
 * Thin React wrapper that embeds the VERBATIM Odysseus SPA
 * (github.com/pewdiepie-archdaemon/odysseus, MIT) inside the elizaOS app shell.
 *
 * The wrapper does nothing but render a full-bleed `<iframe>` pointing at the
 * served SPA entry. His unmodified `index.html` + JS + CSS therefore run in
 * their own document, exactly as authored — no React re-implementation, no
 * style bleed in either direction.
 */

/** URL the iframe loads. Mirrors `SPA_ENTRY_PATH` in `src/paths.ts`. */
const ODYSSEUS_SPA_ENTRY = "/odysseus-verbatim/app";

const containerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const iframeStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
  display: "block",
};

export function OdysseusVerbatimView() {
  return (
    <div style={containerStyle}>
      <iframe
        title="Odysseus (Verbatim)"
        src={ODYSSEUS_SPA_ENTRY}
        style={iframeStyle}
        // Same-origin: the SPA fetches /static/* and /api/* from this origin.
        // Allow scripts + forms + same-origin so his app boots normally.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="clipboard-read; clipboard-write; microphone"
      />
    </div>
  );
}

export default OdysseusVerbatimView;
