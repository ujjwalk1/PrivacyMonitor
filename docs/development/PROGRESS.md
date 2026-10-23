# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-10-23: D16 only, one agent; implementation present, acceptance OPEN.** Starting checkout was clean at `b6c5e1ed82887e1f5ecb934305cf87c3cb156285`. Work remains in the separate `PrivacyMonitor-presentation` checkout; original `priv-mon-new` files were not modified. The follow-up GitHub push is explicitly authorized; product wording and an unreleased changelog entry accompany these changes. No signing, release publication or D17 implementation.
- Changed: [manifest](../../manifest.json) removes unused `cookies`/`scripting` and redundant `activeTab`, restricts content matches to HTTP/HTTPS, sets minimum Firefox desktop **142.0**, and preserves MV2, version 1.1 and existing ID. [Manifest audit](../MANIFEST.md) explains API evidence, broad continuous access, minimum-version tradeoff and reproducible Mozilla validation. Updated only directly affected permission/setup/roadmap documentation.
- Prerequisites: inspected the shared plan, progress, manifest and actual API consumers. Earlier unfinished D09/D10/D13 work does not prevent this manifest-only slice and was not modified. Runtime JavaScript and the package allowlist are unchanged.
- Verification: **162/162 existing tests pass**, local syntax/manifest references pass, **16 package entries match source SHA-256**. Mozilla web-ext **10.8.0** / addons-linter **10.14.0** recognizes minimum 142.0: **0 errors, 0 notices, 7 pre-existing HTML-rendering warnings**. Baseline comparison confirms the same seven warning locations; no D16 warning added. Ordinary lint passes; strict warnings-as-errors acceptance remains outstanding. Node **24.22.1**. Final documentation-link result is recorded in [verification](VERIFICATION.md).
- Pending: native temporary installation/startup on minimum 142 and current Firefox, HTTP/HTTPS tab access and refresh after permission removal, no file-page injection, restricted-page states, settings and native breach-consent grant/revoke. Installed executable reports **158.0.1**, but no native test was performed. The seven rendering warnings require focused review/remediation before a strict lint pass. **D16 is not marked complete.**
- Earlier gaps remain: D09 navigation-bound content/readers and legacy-write removal; D10 targeted old-row cleanup after migration; D13 site exclusions; full Firefox acceptance through D15. Historical presentation files remain under [presentation](../presentation/BRIEFING.md).
- **Next exact action:** in the separate checkout run `node tests/popup-preview.mjs`; temporarily load that checkout's `manifest.json` in a disposable Firefox profile, record version/startup errors, reload `http://127.0.0.1:4179/dynamic-forms.html`, then verify the actual popup's tab access, 0/0 → 1/1 → 0/0 form counts and Refresh Analysis. Follow the remaining [D16 browser checklist](../MANIFEST.md#pending-browser-acceptance), record observations, then address the seven named warning sites in a bounded D16 follow-up. Do not start D17 until outstanding acceptance is resolved.

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation, partial D09 scan/refresh, partial D10 privacy guards, D11 form resolution, D12 dynamic monitoring, partial D13 display settings, D14 popup accessibility, D15 presentation/icons, and the D16 manifest audit are present; behavioral tests and local checks pass, but strict Mozilla lint still reports inherited warnings. D09 migration, D10 legacy cleanup, D13 site exclusions, and native-browser acceptance remain outstanding.

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
