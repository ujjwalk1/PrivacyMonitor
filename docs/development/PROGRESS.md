# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-11-04: D24 only, one agent; observed-request classification implemented in isolation, production/native acceptance OPEN.** Base `90d641a` plus preserved uncommitted D23 work and D20 drafts in the separate `PrivacyMonitor-presentation` checkout. Original workspace and main README untouched. No commit, push or D25 work.
- Read shared constraints, D24, PROGRESS, D07 record contract/source, D21 normalization, D22 adapter/data, D23 capture, manifest and test/package tooling. D21–D23 are available for an independent integration slice, but stable beta record/settings prerequisites, D23 compatibility and native acceptance remain open.
- Added [request-analysis.js](../../lib/request-analysis.js): reads D23 by the trusted record's tab/document identity, applies D21 site comparison and D22 list evidence, and distinguishes first-party, unclassified third-party, known-tracker matches, unknown and unavailable. Party and list status remain separate; owner/category are null. No unobserved hosts are classified.
- Canonical hostname grouping combines resource types; duplicate cumulative hostname/type rows retain their maximum count rather than summing. Repeated reads do not accumulate state. D23 coverage/truncation/saturation are preserved; input is bounded to 256 rows and 65,535 events per pair. [Contract, semantics and pending native procedure](../REQUEST_ANALYSIS.md).
- **Verification:** **14 focused tests and 217/217 full-suite tests pass**, zero failed/skipped. Includes actual D07/D21/D22/D23 modules with simulated browser events, stale/two-tab/private handling, deduplication and unavailable dataset/ownership/category checks. New syntax and existing runtime/manifest lint pass; final links/package/preservation evidence is in [VERIFICATION](VERIFICATION.md#d24-observed-request-classification--2026-11-04).
- **Pending:** native Firefox classification and D23 document-ID compatibility; production bootstrapping, identity/access lifecycle, consumer and package/notices. The new module is **outside the manifest and shipping ZIP**. D09 migration, D10 cleanup, D13 exclusions, D19 native checks, D20 screenshots and seven inherited Mozilla warnings remain open. **D24 remains partial.**
- **Next exact action:** start `node tests/acceptance-server.mjs`; load the checkout manifest in a disposable Firefox profile with lookup off. Follow [D23 capture setup](../REQUEST_CAPTURE.md#pending-firefox-procedure), then [D24 continuation](../REQUEST_ANALYSIS.md#pending-firefox-continuation) to load local classifier/data, classify the real current page-B record and verify repeated-read, tab/document and unavailable behavior. Record actual results before production integration. Do not start D25.

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
