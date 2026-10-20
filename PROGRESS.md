# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28.
- Session: 2026-10-21, **D10 only**, one agent. Read shared constraints, D10, prior handoff, D09 boundary, relevant content/popup/record/breach sources, manifest, and tests. No applicable AGENTS.md or local Git checkout found. GitHub baseline for this upload is D08 commit `65462fc4837a5de4e9ddf61c9457cf82397f88c4`. The user requested the partial D09 and D10 upload on 2026-10-21. This commit includes both tested portions and their outstanding work; neither day is marked complete. All 42 source/test/documentation files matched the tested D10 checkpoint before this handoff edit. Unrelated repository content is preserved; build archives, checkpoints, and the local image stay local.
- Prerequisite finding: **D09 is unfinished.** Content scans still write `security_data_<hostname>` and `forms_<hostname>`, and the normal-tab popup still reads them. Deleting those records now would remove active observations and allow later scans to recreate them. D01–D09 native Firefox checks also remain outstanding. The explicit D10 request proceeded only with independent privacy safeguards; D09 migration was not attempted in this session.
- Status: **D10 partial, not complete.** New scan URL retention and private-context guards are implemented and tested. Historical scan cleanup and final private-session acceptance remain pending. No D11 work, publishing, dependency, manifest permission, or version change.
- Changed: [content-script.js](content-script.js) omits the full page URL from new scan summaries. The temporary legacy write adapter requires `extension.inIncognitoContext === false`; private, missing, or malformed context skips storage. Local password feedback/form warnings remain available; refresh and observer scans can maintain warnings without persisting findings. Existing stored URLs/private observations have not been erased.
- Popup/service: [popup.js](popup.js) reads legacy content records only for tabs explicitly marked non-private by the browser. Private/unknown contexts show incomplete observations with an explanation instead of reusing same-host stored findings. Breach lookup is blocked in the popup and [breach-service.js](breach-service.js), including after consent/refresh. The service now requires a trusted caller's explicit normal-context flag before consent, cache, pending-request, or network work; private calls neither reuse nor cancel normal-tab results. D08 transient headers remain unchanged.
- Verification: **109/109** automated tests pass (`node --test --test-reporter=dot tests/*.test.mjs`); the focused privacy/content/breach run passed 50/50. Eight added checks cover URL/cookie-value omission, private/unknown startup/refresh/observer writes, local warnings, untouched preferences, skipped popup legacy reads, cache/pending isolation, consent/refresh gates, and late normal replies after a private-tab switch. No actual external lookup occurs in tests. Preview fixture syntax passes; local lint passes; packaging verifies all **10 runtime files** against source SHA-256.
- Documentation: [PRIVATE_HANDLING.md](docs/PRIVATE_HANDLING.md) records the safeguards, browser metadata sources, reduced private-popup coverage, cleanup prerequisite, and native checklist. README, scan/refresh notes, development guide, and breach-cache contract reflect the new behavior. Older stored rows remain; no cleanup/preference-preservation acceptance is claimed from these guard tests.
- Browser checks: **not performed this session**. Pending: actual Firefox content/tab privacy flags, no storage writes from private startup/observer/refresh, local warning behavior, no normal-row reuse in private popups, no private-hostname request/cache use after consent, and popup/content/background console checks. Reload the updated extension and fixture pages to retire older content-script instances. Carry D01–D09 native checks forward; no minimum Firefox version is claimed.
- Preserved D09 portion: one shared content scan, awaited popup refresh, serialized per-document writes, warning preservation/recreation/removal, and removal of the duplicated injected scanner/600 ms delay. Its background-bound content-record migration and remaining popup readers are still pending; see [SCAN_REFRESH.md](docs/SCAN_REFRESH.md).
- Recovery: `checkpoints/pre-d10-2026-10-21.zip` preserves the partial-D09 baseline and unrelated image. `checkpoints/d10-partial-private-guards-2026-10-21.zip` preserves this source/tests/docs/handoff. Earlier checkpoints remain local; restore into a new directory.
- Next exact action: first complete the **D09 prerequisite**: bind content scan results to the background's current tab/navigation/document identity, validate bounded payloads, route refresh through that coordinator, migrate remaining popup readers, and remove the legacy write adapter. Verify same-host tabs, same-URL reloads, delayed old scans, authorization, and failure states. Then finish D10 by deleting only obsolete `security_data_`, `forms_`, and `headers_` rows while preserving preferences/unrelated keys; test retry/idempotence and prove scans cannot recreate them. Run [D10's native checklist](docs/PRIVATE_HANDLING.md#checks-and-native-firefox-acceptance-pending) and record exact results before marking D10 complete. **Stop before D11.**

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation, partial D09 scan/refresh, and partial D10 privacy guards are present; automated checks pass. D09 migration, D10 legacy cleanup, and native-browser acceptance remain outstanding.

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
