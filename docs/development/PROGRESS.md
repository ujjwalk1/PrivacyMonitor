# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-11-08: D27 only, one agent; isolated cookie metadata reader implemented, acceptance OPEN.** Base `436f2e9` plus preserved uncommitted D26 and D20 work in the separate `PrivacyMonitor-presentation` checkout. Original workspace and README untouched. No commit, push or D28.
- Read shared constraints, D27, PROGRESS, manifest, D07 records, D21 matching, D26 access policy and existing permission documentation. Optional cookies access, shared product controls and native isolation acceptance are missing; this bounded slice remains outside the live manifest/ZIP.
- Added [cookie-metadata.js](../../lib/cookie-metadata.js): explicit optional-cookie gesture request, independent host permission checks, active normal tab/current-record validation, exact store and selected unpartitioned/top-level-site queries. Cookie names/values/paths are not read or copied; output contains bounded metadata only. [Scope and limitations](../COOKIE_METADATA.md).
- Legacy first-party-isolation cookies and third-party frame domains are excluded explicitly. Up to 256 metadata rows, one pending read, no result cache/storage/network. Revocation, navigation, tab/window changes and final permission/identity checks reject stale work. Unavailable never becomes zero cookies.
- **Verification:** 14 focused tests and 256 full-suite tests pass; new syntax, local runtime lint and documentation links pass. Tests use actual D07/D21 with browser mocks and throwing cookie-secret getters. Mozilla cookie scope/partition documentation checked; no native Firefox results claimed. See [VERIFICATION](VERIFICATION.md#d27-cookie-metadata-collection--2026-11-08).
- **Pending:** real permission dialogs, store/container/partition/FPI coverage checks, private and revoked access, production consent/access/UI transport and package integration. Earlier beta gaps and D26 integration remain open. **D27 is partial and unshipped.**
- **Next exact action:** prepare the disposable temporary-extension copy in [the native procedure](../COOKIE_METADATA.md#verification-and-next-exact-action), with optional cookies, D21/D27 helpers, current D07 records and a real permission button. Run the local acceptance server with synthetic cookies and verify denied/granted/revoked and container/partition behavior in Firefox. Record results before enabling production. Do not start D28.

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
