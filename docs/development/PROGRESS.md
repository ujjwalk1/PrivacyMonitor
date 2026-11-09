# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-11-09: D29 only, one agent; bounded header-value evaluator implemented, acceptance OPEN.** Base `02896db` plus existing uncommitted D28 work in the separate `PrivacyMonitor-presentation` checkout. Original workspace, README, D28 files and unrelated D20 work preserved. No commit, push or D30.
- Read shared constraints, D29, PROGRESS and the live header producer, strict D07 record contract, popup projection/rendering, scoring, lifecycle tests and packaging. Prerequisite finding: the live path retains presence only; semantic findings require coordinated record/message, producer, display and scoring migration. That integration is outside this completed safe portion.
- Added [header-policy evaluator and contract](../HEADER_POLICIES.md), `lib/header-policies.js`, 64 positive/negative fixtures and focused tests. Evaluates HSTS lifetime/syntax/applicability, nosniff first-token behavior and all eight referrer policies with exposure facts. Disabled, invalid, permissive, absent, not-applicable and unavailable are distinct. No raw values, sensitive URLs, network calls or storage.
- **Verification:** 72 focused tests and all **340 full-suite tests passed**. New syntax, existing runtime/manifest/reference lint and documentation links pass. Source hashes confirm every pre-existing file was unchanged before this handoff update. See [VERIFICATION](VERIFICATION.md#d29-header-policy-values--2026-11-09).
- **Pending:** record/producer/popup/score integration, manifest/package activation and native Firefox acceptance. The live popup and score still reward header presence; this limitation is NOT fixed in the shipped path. D29 remains partial and unshipped. Earlier D28 and beta acceptance gaps remain open.
- **Next exact action:** extend `analysis-records.js` header schema/validation and contract tests for bounded findings, then integrate the evaluator into `background.js` without weakening D08 navigation correlation. Coordinate the message version, popup readers/rendering and score handling of unavailable/not-applicable states; update package references and run controlled Firefox cases listed in [HEADER_POLICIES](../HEADER_POLICIES.md#verification-and-remaining-integration). Complete D29 acceptance before starting D30.

## D28-D29 publication scope — 2026-11-09

The requested GitHub publication contains the isolated cookie inspector, header-value evaluator, fixtures, tests and their documentation. Both days remain partial pending production integration and native Firefox acceptance. README (including future improvements), runtime manifest/package and unrelated D20 drafts are excluded from this change. The next implementation action remains the D29 contract migration above.

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
| D26 | Not recorded | Partial: request capture permission/lifecycle foundation; 242 tests pass; on-demand scan, integration and native acceptance pending |
| D27 | Not recorded | Partial: optional cookie metadata collector; 256 tests pass; production and native store/partition acceptance pending |
| D28 | Not recorded | Partial: read-only cookie inspector; 268 tests pass; native Firefox and production integration pending |
| D29 | Not recorded | Partial: isolated header-value evaluator; 340 tests pass; record/popup/score integration and native Firefox acceptance pending |
