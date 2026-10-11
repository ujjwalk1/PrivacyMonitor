# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28.
- Session: 2026-10-11, D05 only, one agent. Read shared constraints, D05, prior progress, popup/state/manifest code, related tests and package tooling. No AGENTS.md found. Local folder still has no Git checkout.
- Prerequisites: D01 tooling, D02 scoring, D03 states, and D04 result/timeout handling are present. Their installed-Firefox acceptance remains pending. D05 builds on GitHub main's D04 commit `7d9186ef9154e866286fe35f9fe0ba5b9c63af21`.
- Status: D05 implementation and simulated acceptance pass. **Not complete:** native Firefox consent/persistence/network checks and carried D01–D04 browser checks remain open. No D06 work, new dependencies, or release.
- GitHub handoff: user requested the D05 upload on 2026-10-11. All 28 repository files matched the tested D05 checkpoint before this handoff edit. This commit contains the 15 D05 source/test/documentation files; unrelated repository files are preserved. Checkpoints, build archives, and the unrelated local image stay local.
- Changed: `manifest.json` declares optional `browsingActivity` transmission and required `none` under `browser_specific_settings`, preserving the Gecko ID and MV2. `popup.html` discloses recipient, hostname/IP exposure, trigger, and excluded data, with Enable/Disable controls visible independently of local analysis. `popup.js` checks Firefox consent before each lookup, requests it directly from the click, and revokes it on Disable. Firefox owns the saved choice; missing/failed APIs leave lookup off.
- Cancellation: Disable immediately blocks this popup, aborts pending request/body work, and clears results. Permission-change events invalidate stale reads/results. Failed removal is explicitly reported; this popup stays blocked, and the user must retry or revoke in Firefox before reopening. Previously transmitted data cannot be recalled. Requests omit credentials and referrers.
- Sources: checked [Mozilla's native consent guide](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/), manifest reference, request/remove APIs, and permission-testing guidance on 2026-10-11. [BREACH_CONSENT.md](docs/BREACH_CONSENT.md) records the chosen compatibility approach, sources, and exact pending checks. Older Firefox without native consent keeps local checks and disables breach lookup; no new minimum version is claimed.
- Verification: Node 24.19.0; `node --test tests/*.test.mjs` passes **53/53**, including 12 D05 cases in [breach-consent.test.mjs](tests/breach-consent.test.mjs). Covers fresh open/refresh, approval/denial, persistent browser permission model, unsupported/failed APIs, request data, revoke/disable during fetch/body, late results, stale permission reads, failed removal, and local-score independence. Previous tests now explicitly use a consenting fixture; default test installations start off. No external requests in tests.
- Packaging: local lint passes; `powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1` verifies the same seven extension files and SHA-256 source equality in `dist/privacy-monitor-1.1.zip`. Mozilla lint/release validation remains pending for the assigned manifest/release days.
- Browser preview: in-app browser checked synthetic off → Enable → results → Disable, denied consent, and absent consent support. Local score stayed 100, disclosure wrapped, and captured warnings/errors were empty. Permission APIs and responses were mocked; no real grant or HIBP request occurred. Preview server and tab stopped. A final external-grant “not run yet” wording correction is covered by the added test; real Firefox event/prompt behavior remains unverified.
- Scope preserved: scoring, header/form/content scans, stored observations, broad host/API permissions, and the existing refresh scanner/delay. Consent does not fix the D07–D10 storage/navigation/private-session limitations. README and guides now describe D05.
- Recovery: `checkpoints/pre-d05-2026-10-11.zip` preserves pre-session files including the unrelated image. `checkpoints/d05-breach-consent-2026-10-11.zip` preserves the new source/tests/docs/handoff. Earlier checkpoints remain local; restore into a new directory.
- Next exact action: temporarily load root `manifest.json` in a disposable Firefox profile and run [the D05 browser checklist](docs/BREACH_CONSENT.md#verification-and-pending-browser-checks). With the extension network inspector open, verify zero HIBP requests before consent and after denial/Disable/reopen, the native approval prompt and saved grant, and cancellation on `about:addons` revocation. Use a non-sensitive test page; record Firefox version, request counts, console errors, and pass/fail here. Check installation prompts separately using Mozilla's linked instructions. Resolve D01–D05 browser acceptance before marking complete or starting D06.

## Completed tasks

None with full Firefox acceptance yet. D05 code, simulated checks, and mocked UI review pass; native-browser acceptance is outstanding.

## Optional allowance calibration

Record manually if useful. Do not include account identifiers or credentials.

| Session | Allowance before/after in the same window | Notes |
| --- | --- | --- |
| D01 | Not recorded | |
| D02 | Not recorded | |
| D03 | Not recorded | |
| D04 | Not recorded | |
| D05 | Not recorded | |
