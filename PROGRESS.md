# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28.
- Session: 2026-10-20, **D08 only**, one agent. Read shared constraints, D08, prior handoff, relevant background/popup/store sources, manifest, tests, and packaging. No applicable AGENTS.md or local Git checkout found. GitHub baseline is D07 commit `3fc13bb47882bfcaf256879be1697e7239a55433`. The user requested the D08 upload on 2026-10-20; this commit contains the 18 D08 source/test/documentation files. All 38 repository files matched the tested D08 checkpoint before this handoff edit. Unrelated repository content is preserved; checkpoints, build archives, and the local image stay local.
- Prerequisites: D07's record/message contract and D01–D07 code/tests are present. Their native Firefox acceptance remains pending. The explicit D08 request proceeded with those limits recorded; no earlier browser acceptance is assumed.
- Status: D08 implementation and automated checks pass. **Not complete:** native Firefox event ordering, permission compatibility, and lifecycle acceptance below remain outstanding. No D09 work, release, dependency upgrade, or version change.
- Changed: [background.js](background.js) now correlates main-frame requests, redirect hops, response headers, and committed navigation before updating the per-tab record. Navigation clears old observations, errors discard evidence, and tab closure/replacement releases state. Request IDs/timestamps, generation/object checks, and transient resource digests reject stale work; both record and coordinator capacity are bounded to 256 tabs. Records retain presence states and browser context, never raw header values or full URLs. Missing/uncertain capture stays unknown; malformed/304 responses are unavailable.
- Integration: [manifest.json](manifest.json) adds `webNavigation` for navigation boundaries. The popup reads headers through the D07 v1 message contract and validates the response, then projects presence states for the existing scorer/renderer. New `headers_<hostname>` writes and reads are removed. Existing rows remain untouched for D10. Connection/form/privacy scans and refresh still use legacy paths until D09; the whole popup is not yet isolated by navigation. Breach consent/cache behavior is unchanged.
- Documentation: [HEADER_LIFECYCLE.md](docs/HEADER_LIFECYCLE.md) records correlation rules, conservative cases, migration limits, checked Mozilla references, and the exact native checklist. README, record contract, popup-state notes, and development guide reflect D08.
- Verification: `node --test --test-reporter=dot tests/*.test.mjs` passes **93/93**, including 15 [D08 tests](tests/header-navigation.test.mjs). Covered: same-host tab/context isolation, same-/cross-host redirects, same-URL reload, path/query/fragment matching, delayed old events/digests, completion/commit order, unsupported/error/cache-restoration cases, malformed/304 headers, capacity, tab removal/replacement, and missing/invalid/superseded popup replies. Mocked header capture writes nothing to storage and makes no external requests. Preview fixture syntax passes. Packaging runs local lint successfully and verifies all **10 runtime files** against source SHA-256.
- Browser checks: **not performed this session**. Still pending: installed Firefox startup with `webNavigation`, actual cross-API/redirect/cache ordering, two-tab isolation, private/container metadata, delayed network responses, navigation failures, tab-close cleanup, and popup/background consoles. No new visual-preview result or minimum Firefox version is claimed. Carry D01–D07 native checks forward.
- Recovery: `checkpoints/pre-d08-2026-10-20.zip` preserves the session baseline, including the unrelated image. `checkpoints/d08-header-lifecycle-2026-10-20.zip` preserves D08 source/tests/docs/handoff. Earlier archives stay local; restore into a new directory. Build archives/checkpoints/image remain outside the runtime package.
- Next exact action: load root `manifest.json` in a disposable Firefox profile, keep breach lookup off, and run [D08's native checklist](docs/HEADER_LIFECYCLE.md#native-firefox-acceptance-pending). Begin with two same-host fixture responses having different CSP presence; compare popup results and `PrivacyMonitorAnalysisStore.get(tabId)`. Then exercise redirect targets, same-URL reload with changed headers, delayed responses after navigating away, errors, history/cache, and tab closure. Record Firefox version, fixture/event sequence, console errors, and pass/fail here. Fix reproduced D08 failures and resolve its acceptance before marking complete. **Stop before D09.**

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation is present and automated checks pass. Native-browser acceptance remains outstanding.

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
