# Presentation verification record

Date: 2026-10-22. Scope: repository presentation/documentation through D15; no D16+ feature implementation.

## Source and preservation

- Reviewed GitHub main at `ce3647a5731e114379e1debcfe9f04df26f6874f`.
- Confirmed `8c3b240cfa46a57e373a5ece8325a84b4fc66486` exists and is an ancestor; compared baseline/current source and milestone commit file changes. Combined-day commits are identified in the [briefing](../presentation/BRIEFING.md).
- Work performed in `C:\Users\91851\OneDrive\Desktop\PrivacyMonitor-presentation`, a separate clone with a clean starting Git status. The original folder has no Git metadata; no managed worktree attachment was available.
- All **97 original workspace files** retain their starting paths and SHA-256 hashes. Original files, recovery archives, generated package and organization were preserved.
- All **16 runtime files** and the GitHub **LICENSE** are unchanged relative to the reviewed head. Only documentation and the new local documentation-link checker changed. Runtime entry points and package allowlist are unchanged.
- Tracked daily plan/progress records now live under `docs/development/`; relative links were repaired. GPL-3.0 and existing source attribution remain intact.

## Checks actually run in this checkout

Environment: Windows PowerShell, Node.js **24.19.0**.

| Check | Result | What it establishes |
| --- | --- | --- |
| `node --test --test-reporter=tap tests/*.test.mjs` | **162 passed, 0 failed, 0 skipped**, after documentation reorganization | Existing mocked behavioral regressions pass. |
| `node tools/lint.mjs` | **Pass** | Runtime syntax, MV2 basics and manifest/popup/options/icon package references. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1` | **Pass: 16 entries, every SHA-256 matches source** | Separate checkout builds an unsigned development ZIP with the intended file bytes. |
| `node tools/check-docs.mjs` | Final result recorded below | Local inline Markdown links and heading anchors; no external URL crawler. |
| Local fixture server | **Started successfully; eight routes returned HTTP 200 with non-empty content** | Gallery, theme page, both form fixtures, ready/error popup previews, popup script and icon are served. Server stopped afterward. |
| Runtime/license diff against reviewed head | **No differences** | Presentation changes did not modify application behavior or licensing. |
| Original workspace SHA-256/path comparison | **97/97 unchanged** | Original local files and organization were preserved. |

Documentation-link result: **Pass — 145 local links across 27 Markdown files**, including local heading anchors.

The fixture checks were HTTP smoke checks, not visual inspection or installed-extension tests. The initial sandbox blocked localhost access; the authorized read-only check outside that sandbox passed. No real breach request was made. There is no bundling build: the source runs directly, and packaging is the verified build artifact.

## Historical evidence, not newly repeated native checks

The D15 handoff and [presentation notes](../POPUP_PRESENTATION.md) report 18 synthetic theme/reflow cases, icon-size inspection and keyboard checks, including a 200% CSS zoom simulation. D14 notes report mocked keyboard/focus inspection. These are historical local-preview results, not native Firefox passes. The current suite rechecks automated assertions; this session did not repeat visual/browser acceptance.

No current installed-extension screenshot was captured. The public README therefore uses no fabricated interface image or outdated mock screenshot.

## Still pending

- Actual Firefox temporary installation and startup, popup/content/background integration.
- Real navigation, redirects, cached/304 responses, same-host tabs, containers and restricted pages.
- Fresh-install consent, revocation, actual external-service success, private access and restart behavior.
- Dynamic-form fixture behavior, settings save/live updates and restart in Firefox.
- Screen-reader announcements, focus through native prompts, Light/Dark/custom themes, toolbar icons, high contrast, native popup zoom and display scaling.
- Mozilla add-on validation, tested minimum Firefox version and release/signing acceptance.

Do not mark D01–D15 fully accepted. D09 migration, D10 cleanup and D13 exclusions are additionally unfinished implementations, independent of these browser checks. The presentation documentation does not mark D17 complete.

## Next exact action

In the separate checkout, run `node tests/popup-preview.mjs`. In a disposable Firefox profile, temporarily load that checkout's `manifest.json`, record Firefox/OS versions and installation errors, then reload `http://127.0.0.1:4179/dynamic-forms.html`. Verify dummy password feedback and the 0/0 → 1/1 → 0/0 form transition, refresh preservation and settings. Follow [DEMO.md](../presentation/DEMO.md), and record actual results below. If installation fails, use the explicitly labeled synthetic preview and preserve the failure details.

## Native rehearsal results

Not performed by this documentation session. Add date, environment, exact steps, actual observations and pass/fail here after rehearsal. Expected demo values are not substitutes for observed results.

## D16 manifest verification — 2026-10-23

This entry supersedes only the manifest-validation pending item above. The earlier presentation record remains historical. D16 acceptance is still open; no native Firefox check was performed.

- Starting commit: `b6c5e1ed82887e1f5ecb934305cf87c3cb156285`, clean separate checkout. Original workspace untouched. Runtime JavaScript, license and the 16-file package allowlist are unchanged.
- Environment: Node **24.22.1**, PowerShell on Windows; installed Firefox executable reports **158.0.1** (inventory only). No test of minimum Firefox 142 was performed.
- Existing regression suite: **162 passed, 0 failed, 0 skipped**. Local syntax/manifest-reference checks pass. Rebuilt final minimum-142 package: **16 entries, all SHA-256 values match source**.
- Mozilla **web-ext 10.8.0 / addons-linter 10.14.0** scanned the unpacked package, with configuration discovery disabled. Ordinary lint exits **0**, with **0 errors, 0 notices, 7 warnings**. Minimum 142.0 and stable ID are recognized. The trial minimum 140 caused an additional Android-consent compatibility warning; choosing conservative minimum 142 removed it.
- Strict `--warnings-as-errors` exits **1** for the seven inherited `UNSAFE_VAR_ASSIGNMENT` warnings. The starting-commit package has precisely the same warning codes/files/lines/columns. None were suppressed. Locations: content-script.js:101; popup.js:227,286,297,311,318,325. Review/remediation is pending, not evidence of a confirmed exploit.
- Documentation links: **163 local links across 28 Markdown files**; local anchors checked. `git diff --check` passes.
- No native installation, permissions, file/restricted-page, minimum-version, consent, private-session or restart checks were performed. No real breach request was made, no dependencies were added to the repository, and no commit was pushed.

Next exact action: run `node tests/popup-preview.mjs` in the separate checkout, temporarily load its manifest into a disposable Firefox profile, reload `http://127.0.0.1:4179/dynamic-forms.html`, and record actual tab/domain access, form-count transitions and Refresh Analysis. Complete the [D16 browser checklist and warning follow-up](../MANIFEST.md#pending-browser-acceptance) before claiming acceptance; do not begin D17.
