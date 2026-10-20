# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28.
- Session: 2026-10-13, D07 only, one agent. Read shared constraints, D07, prior handoff, background/popup-state/content sources, manifest, tests, and packaging. No applicable AGENTS.md or local Git checkout found. D07 builds on published D06 commit: `d51d866ba3ddcf3338e99cab9505e4b84f59e409`.
- Prerequisites: D01–D06 code and tests are present. Their native Firefox acceptance remains pending. The explicit D07 request proceeded with those limits recorded; no prior browser acceptance is assumed.
- Status: D07 record/message foundation and focused acceptance tests pass. **Not complete:** native Firefox integration/compatibility checks below remain outstanding. No D08 work, release, dependency, permission, or version change.
- GitHub handoff: user requested the D07 upload on 2026-10-20. All 35 repository files matched the tested D07 checkpoint before this handoff edit. This commit contains the 10 D07 source/test/tooling/documentation files; unrelated repository content is preserved. Checkpoints, build archives, and the unrelated local image stay local.
- Changed: [analysis-records.js](analysis-records.js) defines a versioned, transient store keyed by tab ID. It retains separate connection/header/form/privacy observations, explicit unknown/unavailable states, background-generated navigation IDs, optional document identity, and container/private metadata (null when unknown). Strict bounded payloads omit full URLs, passwords, cookie values, request bodies, raw headers, and arbitrary fields. Snapshots are copied; old generation updates are rejected. Capacity is 256 records, with explicit remove/clear APIs.
- Integration: [analysis-background.js](analysis-background.js) installs the store and a versioned read-only `privacy-monitor.analysis` / `get` listener. Only the exact extension popup sender may read; content scripts/frames/foreign senders cannot select other tabs or write. Unknown channels are left to other listeners. Manifest and package allowlist include the two modules; [ANALYSIS_RECORDS.md](docs/ANALYSIS_RECORDS.md) documents schema, identity, context, transport, and the migration boundary. README/development guide updated.
- Compatibility boundary: the new store starts empty; no production writer or popup reader is migrated yet. Existing hostname storage, header capture, content scans, popup/refresh, scoring, and D06 breach behavior remain unchanged. D08 must wire navigation, redirects, tab removal, and header writes; D09 must migrate scans/refresh/readers; D10 must remove legacy storage and enforce private-session handling. The live popup is not yet tab-isolated. Existing data is neither imported into the new store nor deleted.
- Verification: `node --test tests/*.test.mjs` passes **78/78**, including 11 new [D07 tests](tests/analysis-records.test.mjs). Two tabs sharing a hostname produce distinct results through the real message handler. Tests also cover stale generations, metadata/redaction, zero/unknown/failure states, validation, snapshot isolation, eviction/removal/restart, authorization, and manifest startup with unchanged legacy writes. Local lint passes; packaging verifies all **10 runtime files** against source SHA-256. No external requests occur in tests.
- Browser checks: not performed this session; no popup UI changed. Still pending: real Firefox startup/listener delivery, same-host fixture reads from the popup debugger, actual container/private metadata, stale-token refusal, forbidden content-script reads, and reload clearing. Carry D01–D06 browser checks forward. Mozilla MessageSender/onMessage/tabs.Tab references were checked on 2026-10-13 and linked in the contract; no minimum Firefox version or lifecycle acceptance is claimed.
- Recovery: `checkpoints/pre-d07-2026-10-13.zip` preserves pre-session files including the unrelated image. `checkpoints/d07-analysis-records-2026-10-13.zip` preserves D07 source/tests/docs/handoff. Earlier archives stay local; restore into a new directory.
- Next exact action: load root `manifest.json` in a disposable Firefox profile and run [D07's native checklist](docs/ANALYSIS_RECORDS.md#compatibility-and-verification). Seed distinct synthetic form observations for two same-host tab IDs in the background debugger, read each using the v1 message from the popup debugger, and record Firefox version, counts/context fields, message replies, console errors, and pass/fail here. Test stale-token and unauthorized reads, then reload clearing and legacy behavior. Resolve outstanding acceptance before marking complete. Stop before D08.

## Completed tasks

None with full Firefox acceptance yet. D01–D06 implementation and the D07 record/message foundation are present; automated checks pass. Native-browser acceptance remains outstanding.

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
