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

## D17 documentation verification — 2026-10-23

Scope: README, privacy/limitation wording, one architecture retention correction and static popup disclosure/attribution. Starting commit `a9dc1f5700bbcef08ffdb5372fdd198320c045cc`; clean separate checkout, original workspace untouched. No D18 matrix or feature implementation. D17 acceptance remains open for the native presentation checks below.

### Source evidence for the disclosures

| Claim checked | Source and result |
| --- | --- |
| Local summaries persist by hostname without expiry/container isolation | `content-script.js:analyzePage` writes `security_data_` and `forms_`; `popup.js:loadAllData` reads those keys only for known normal tabs. No cleanup/TTL is implemented. |
| Display controls do not stop analysis or clear history | `settings.js:read` and `options.js:save` manage only the two display flags/version; `analyzePage` still collects summaries. |
| No saved/transmitted password or cookie values | `renderPasswordFeedback` derives feedback locally; `analyzePageSecurity` saves cookie counts; storage writes and the sole application-defined `fetch` were inspected. |
| Breach disclosure and gates | `popup.js:fetchBreaches/loadAllData`, `breach-service.js:lookup`: observed connection, known normal context and Firefox consent. Exact hostname, including localhost/internal/IP names, is sent with a configured User-Agent; credentials/referrer omitted. No parent-domain normalization or site exclusions. |
| Cache freshness differs from retention | `breach-service.js:lookup` prunes expired entries during a later permitted call; no cleanup timer. Shared exact-host cache has 32-entry/32,768-character caps. Pending calls survive closing the popup; consent clearing/background restart removes transient state. |
| Revocation can fail | `popup.js:setBreachLookupEnabled` reports failed removal, blocks the current popup and directs the user to Firefox permissions before reopening. Documentation does not promise global revocation after an error. |
| Header records are transient, not anonymous | `analysis-records.js:createStore` and `background.js:fingerprint` retain hostname/context/timestamps and a matching digest in memory, capped at 256 records. |

### Checks performed

- Node **24.22.1**: **162 passed, 0 failed, 0 skipped** in the existing suite, including popup accessibility/consent, cache and private-context checks. No new implementation-mirroring tests were added for static text.
- Local syntax/manifest/package-reference lint: pass. Package rebuilt: **16 entries**, every SHA-256 matches source. Only `popup.html` changes in the runtime package; JavaScript, manifest and allowlist are unchanged.
- GPL `LICENSE` matches the starting commit's text (line-ending normalization only); existing source/license notices and contact attribution retained. Added visible HIBP source/license links and described the selected/sorted display in the README, privacy statement and popup.
- Documentation links and local heading anchors: **174 local links across 28 Markdown files, pass**. Scoped checks confirm project URLs in README/privacy target `ujjwalk1/PrivacyMonitor`, and the two popup attribution anchors have descriptive text, HTTPS targets and `noopener noreferrer` for new tabs. `git diff --check` passes.
- GitHub's web fetch returned a cache miss; the connected GitHub API verified repository `ujjwalk1/PrivacyMonitor`, canonical URL and enabled Issues. Official HIBP API/privacy and CC BY pages were read; the API page's `License` anchor was also verified from its HTML. This did not make a breach lookup or transmit a page hostname to the service.
- Prior D16 Mozilla lint results remain historical: zero errors and seven inherited rendering warnings. Not rerun in this static documentation slice; no warning-free or native-browser pass is claimed.

### Remaining acceptance and next action

No installed-Firefox or screenshot/visual acceptance was performed. Temporarily load the separate checkout's manifest into a disposable Firefox profile, leave lookup off, and check disclosure/attribution readability and overflow in light/dark themes at 200% zoom. Tab through both links and the existing controls; verify link destinations through user activation. Record actual version, steps, observed results and failures here. D16's compatibility/permission tests and the earlier migration/exclusion gaps remain open. Do not start D18 as part of this session.

## D18 acceptance diagnosis — 2026-10-24

See [BETA_ACCEPTANCE.md](BETA_ACCEPTANCE.md) for per-case procedures and evidence. This session preserves the existing uncommitted D17 work and changes no extension runtime code. Existing suite: **162 passed, 0 failed/skipped**; local lint passed. Local fixture HTTP checks passed for the two pages, redirects, dynamic form route and deliberate connection reset.

Mozilla web-ext **10.8.0** confirmed temporary installation into a new disposable profile using installed Firefox **158.0.1**. The native window inventory returned the fixture page title. The first Computer Use state capture then stopped: **browser URL policy enforcement is not yet supported for the current Windows browser**. No subsequent app input was issued. There is no observed native popup, score, banner, redirect result, private-session result or screenshot. No breach consent was enabled or live lookup requested. Previous D16/D17 native gaps remain open; this does not mark D18 accepted.

The next exact action is the manual page-A/page-B comparison in the matrix, followed by the remaining pending rows. No regression repair or submission was attempted. Final documentation and preservation checks are recorded below.

