# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28. Session: 2026-10-21, **D12 only**, one agent. Read shared constraints, D12, handoff, relevant source/tests/docs, and manifest; no applicable AGENTS.md or local Git checkout. GitHub baseline for this upload is partial D09/D10 commit `bd701571110d52697d81760cb545445b32312606`. The user requested the D12 upload; this commit includes the unpushed D11 resolver prerequisite and D12 implementation, tests, and documentation. All 49 local files matched the verified D12 checkpoint before this handoff edit. Unrelated repository content, including its license, is preserved; build archives, checkpoints, and the local image stay local.
- Prerequisites: D11's resolver and 134 passing automated checks were present. Its native Firefox checks remain pending. D12 uses that resolver without expanding the unfinished D09 record migration or D10 historical cleanup. Those limitations and earlier browser checks carry forward.
- Status: **D12 implemented and automatically verified; native acceptance pending, not complete.** No D13 work, extension release, dependency, permission, or version change. Native checks remain pending after this GitHub upload.
- Changed: [content-script.js](content-script.js) observes the document for additions/removals/moves and relevant destination, method, ownership, type, disabled, ID, and base attributes. Warnings update automatically, repair after external removal, and do not trigger repeat scans from their own DOM writes. Shared password handlers replace the per-field registry; blur/switch/removal/retyping clears stale feedback, and removed indicators can recover.
- Bounds: callbacks inspect at most 64 records, run no subtree queries, and retain no changed nodes/records. Automatic work uses one 500 ms timer and one running scan, with one follow-up flag during slow writes. Full scans reconnect observation before awaiting storage; explicit refresh consumes pending changes. Password feedback holds at most one active field and one 300 ms timer. Full scan cost still scales with document size; native performance/memory checks remain pending.
- Verification: **143/143** automated tests pass (`node --test --test-reporter=dot tests/*.test.mjs`), including **9/9** new dynamic tests. Coverage includes field/form removal, action/base/override changes, external ownership, disabled state, warning repair/no self-triggering scans, 2,000 mutations, slow/failed writes, refresh coalescing, feedback switching/reinsertion/body replacement, and private no-write behavior. Local lint, preview-server and fixture-script syntax pass. Packaging verifies **10 runtime files** against source SHA-256. Tests use modeled DOM/observer/clock objects, not native Firefox or garbage collection.
- Docs/fixture: [DYNAMIC_MONITORING.md](docs/DYNAMIC_MONITORING.md) records behavior, scheduling limits, JavaScript/frame/shadow-tree limits, and native checklist. README, D11 destination notes, and scan/refresh notes are updated. [dynamic-forms.html](tests/fixtures/dynamic-forms.html) provides local add/remove/type/action/base/banner/burst/reinsert controls; submissions are canceled. Password values and input events are not retained by timers or stored/logged.
- Browser checks: **not performed this session**. Pending: native automatic updates and event delivery, warning stability, head/base and body replacement, field switching/retyping/removal, external/image/disabled controls, private no-write behavior, settled-page scan counts, console checks, and detached-node memory/performance. Popup observations require reopening/Refresh; no live-popup updates were added.
- Preservation/recovery: `checkpoints/pre-d12-2026-10-21.zip` preserves D11 and the unrelated image. SHA-256 comparison found only intended existing-file changes; unrelated files remain unchanged. `checkpoints/d12-dynamic-monitoring-2026-10-21.zip` preserves this source/tests/docs/handoff. Restore into a new directory.
- Next exact action: reload the root manifest in a disposable Firefox profile with breach lookup off, run `node tests/popup-preview.mjs`, open `http://127.0.0.1:4179/dynamic-forms.html`, and reload the page. Add a password field, toggle the action to HTTP, and verify one warning appears automatically; then follow [D12's native checklist](docs/DYNAMIC_MONITORING.md#verification-and-pending-native-checks), recording Firefox version and exact outcomes before marking D12 complete. Stop the server afterward. **Stop before D13.**
- Earlier remainder: D09 must bind content results/refresh to background tab/navigation/document records, migrate remaining popup readers, and remove legacy writes. D10 can then delete obsolete scan rows while preserving preferences, with retry/idempotence/no-recreation checks. See [SCAN_REFRESH.md](docs/SCAN_REFRESH.md) and [PRIVATE_HANDLING.md](docs/PRIVATE_HANDLING.md). D01–D11 native acceptance remains outstanding.

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation, partial D09 scan/refresh, partial D10 privacy guards, D11 form resolution, and D12 dynamic monitoring are present; automated checks pass. D09 migration, D10 legacy cleanup, and native-browser acceptance remain outstanding.

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
