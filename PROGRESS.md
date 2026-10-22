# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan/session: shared constraints, D15, prior progress, popup/manifest/preview sources, accessibility tests and packaging tools read. **2026-10-22, D15 only, one agent.** No applicable AGENTS.md or local Git checkout. D13/D14 were published as `938d2f2bd528250b45631d52a8d4bc995922307a`. This commit publishes D15 presentation and icons at the user’s request; native acceptance remains pending.
- Prerequisites/status: D14 implementation and 161 passing tests were present; native acceptance remains open. **D15 implementation is present; acceptance pending, not complete.** The earlier D09/D10/D13 remainder is independent of presentation work and remains unchanged. No D16 work, dependency, permission, version, analysis, storage, consent or network-behavior change.
- Changed: [popup.html](popup.html) adds a dark palette, viewport-fitting width, full hostname/result wrapping, responsive header/metrics, readable line spacing, spaced consent buttons and decorative local header icon. [popup.js](popup.js) replaces the more-breaches inline color with a themeable class. D14 button order, action guards, score names and live regions are preserved.
- Assets/package: three original SVG shield/keyhole icons, 1,131 bytes total, with no external resources. [manifest.json](manifest.json) declares default and light/dark toolbar icons. Local lint verifies icon/image references; the allowlist and package now contain **16 runtime files**. The icon changes do not perform D16's manifest/permission audit.
- Verification: **162/162 tests pass** (`node --test --test-reporter=dot tests/*.test.mjs`), including the added dark text/focus contrast check. Existing D14 and analysis/consent/settings regressions pass. Local lint and package verification pass; all 16 archive entries match source SHA-256. All SVGs parse correctly, have the intended viewBox and contain no active/embedded content.
- Browser evidence: in-app browser inspected all icon variants at 16/32/48/96px on light/dark backgrounds. **18 final local preview cases** passed horizontal-overflow checks: six states in both palettes, plus long content at 160px, 240px and a 320px frame with 200% CSS zoom in both palettes. Scrollbar-adjusted widths were 145/225/305px. Full domains and long unbroken breach text wrap. Keyboard navigation reached the lower actions in the dark 200% fixture with a visible, unclipped focus outline. Theme fixtures force the production media rules; browser APIs and breach data are mocked, with no external lookup. The local server was stopped after verification.
- Pending browser checks: actual Firefox Light/Dark/custom theme selection, toolbar/extensions-menu/add-ons-manager SVG rendering, real popup sizing/scrolling, native zoom and Windows display scaling, high-contrast mode, and D14 screen-reader acceptance. Ctrl+plus had no effect in the in-app browser, so native zoom is **not verified**; CSS zoom is only a simulation. See [POPUP_PRESENTATION.md](docs/POPUP_PRESENTATION.md) for evidence, reproduction and the exact native matrix. No completion claim while these checks are outstanding.
- Preservation/recovery: `checkpoints/pre-d15-2026-10-22.zip` preserves the starting folder, including the unrelated image. `checkpoints/d15-popup-presentation-2026-10-22.zip` preserves this implementation/tests/docs/handoff. Restore into a new directory. Runtime changes are confined to popup presentation, icon declarations/assets and packaging references; other feature logic remains intact.
- Next exact action: load this folder in a disposable Firefox profile using [DEVELOPING.md](docs/DEVELOPING.md). Record Firefox/OS/display-scale versions/settings, then run steps 1–4 of [D15 native checks](docs/POPUP_PRESENTATION.md#native-checks-still-pending): Light/Dark toolbar and popup, long content, native zoom/scrolling, and keyboard focus. Record actual results, fix only reproduced D15 defects, rerun affected checks, and mark D15 complete only after acceptance passes. **Stop before D16.**
- Earlier remainder: D09 needs background-bound content records/refresh, remaining popup-reader migration and removal of legacy writes. D10 then needs old-row cleanup preserving preferences, with retry/idempotence/no-recreation checks. D13 display settings exist, but site exclusions must share one policy across content startup/observers/refresh/password UI, headers, breach requests/cache and legacy popup reads; changes must cancel pending work, remove UI, clear evidence and reject late results. Restart/live settings, two-tab/private/redirect/error cases remain unverified. See [SETTINGS.md](docs/SETTINGS.md). D01–D14 native checks remain open.

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation, partial D09 scan/refresh, partial D10 privacy guards, D11 form resolution, D12 dynamic monitoring, partial D13 display settings, D14 popup accessibility, and D15 presentation/icons are present; automated checks pass. D09 migration, D10 legacy cleanup, D13 site exclusions, and native-browser acceptance remain outstanding.

## Optional allowance calibration

Record manually if useful. Do not include account identifiers or credentials.

| Session | Allowance before/after in the same window | Notes |
| --- | --- | --- |
| D01 | Not recorded | |
| D02 | Not recorded | |
| D03 | Not recorded | |
| D04 | Not recorded | |
| D05 | Not recorded | |
| D06 | Not recorded | |
| D07 | Not recorded | |
| D08 | Not recorded | |
| D09 | Not recorded | Partial: shared scan/refresh; record migration pending |
| D10 | Not recorded | Partial: privacy guards; cleanup waits for D09 |
| D11 | Not recorded | Resolution/fixtures verified; native acceptance pending |
| D12 | Not recorded | Dynamic monitoring verified; native acceptance pending |
| D13 | Not recorded | Partial: display settings verified; exclusions and native acceptance pending |
| D14 | Not recorded | Popup accessibility/keyboard preview verified; Firefox and screen-reader acceptance pending |
| D15 | Not recorded | Themes/icons/reflow verified locally; native Firefox theme/zoom acceptance pending |
