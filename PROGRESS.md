# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28.
- Session: 2026-10-11, D06 only, one agent. Read shared constraints, D06, prior progress, popup/background/manifest, tests, and package tooling. No AGENTS.md found; this local folder still has no Git checkout.
- Prerequisites: D01 tooling, D02 score, D03 states, D04 validated results/deadline, and D05 consent/cancellation are present and their tests pass. Native Firefox acceptance for D01–D05 remains pending; the user's explicit D06 request proceeded with those limitations recorded. D06 builds on published D05 commit: `1fb0a835f58f4f0b5f492c49c8b83cdf2666a555`.
- Status: D06 implementation and simulated checks pass. **Not complete:** installed-Firefox popup/background lifecycle, request counts, consent revocation, and retry/expiry acceptance remain pending. No D07 work, new dependencies, or release.
- GitHub handoff: user requested the D06 upload on 2026-10-11. All 31 repository files matched the tested D06 checkpoint before this handoff edit. This commit contains the 17 D06 source/test/tooling/documentation files; unrelated repository content is preserved. Checkpoints, build archives, and the unrelated local image stay local.
- Changed: [breach-service.js](breach-service.js) moves lookup/deadline ownership into the existing persistent MV2 background. Cache holds only validated successes for 10 minutes, at most 32 exact hostnames and 64 KiB of retained result JSON per entry (2 MiB total plus metadata). Reads do not extend expiry; expired entries are pruned on lookup. Larger results display but are not retained. Up to four distinct requests run; same-host calls share work. No persistent breach storage or scheduled retries; fetch uses no-store.
- Backoff: HTTP 429 applies a shared cooldown across popups/hosts. Valid Retry-After seconds/dates are honored, with a one-second floor. Missing/invalid hints use 60/120/240/480/900-second fallback capped at 15 minutes. Fresh successes remain usable during cooldown. Failure, timeout, cancellation, and expired evidence never become cached clean results. Consent clearing cancels pending work and empties cache without bypassing a cooldown.
- Integration: manifest loads the shared validator/service before unchanged header capture. Popup uses privileged background access, keeps local scoring independent, and displays cache provenance, retry waits, busy/cancelled/unavailable outcomes. Missing background access fails visibly. Package allowlist has eight runtime files. README and [BREACH_CACHE.md](docs/BREACH_CACHE.md) describe retention, limits, sources, and pending checks; related guides and synthetic fixtures are updated.
- Verification: Node 24.19.0; `node --test tests/*.test.mjs` passes **67/67** (13 D06 cache tests plus a manifest/background startup smoke check added to the prior 53). Fake-clock checks cover independent popup contexts sharing background state, exact expiry, eviction/size limits, concurrency, failures/late results, retry timing, consent, restart, and local-score independence. Local lint and `powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1` pass; all eight packaged files match source SHA-256. No live HIBP requests were made.
- Browser preview: synthetic cached-result and HTTP 429 views both retained score 100 and enabled Refresh. Cache/retry wording wrapped in screenshots; captured warnings/errors were empty. Sandbox loopback access initially timed out; restarting the local-only preview outside the sandbox resolved access. Preview server and successful tab stopped. This does not verify native Firefox consent, actual popup reopening, or network behavior.
- Scope preserved: header capture, content scans, scoring/state rules, stored observations, broad permissions, MV2/version 1.1, and existing refresh scanner/delay remain. Storage/navigation/private-session work stays D07–D10. Mozilla lint/minimum-version/release validation remains assigned to later manifest/release days.
- Recovery: `checkpoints/pre-d06-2026-10-11.zip` preserves pre-session source/docs/tests/tools and the unrelated image. `checkpoints/d06-breach-cache-2026-10-11.zip` preserves this session's repository files. Earlier checkpoints remain local; restore into a new directory.
- Next exact action: load root `manifest.json` in a disposable Firefox profile, finish [D05 consent acceptance](docs/BREACH_CONSENT.md#verification-and-pending-browser-checks), then run [D06's browser checklist](docs/BREACH_CACHE.md#verification-and-pending-browser-checks). Inspect background requests: one consented initial request, zero fresh reopen/refresh requests, a new request at ten-minute expiry, no cached success after failure/revocation, and no uncached requests before a synthetic 429 cooldown expires. Record Firefox version, request counts, console output, and pass/fail here. Resolve outstanding D01–D06 browser checks before marking acceptance complete; stop before D07.

## Completed tasks

None with full Firefox acceptance yet. D01–D06 local implementation is present; D06 simulated checks and mocked UI review pass. Native-browser acceptance remains outstanding.

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
