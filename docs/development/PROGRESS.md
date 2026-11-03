# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-11-04: D22 only, one agent; offline dataset/adapter implemented, production integration and acceptance OPEN.** Base `3139379` (published D21 foundation), with existing uncommitted D20 drafts preserved in the separate `PrivacyMonitor-presentation` checkout. Original workspace and main README untouched. No commit, push or D23 work.
- Read shared constraints, D22, PROGRESS and relevant source/tests. D21 helper is available and tested, but not loaded by the manifest; stable beta record/context and settings prerequisites remain incomplete. This slice is independent offline groundwork, not acceptance of those prerequisites.
- Added a pinned EasyPrivacy general tracking-server snapshot under [data/trackers](../../data/trackers/NOTICE.md), with GPL-3.0-or-later attribution, original source bytes, revision/hash/date provenance and a reproducible offline extractor. **542 supported domain rules; five unsupported rules excluded explicitly.** No remote code, automatic updates or new transmissions.
- Added [tracker-classifier.js](../../lib/tracker-classifier.js): D21-normalized whole-label matches, bounded local index, source-line evidence, and distinct listed/unknown/invalid/unavailable results. Owner/category remain null. Membership is not proof of tracking, blocking, first/third-party identity or safety. [Contract and limits](../TRACKER_CLASSIFICATION.md).
- **Verification:** 10 focused checks and **187/187 full-suite tests pass**, zero failed/skipped. Reproducible generation, module syntax and existing runtime/manifest/package lint pass. Final link, package and preservation evidence is in [VERIFICATION](VERIFICATION.md#d22-offline-tracker-dataset--2026-11-04).
- **Pending:** native minimum/current Firefox script loading, normalization and packaged local JSON/error handling; D21/D22 consumer/package integration. D09 record migration, D10 legacy cleanup, D13 exclusions, D19 native checks, D20 screenshots and seven inherited Mozilla warnings remain open. D22 files are **not in the shipping ZIP or manifest**; live script counts, scores and permissions are unchanged. **D22 remains partial.**
- **Next exact action:** run `node tests/acceptance-server.mjs`, load the current manifest in a disposable Firefox profile with lookup off, and record A=60, B=0, return A=Incomplete, refresh A=60 in [the D19 follow-up](BETA_ACCEPTANCE.md#d19-provenance-safeguard-follow-up--2026-10-24). Resolve record/context and policy prerequisites before wiring D21/D22 consumers, script order, trusted local JSON loading, package/source-license materials and Firefox checks together. Do not start D23.

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