Final D18 checks: **173 local links across 29 Markdown files pass**; whitespace check passes. **70 of 72 pre-existing tracked files retain identical SHA-256 hashes**, including all runtime files and D17 product-documentation edits; only PROGRESS.md and this verification log were updated. Two new files are the matrix and local fixture server. The temporary web-ext runner and fixture-server sessions were stopped with Ctrl+C after the policy stop.

## D19 content-provenance regression — 2026-10-24

Scope: one agent, only the highest-priority D18 same-host content-mixing concern.
Starting commit `a9dc1f5700bbcef08ffdb5372fdd198320c045cc` plus uncommitted D17/D18
changes. Work stayed in the separate presentation checkout; no commit or push.
The original local workspace was not edited.

### Reproduction and repair

- Before the runtime fix, `tests/content-provenance.test.mjs` reported **4 failed,
  1 passed**. The mixed-tab case displayed **80** instead of rejecting foreign
  evidence. Missing/malformed identity, untagged summaries, and navigation during
  header retrieval also allowed a numeric score. These are controlled mocked API
  reproductions using the real popup code, not native observations.
- `content-script.js` now generates a random 128-bit document marker, tags both
  summary objects, and answers authenticated, exact-shape `identity` requests.
  Identity reads neither rescan nor write. Private/unknown contexts and missing
  random generation cannot return an accepted marker.
- `popup.js:readContentIdentity/loadAllData` checks current top-frame identity
  before storage and after headers. Only matching summaries are used. Navigation
  during loading invalidates the header snapshot as well. Untagged old rows are
  rejected, not deleted.
- The existing shared hostname storage remains. Another document's writes can
  still make a tab Incomplete; Refresh Analysis restores its own observations
  unless another write wins again. This prevents false combined scores without
  claiming the unfinished D09 record migration is complete.

### Verification

- Node **24.22.1**: **170 passed, 0 failed, 0 skipped** via
  `node --test tests/*.test.mjs` (162 prior cases plus eight new cases).
  Coverage includes two real content-script instances sharing mocked storage;
  same-URL distinct tokens; token stability; read-only HTTP identity; sender,
  request, initialization and crypto failure checks; partial mismatches;
  navigation during retrieval; refresh recovery; and private/unknown guards.
- The breach-eligibility regression uses enabled mock consent and an expired
  cache, so lack of a request is not hidden by opt-out or cache reuse. Foreign
  connection evidence produces `not-run`; no real lookup was made.
- Updated existing integration/preview fixtures to answer the identity contract.
  The unsupported-page assertion includes zero identity requests. Partial-form
  validation still exercises a matching but incomplete summary.
- Local syntax/manifest-reference lint passes. Rebuilt
  `dist/privacy-monitor-1.1.zip`: **16 allowlisted entries**, every SHA-256 matches
  source; documentation, tests and fixtures remain outside the runtime package.
- Public privacy/architecture/limitations and scan-contract documentation explain
  the random marker, rejection behavior and remaining shared-storage limitation.
  Link, whitespace and preservation results are recorded below.

### Pending acceptance and next action

No native Firefox session was run for D19. The D18 browser-policy stop remains
unresolved; no alternate UI path was used to bypass it. Native HTTP token
generation, sender behavior, two-tab/reload/refresh, private-context checks and
console inspection remain pending. The earlier seven Mozilla rendering warnings
are historical and were not rerun or suppressed in this slice. Full content
migration, legacy cleanup, exclusions and earlier acceptance remain outstanding.

Follow the [current D19 native procedure](BETA_ACCEPTANCE.md#d19-provenance-safeguard-follow-up--2026-10-24):
A=60, B=0, return to A=Incomplete (never mixed 40), refresh A=60. Record actual
Firefox results before accepting this safeguard. D19 is **partial / acceptance
open**; use a focused D19a for remaining blockers before D20.

Final D19 checks: **173 local links across 29 Markdown files pass**, including local heading anchors; `git diff --check` passes. Compared with the 74-file D19 starting snapshot, **61 files retain identical SHA-256 hashes**, 13 have intentional D19 edits, and none are missing. The new file is `tests/content-provenance.test.mjs`. D17's `popup.html` and D18's `tests/acceptance-server.mjs` remain byte-identical; existing product text was amended only where the provenance guard changes its description. No original-workspace files were edited, no dependencies or permissions changed, and no commit/push was made.

## D18–D19 publication checkpoint — 2026-10-24

Pre-publication verification: 170 tests pass with zero failures/skips; local runtime lint, 173 documentation links/local anchors and whitespace checks pass. Rebuilt package contains the 16 allowlisted files with source-matching SHA-256 hashes. Existing D17 product/privacy disclosures accompany the D18 fixtures and D19 guard. No new native Firefox result is claimed; all recorded acceptance gaps remain open.
