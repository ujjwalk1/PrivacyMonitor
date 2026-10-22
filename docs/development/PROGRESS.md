# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- **2026-10-22: presentation/documentation session, one agent.** Reviewed source, manifest, plan, progress, baseline `8c3b240` and published history through `ce3647a`. This is not a D16+ implementation or acceptance pass.
- Work is in the separate `PrivacyMonitor-presentation` checkout. The original `priv-mon-new` folder's **97 file paths and SHA-256 hashes are unchanged**. Runtime files and GPL-3.0 license are unchanged.
- Changed: product [README](../../README.md), [changelog](../../CHANGELOG.md), [contributor guide](../../CONTRIBUTING.md), [architecture](../ARCHITECTURE.md), [privacy](../PRIVACY.md), [roadmap](../ROADMAP.md), documentation index and local link checker. Plans/progress moved into this development folder with links updated.
- Presentation: [detailed D01–D15 briefing](../presentation/BRIEFING.md), [eight-file VS Code walkthrough](../presentation/VSCODE_WALKTHROUGH.md), [eight-minute demo and ten questions](../presentation/DEMO.md). These are excluded from the 16-file extension package.
- Verification: **162/162 tests pass**, local syntax/manifest references pass, package has **16 byte-verified entries**. Eight localhost fixture routes return HTTP 200; server stopped. See [VERIFICATION.md](VERIFICATION.md) for the final link check and evidence boundaries.
- Status: implementation exists through D15, but **D09/D10/D13 are partial** and full Firefox acceptance is not recorded. D09 still needs navigation-bound content records/readers and removal of legacy writes. D10 then needs targeted old-row cleanup preserving preferences. D13 still needs one site-exclusion policy across producers, UI, cache/network and stale results.
- Pending browser checks: actual install/startup, navigation/tab/private/container cases, consent/restart/service results, dynamic forms/settings, screen reader, native themes/icons/zoom/scaling. Prior D14/D15 mock previews are historical evidence, not native passes.
- **Next exact action:** follow the demo's preparation steps in the separate checkout; temporarily load `manifest.json` into a disposable Firefox profile and record version/startup errors. Reload the dynamic fixture, verify dummy feedback and 0/0 → 1/1 → 0/0 form counts, then refresh/settings. Record real results in [VERIFICATION.md](VERIFICATION.md). Do not mark acceptance complete without those observations; do not start another plan day as part of presentation work.

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
