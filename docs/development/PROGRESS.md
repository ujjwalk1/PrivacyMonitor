# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-11-02: D21 only, one agent; isolated foundation implemented, integration/acceptance OPEN.** Base `1cef861` plus preserved uncommitted D20 drafts in the separate `PrivacyMonitor-presentation` checkout. Original workspace and main README untouched; no push or D22 work.
- Read shared constraints, D21 and prior handoff; inspected hostname counting, record/consent prerequisites, manifest/package paths and test helpers. Stable beta records/policy and native D01–D20 acceptance remain incomplete. This explicit D21 request permits an independent tested foundation, not accepting those prerequisites or modifying live behavior.
- Added [shared matching module](../../lib/site-domains.js) with canonical hostname/HTTP-URL descriptors and same-host/same-site/cross-site/unknown/unavailable comparisons. Uses pinned local tldts **7.4.19**, including ICANN and PRIVATE suffix rules. No network/storage or owner/tracker inference. Unknown boundaries remain unknown.
- Added unchanged upstream UMD bundle, complete embedded-source map, MIT notice and [provenance](../../vendor/tldts/NOTICE.md). Archive SHA-512 verified before copying; tests check individual hashes. Dependency is **not loaded by the manifest or included in the current ZIP**. Existing script counts, scores, HIBP inputs, permissions and the D20 package stay unchanged.
- Verification: **177/177 tests pass** (seven new cases with 40 hostname/comparison fixture rows plus negative/URL/failure checks); module/vendor syntax and existing local runtime lint pass. [Contract and integration boundary](../SITE_DOMAINS.md) documents scheme/port semantics, private suffixes, IDNs, local/IP handling and limitations. Final links/package/preservation evidence is in [VERIFICATION.md](VERIFICATION.md).
- **Pending:** production consumer integration and minimum/current native Firefox loading/normalization checks. D09 migration, D10 cleanup, D13 exclusions, D19 native guard checks, D20 screenshots and seven previously recorded Mozilla warnings remain open. D20 draft release files are preserved, not replaced. **D21 is not complete.**
- **Next exact action:** resume beta acceptance with `node tests/acceptance-server.mjs`, load the current manifest in a disposable Firefox profile with lookup off, and record A=60, B=0, return A=Incomplete, refresh A=60 in [the D19 follow-up](BETA_ACCEPTANCE.md#d19-provenance-safeguard-follow-up--2026-10-24). Resolve the record/policy prerequisites, then continue D21 by choosing its production consumer and adding script order, package notices and native integration checks together. Do not start D22.

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
