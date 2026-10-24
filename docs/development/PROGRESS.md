# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-10-24: D19 only, one agent; focused safeguard implemented, acceptance OPEN.** Base `a9dc1f5` plus preserved D17/D18 work in the separate `PrivacyMonitor-presentation` checkout. Original `priv-mon-new` untouched. No D20 work; see the subsequent publication checkpoint below.
- Read shared constraints, D19, PROGRESS and the D18 matrix; traced content writes, popup loads/refresh, header identity and test fixtures. D09 full content-record migration, D10 legacy cleanup, D13 exclusions and earlier native checks remain unfinished. The explicit D19 request permits this bounded repair; it does not accept those prerequisites.
- Reproduced the highest-priority D18 concern in the real popup code with mocked browser APIs: another document's saved forms produced **80** instead of rejecting the mixed evidence. The new regression file initially had **4 failures / 1 pass**. This was not a native Firefox reproduction.
- Added a per-document random marker to saved summaries and an authenticated read-only identity reply. The popup validates identity before/after loading and rejects untagged, foreign or unverifiable summaries. Identity changes during loading also invalidate headers. Refresh can restore the current document's findings; private/unknown tabs request no identity or shared summaries. No new permission/dependency, score change, remote request or sensitive URL storage.
- Bounded result: same-host tabs still overwrite shared storage, but cannot supply another document's content to the score. The affected tab shows **Incomplete** until refreshed. Full per-tab availability/migration remains for a later D19 follow-up; this is not full isolation.
- Verification: **170/170 tests pass**, including eight new regression/producer cases; local syntax/manifest-reference lint passes; rebuilt package has **16 entries with source-matching SHA-256 hashes**. Documentation and whitespace checks are recorded in [VERIFICATION.md](VERIFICATION.md).
- **Pending Firefox acceptance:** page A/B, refresh recovery, same-URL reload/navigation during loading, HTTP token generation, unavailable/outdated receiver and private/unknown contexts. D18's native automation stopped because browser URL policy enforcement was unsupported for this Windows browser; no bypass or new native pass is claimed. Earlier matrix rows and D16 rendering warnings remain open. **D19 is not complete.**
- **Next exact action:** run `node tests/acceptance-server.mjs` in this checkout; manually load/reload its manifest in a disposable Firefox profile with breach lookup off, and reload both fixtures. Open page A (expected **60**), then B in another tab (expected **0**), return to A without refresh (expected **Incomplete**, never mixed **40**), then Refresh Analysis on A (expected **60**, zero insecure password forms). Record actual version/results in [the D19 follow-up](BETA_ACCEPTANCE.md#d19-provenance-safeguard-follow-up--2026-10-24). Continue a focused D19a if needed; do not start D20.

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
