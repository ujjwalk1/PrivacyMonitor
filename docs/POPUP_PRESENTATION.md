# Popup presentation and icons — D15

Implemented 2026-10-22. **Native Firefox acceptance remains pending; D15 is not complete.**
This slice changes popup presentation and local icon assets. It preserves D14's
headings, button order, unavailable-action guards, score semantics and live regions.
Analysis, settings, consent, network behavior, permissions and version are unchanged.

## Changes

- The popup keeps its 320px preferred width but fits the available content width,
  including space occupied by a vertical scrollbar. The header and metrics wrap
  when needed. Full hostnames, long breach names/classes, counts and status messages
  wrap instead of being clipped or causing horizontal scrolling.
- Light styling is retained; a `prefers-color-scheme: dark` palette covers cards,
  metrics, pills, warnings, breach text, buttons, spinners and focus outlines. The
  browser's exposed color preference selects the palette; no preference is saved.
- Consent buttons now have spacing, readable padding and theme colors. Unavailable
  consent actions also have dashed borders. All four native buttons remain focusable
  in the D14 order. Cache notes and settings errors have consistent inner spacing.
- Three original local SVGs use a simple shield/keyhole drawing under the project's
  GPL-3.0 license: `icon.svg` (433 bytes), `icon-light.svg` (349 bytes), and
  `icon-dark.svg` (349 bytes), **1,131 bytes total**. They contain only vector geometry,
  with no scripts, fonts, embedded images or remote resources. No image generator,
  asset download, dependency or branding project is involved.
- The default icon is declared at 48/96px for the extension and 16/32px for the
  toolbar. Theme icons supply light artwork for toolbars using light text and dark
  artwork for toolbars using dark text. The popup's dark header uses the light SVG
  as a decorative image with empty alternative text.
- Local lint checks manifest icon/theme-icon and popup-image references against the
  allowlist. The package includes **16 runtime files**, up from 13.

## Verification performed

- **162/162 tests pass**, including D14 behavior checks and an added dark-palette
  contrast check. Tested author text colors meet 4.5:1 and focus outlines meet 3:1
  against their adjacent surfaces. Theme contrast tests include warnings, pills,
  breach cards and consent/refresh hover/unavailable states.
- Local lint passes. Packaging verifies all 16 files against source SHA-256 hashes.
  All three SVGs parse as XML with the intended viewBox and no active/embedded content.
- In-app browser inspection verified default/light/dark artwork at 16, 32, 48 and
  96px on light and dark backgrounds. All images loaded; icons were visually distinct.
- The final browser fixture matrix covered **18 cases**: ready, warnings, partial,
  long content, unsupported and loading in each palette; plus long content at 160px,
  240px and a 320px frame with 200% CSS zoom in each palette. Frame height was 600px.
  Document scroll width equaled available width in every case; no visible content
  element had horizontal overflow. Available widths with scrollbars were 145, 225
  and 305px. Long hostnames and unbroken breach text remained fully present.
- Keyboard navigation scrolled the dark 200% zoom fixture to the lower actions.
  Refresh remained visible with an unclipped 3px light-blue outline and 2px offset.
  Screenshots were inspected for icon legibility, dark layout, wrapping and focus.

The fixtures force the production dark/light media rules through their local server;
they do not change system preferences. **CSS zoom is a simulation, not native Firefox
zoom.** The in-app browser's Ctrl+plus shortcut did not change its viewport or pixel
ratio, so it is not recorded as a successful native zoom check. Browser APIs and
breach responses are mocked; no real consent request or external lookup occurred.

## Reproduce the preview

Run `node tests/popup-preview.mjs`, then open
`http://127.0.0.1:4179/presentation.html`. Stop the server with Ctrl+C afterward.
The page offers theme/state previews, small-icon samples, narrow frames and the
200% CSS zoom simulation. Standalone previews accept `theme=light` or `theme=dark`;
omit that parameter to exercise the browser's current color preference. Only the
test server applies these overrides; production has no preview parameters.

## Native checks still pending

Load this folder in a disposable Firefox profile using [DEVELOPING.md](DEVELOPING.md).
Record Firefox version, OS, display scaling, theme, zoom setting and exact results.

1. In Firefox Light and Dark themes, inspect the toolbar icon, extensions menu,
   add-ons manager and popup. Verify the appropriate toolbar artwork is selected,
   the SVG scales cleanly and actual popup colors follow the exposed preference.
   Include a custom theme or OS high-contrast mode if available; author-color tests
   do not establish their behavior.
2. Check ordinary and long hostnames, long breach records/classes, warnings, partial
   data, loading and unavailable states. Use synthetic data where needed, without
   enabling real breach lookup merely to test layout.
3. Inspect the actual popup at default and enlarged Firefox zoom (including 200%
   where supported) and Windows display scaling. Verify no horizontal clipping,
   full text availability, vertical scrolling, and access to both lower buttons.
   Record any Firefox popup zoom limitations explicitly instead of substituting
   page zoom or the CSS fixture for native acceptance.
4. Tab/Shift+Tab through all four controls at each relevant size/theme. Confirm
   focus stays visible while scrolling and no label, score or status becomes unreadable.
   Carry forward [D14 screen-reader and focus checks](POPUP_ACCESSIBILITY.md).
5. Fix only reproduced D15 presentation defects, rerun affected checks and record
   evidence before marking D15 complete. Stop before D16's manifest/permission audit.

Earlier D09 migration, D10 legacy cleanup and D13 site exclusions remain unfinished.

## Icon references checked on 2026-10-22

Mozilla documents SVG viewBox/sizing in
[manifest icons](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons),
and default/theme toolbar icon selection in
[browser_action](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action).
Only icon wiring was changed here; minimum-version and permission auditing remain D16.
