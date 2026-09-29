# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: DAILY_PLAN.md, prepared 2026-09-28.
- Last completed development task: none with full Firefox acceptance. D01 tooling, D02 scoring, and D03 popup states are implemented; their Firefox checks remain open.
- Session: 2026-09-29, repository organization and README follow-up, one agent. Read the shared constraints, D01–D03 entries, handoff, existing guides, and relevant source/tooling. No AGENTS.md found. No new dependencies, release, or D04 work.
- Status: D03 implementation, state-mapping tests, and manual wording review in mocked browser previews pass. Full completion remains pending installed-Firefox checks and carried D01/D02 acceptance.
- Changed: `popup-state.js` maps page/observation states; `popup.js` and `popup.html` explicitly render loading, incomplete, unavailable, and unsupported pages. Partial observations remain visible; missing fields stay neutral instead of zero/clean. Form, connection, header, and breach wording is limited to observed evidence. Old banners/scores clear on reload and superseded async results are ignored.
- Necessary prerequisite: HTTP breach failures now return null, and malformed result shapes display unavailable. D04 still needs distinct failure outcomes and a timeout; it is not complete. Existing hostname storage, injected refresh scan/delay, consent behavior, and D02 score weights remain unchanged.
- Verification: Node 24.19.0, `node --test tests/*.test.mjs`: 32/32 pass. Includes original smoke/scoring tests and new state, partial/invalid record, unsupported URL, tab/storage error, refresh failure, stale-response, and breach display checks. `tests/helpers/popup.mjs` shares the mock popup harness. No external requests in tests.
- Packaging: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1` passes local lint and verifies exactly seven files in `dist/privacy-monitor-1.1.zip`, each SHA-256 matching source. `tools/extension-files.json` includes the state mapper; fixtures/docs/checkpoints are excluded. Mozilla lint remains a later check.
- Manual review: real popup HTML/scripts rendered with synthetic API data via `tests/popup-preview.mjs` and `tests/fixtures/popup-preview.js`. Reviewed all eight fixture texts; inspected loading/incomplete, partial/unavailable, ready and unsupported screenshots. Keyboard activation of Refresh changed ready/100 to unavailable/dash. Saved `checkpoints/d03-unavailable-preview.png`. Preview logged one MutationObserver error with no source location; no matching use exists in popup files. Installed-Firefox console verification remains pending. Preview server stopped after review.
- Documentation organization: moved the development, scoring, and popup-state guides into `docs/`; updated navigation and the scorer's documentation comment. Rebuilt `README.md` with D01–D03 additions, accurate score/breach behavior, setup/check commands, repository layout, limitations, and pending acceptance. Extension entry points, tests, and tools retain their paths; executable behavior is unchanged. The daily plan, license, unrelated image, and earlier checkpoints are preserved.
- Follow-up verification: all 32 tests pass again; local lint and the seven-file ZIP/hash check pass. Documentation links and moved-guide anchors resolve. No new browser session was run for this documentation-only follow-up; the earlier preview and pending Firefox results above still apply.
- Recovery: `checkpoints/pre-repo-organization-2026-09-29.zip` saves the files before reorganization. Earlier D01–D03 archives and the original hash list remain local. Extract into a new directory.
- GitHub follow-up: D03 is on `ujjwalk1/PrivacyMonitor` main at `5bf81404145c3b8733bf197ce7da90e3b2836661`. The user requested this documentation organization on the same repository; the update builds on that commit and preserves unrelated remote files. Generated ZIPs, screenshots, checkpoints, and the unrelated image remain local. Working folder still has no `.git`; synchronization uses the GitHub connection.
- Pending browser checks: installed Firefox loading/startup console, normal page popup/refresh, password feedback and HTTP form warning (D01); scorer and breach independence (D02); real loading/incomplete/unavailable/unsupported display and scrolling, denied refresh, no stale success or console errors (D03).
- Next exact action: load the current `manifest.json` through `about:debugging` in a disposable Firefox profile. Run [the development checklist](docs/DEVELOPING.md#load-and-check-in-firefox) plus the checks in [the scoring guide](docs/SCORING.md) and [the popup-state guide](docs/POPUP_STATES.md), including an ordinary page, `about:config`, absent scan records, and denied refresh. Record version, fixture/page, errors, and pass/fail results here. Use non-sensitive pages because the existing analyzed-page lookup sends hostnames to HIBP. Resolve failures before closing D01–D03 or starting D04.

## Completed tasks

None yet. Use one short entry per completed task: ID, behavior delivered, and verification result.

## Optional allowance calibration

Record manually if useful. Do not include account identifiers or credentials.

| Session | Allowance before/after in the same window | Notes |
| --- | --- | --- |
| D01 | Not recorded | |
| D02 | Not recorded | |
| D03 | Not recorded | |
