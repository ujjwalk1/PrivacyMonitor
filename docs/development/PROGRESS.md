# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-11-05: D25 only, one agent; isolated request details view implemented, production/native acceptance OPEN.** Base `15a3968` in the separate `PrivacyMonitor-presentation` checkout. Preserved D20 drafts/contributor changes, original workspace and main README. No commit, push or D26 work.
- Read shared constraints, D25, PROGRESS, D07/D21–D24 source/contracts, popup, manifest and test/package tooling. D21–D24 support a bounded standalone view, but their production integration, D23 document-ID compatibility and beta record/settings prerequisites remain open.
- Added [details view and read-only source](../REQUEST_DETAILS.md): each observed domain shows activity, classification, site relationship, evidence and dataset retrieval date. Owner/category remain unknown. Capture limits and unavailable/no-observation states are explicit; no blocking or safety claims.
- The controller requires an explicit target tab, clears stale results on navigation/closure/permission removal/hiding, and guards delayed reads. Native refresh/disclosure controls and text-only bounded rendering are covered by tests. Added an explicitly synthetic loopback preview.
- **Verification:** **13 focused tests and 230/230 full-suite tests pass**, zero failed/skipped. New script syntax and existing runtime/manifest lint pass. Local in-app browser preview verified evidence expansion, keyboard collapse, refresh, narrow dark layout/long-domain wrapping, limits and empty/unavailable states. Details in [VERIFICATION](VERIFICATION.md#d25-request-details-view--2026-11-05).
- **Pending:** real Firefox capture-to-view, lifecycle/private/context access, light theme/zoom/screen reader, production setup/entry point and packaging. New files remain **outside the manifest and shipping ZIP**. D09 migration, D10 cleanup, D13 exclusions, D19 native checks, D20 screenshots and seven inherited Mozilla warnings remain open. **D25 remains partial.**
- **Next exact action:** start `node tests/acceptance-server.mjs`; use a disposable Firefox profile with lookup off and temporarily load the checkout manifest. Follow [D25 native procedure](../REQUEST_DETAILS.md#pending-firefox-procedure), including the linked D23/D24 setup, open details for the actual page-B tab ID and record real capture/refresh/navigation/private/closure results. Resolve prerequisites before enabling production integration. Do not start D26.

## Publication checkpoint — 2026-10-24

The requested D18–D19 publication includes the existing D17 privacy/attribution updates, D18 controlled fixtures and acceptance matrix, and D19 document-provenance safeguard. Product documentation stays at the repository front; internal acceptance evidence stays under docs/development. The changelog describes user-visible behavior without claiming release acceptance. Manual Firefox checks, full content isolation and the recorded earlier blockers remain open after publication.

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation, partial D09 scan/refresh, partial D10 privacy guards, D11 form resolution, D12 dynamic monitoring, partial D13 display settings, D14 popup accessibility, D15 presentation/icons, the D16 manifest audit, and D17 privacy/product documentation are present; behavioral tests and local checks pass, but strict Mozilla lint still reports inherited warnings. D09 migration, D10 legacy cleanup, D13 site exclusions, and native-browser acceptance remain outstanding. D19 adds a verified document-provenance safeguard, with native acceptance still open.

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
| D16 | Not recorded | Manifest audit implemented; seven inherited validator warnings and native acceptance pending |
| D17 | Not recorded | Source-aligned privacy/product documentation and attribution added; native notice checks pending |
| D18 | Not recorded | Matrix and fixtures added; 162 tests pass and temporary installation confirmed; native interaction blocked by browser policy |
| D19 | Not recorded | Partial: provenance guard; 170 tests pass; full isolation and native acceptance pending |
| D20 | Not recorded | Partial: unsigned package and submission drafts; strict lint warnings, native checks and screenshots remain open |
| D21 | Not recorded | Partial: isolated PSL-aware foundation; 177 tests pass; production integration/native acceptance pending |
| D22 | Not recorded | Partial: 542-domain offline dataset/adapter; 187 tests pass; integration/native acceptance pending |
| D23 | Not recorded | Partial: bounded document-aware collector; 203 tests pass; Firefox compatibility/integration acceptance pending |
| D24 | Not recorded | Partial: observed-request classification; 217 tests pass; production/native acceptance pending |
| D25 | Not recorded | Partial: separate request details view; 230 tests pass; production/native acceptance pending |
