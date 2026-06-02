# Acknowledgments

elizaOS builds on, vendors, or embeds open-source work from other projects.
This file credits those projects and notes their licenses. If something here is
mis-attributed or missing, please open an issue.

---

## Odysseus — embedded verbatim

**[Odysseus](https://github.com/pewdiepie-archdaemon/odysseus)** by
**PewDiePie** (github.com/pewdiepie-archdaemon). Copyright © the Odysseus
Contributors. **MIT License.**

`@elizaos/plugin-odysseus-verbatim` embeds the Odysseus web UI **verbatim** —
his `index.html`, JavaScript, CSS, and fonts are vendored and served
**byte-for-byte unmodified**, running unchanged inside an iframe in the elizaOS
app shell. None of his UI is rewritten; all credit for it is his.

- Vendored copy: `plugins/plugin-odysseus-verbatim/vendor/odysseus/`
- His license (retained): `plugins/plugin-odysseus-verbatim/vendor/odysseus/LICENSE`
- His upstream credits (retained): `plugins/plugin-odysseus-verbatim/vendor/odysseus/ACKNOWLEDGMENTS.md`
- Source commit pinned in: `plugins/plugin-odysseus-verbatim/vendor/odysseus/VENDORED_FROM.txt` (`f6b0dcb`)

Odysseus itself stands on additional open-source work (opencode, llmfit, Tongyi
DeepResearch, SearXNG, and others) — see his retained `ACKNOWLEDGMENTS.md` for
that full credit chain.
