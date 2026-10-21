# Privacy Monitor progress

Keep this file concise. Replace the current handoff after each session; retain only short completion entries.

## Current handoff

- Plan: [DAILY_PLAN.md](DAILY_PLAN.md), prepared 2026-09-28. Session: 2026-10-21, **D14 only**, one agent. Read shared constraints, D14, prior handoff, popup/state/consent/refresh sources, relevant tests and packaging tools. No applicable AGENTS.md or local Git checkout. D13/D14 delivery is based on combined D11/D12 commit `e6774eb8bb7a6fdd7effc4a0becd08b7d00e07c4`. This commit publishes D13 display settings and D14 popup accessibility at the user’s request; acceptance status below remains unchanged.
- Prerequisites/scope: D13 display settings and 153 passing baseline tests were present. D09 content-record migration, D10 historical cleanup, D13 site exclusions, and earlier native checks remain unfinished. D14 presentation work is independent of those remainders; none was expanded or marked complete. No analysis, permission, storage, version, dependency or publishing change.
- Status: **D14 implemented; acceptance pending, not complete.** Automated checks and local mocked browser keyboard checks pass. Installed-Firefox focus/prompt behavior and real screen-reader announcements still need acceptance. No D15 work.
- Changed: [popup.html](popup.html) adds language/title, semantic headings, visible keyboard focus, darker green/amber text, an accessible score/limitation, persistent polite atomic status regions, and reduced-motion handling. Existing layout is preserved. [popup.js](popup.js) updates score names and analysis/breach summaries, clears old announcements, and retains existing stale-response guards.
- Keyboard behavior: four native buttons remain in source-order tab navigation, including unavailable actions through `aria-disabled`, so state changes do not drop focus. Consent/refresh handlers block unavailable or repeated activation before doing work; synchronous consent request behavior is preserved. Status descriptions explain availability. No scripted focus movement or custom keyboard shortcuts.
- Verification: **161/161 automated tests pass** (`node --test --test-reporter=dot tests/*.test.mjs`), including **8/8** new accessibility tests. Coverage includes declared text/focus contrast, headings/control order, accessible score/reset states, live summaries, stale responses, unavailable/duplicate activation and non-color status text. Existing consent/refresh assertions now check ARIA availability. Local lint passes; package verification confirms **13 runtime files**, SHA-256 identical to source.
- Browser evidence: local `consent-off` preview in the in-app browser passed Tab/Shift+Tab order, visible 3px focus outline with 2px offset, Enter/Space mocked consent toggles, and Enter refresh failure. Focus stayed on the initiating button after state changes. Accessibility tree exposed headings, complete score name and unavailable buttons; screenshot showed unclipped refresh focus. No real permission grant or external lookup occurred. The sandboxed preview initially could not connect; rerunning the same loopback-only server with approved sandbox escalation enabled verification. Preview server stopped after checks.
- Pending browser checks: installed Firefox with NVDA or another compatible screen reader; actual popup/prompt focus return, spoken polite announcements (including repeat/noise behavior), private/unsupported/restricted pages, cached/error/timeout results, settings-opening errors, native button/theme/high-contrast readability, reduced motion, and popup scrolling/zoom. Mock browser DOM/keyboard evidence does not establish spoken AT or Firefox acceptance. Follow [the D14 checklist](docs/POPUP_ACCESSIBILITY.md#native-acceptance-still-pending); retain all earlier native checks.
- Preservation/recovery: `checkpoints/pre-d14-2026-10-21.zip` preserves the starting folder and unrelated image. `checkpoints/d14-popup-accessibility-2026-10-21.zip` preserves the D14 source/tests/docs/handoff. Restore into a new directory. Only intended popup, related tests/helper, README, progress and new accessibility documentation/test files changed; unrelated source/image and D13 settings work remain intact.
- Next exact action: load this folder in Firefox using [DEVELOPING.md](docs/DEVELOPING.md), record Firefox/OS/screen-reader versions, then execute steps 1–4 of [D14 native acceptance](docs/POPUP_ACCESSIBILITY.md#native-acceptance-still-pending). Record actual focus, speech, contrast and reduced-motion results; fix only reproduced D14 failures and rerun affected checks. Mark D14 complete only after these acceptance checks pass. **Stop before D15.**
- Earlier remainder: D09 still needs background-bound content records/refresh, popup-reader migration and legacy-write removal. D10 can then clear obsolete scan rows without deleting preferences, checking retry/idempotence/no recreation. D13 remains partial: display preferences are present, but one persisted site-exclusion policy must gate content startup/observer/refresh/password UI, headers, breach requests/cache and popup legacy reads; changes must cancel work/remove UI/discard evidence/reject late results. Verify real restart/live changes, two tabs, redirects/private contexts, storage errors and stale results. See [SETTINGS.md](docs/SETTINGS.md). D11/D12 and earlier native acceptance remain open.

## Completed tasks

None with full Firefox acceptance yet. D01–D08 implementation, partial D09 scan/refresh, partial D10 privacy guards, D11 form resolution, D12 dynamic monitoring, partial D13 display settings, and D14 popup accessibility are present; automated checks pass. D09 migration, D10 legacy cleanup, D13 site exclusions, and native-browser acceptance remain outstanding.

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
