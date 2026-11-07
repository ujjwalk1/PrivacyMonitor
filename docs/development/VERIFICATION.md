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

## D21 site/domain foundation — 2026-11-02

**Partial: implemented and tested outside the shipping package.** One agent;
base `1cef861a3f65db28f70c1477219278a36dbf4c34` with the existing uncommitted D20
documentation preserved. Shared constraints, D21, PROGRESS, hostname counting,
manifest/package paths and relevant test helpers were read before editing.
The beta's stable-record/policy and native acceptance prerequisites remain open.

Added [the shared module contract](../SITE_DOMAINS.md), `lib/site-domains.js`,
a pinned local tldts 7.4.19 browser bundle, upstream MIT license and complete
embedded-source map. [Provenance](../../vendor/tldts/NOTICE.md) records source
revision, retrieval date, archive SHA-512 and individual byte hashes. Downloaded
the official npm archive and checked its SHA-512 before extracting selected
files; no package install or lifecycle scripts ran. Three .gitattributes rules
preserve these upstream bytes across Windows Git checkouts.

The wrapper performs ASCII/IDN/URL normalization and compares registrable domains
using both ICANN and private rules. Local/IP names use exact canonical identity.
Distinct hosts without a known boundary produce unknown rather than a guessed
first-party result. Scheme/port differences are intentionally outside this
comparison; it does not establish common ownership or a security origin.
There are no browser/storage/network calls or retained page paths/queries.

### Measured checks

- Focused suite: **7 passed, 0 failed** against the actual vendored parser.
  Forty fixture rows cover descriptors/comparisons, including subdomains,
  co.uk/com.au, private tenants, PSL wildcard/exception rules, IDNs, localhost,
  intranet/.local names and IPv4/IPv6. Additional cases cover malformed/long
  inputs, unsupported schemes, credentials, omitted URL secrets, missing/broken
  dependency and offline execution.
- Full existing suite plus new checks: **177 passed, 0 failed/skipped**.
- Syntax checks pass for the wrapper and vendor bundle; existing local
  manifest/reference/runtime lint passes.
- Vendor hashes match copied upstream bytes; all 13 map entries include source.
  Git filtered/unfiltered object hashes match for the three protected files,
  verifying newline conversion will not alter them.
- Inspected the existing D20 ZIP without rebuilding or replacing it: all
  **16 entries match current runtime source** and D21 files are excluded.
  ZIP SHA-256 remains
  **A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.
  Main README, manifest, package allowlist and production JavaScript were not edited.

### Remaining acceptance

No new Firefox session or Mozilla validator run: the helper is not shipped.
Minimum/current Firefox local-script loading and URL/IDN normalization remain
pending, as does actual consumer integration. Previously recorded Mozilla
rendering warnings remain open. D20 draft materials still describe the unchanged
beta, not a release containing this new dependency.

Next: complete the current beta record/policy acceptance prerequisites; then
continue D21 by selecting a production consumer, adding script load order,
package paths and third-party/source-review notices together, and verifying
that consumer in Firefox. Existing popup script counts and external hostname
lookup semantics must not be silently changed. D21 is not marked complete;
no D22 tracker dataset or feature work was started. No commit or push.

Final D21 checks: **203 local links across 34 Markdown files pass**, including heading anchors; whitespace check passes. Of 78 pre-existing files snapshotted at session start, **76 remain byte-identical**; only PROGRESS and this verification log changed. No files are missing. In particular, the main README, original runtime and all pending D20 drafts remain intact. New D21 files are isolated module/vendor/test/documentation assets plus the vendor newline-preservation rules.

## D22 offline tracker dataset — 2026-11-04

**Partial: offline foundation only; production/browser acceptance open.** One
agent, base `3139379102d552e13fe94e9a29d9351d76f7c9f5`. Read the shared
constraints, D22 and current handoff; inspected D21 helper/tests, background
navigation records, settings, manifest and package tools. No applicable
AGENTS.md was found in the checkout or ancestor paths. Existing uncommitted D20
contributor/release/verification drafts were preserved.

### Dataset and adapter

Read the official EasyList repository policy and
[license statement](https://easylist.to/pages/licence.html).
Chose its GPL-3.0-or-later option. Retrieved the small general tracking-server
file from official raw GitHub at immutable revision
`9cfb8e34e18831e751641a37ed6ec8400ffc9218`. The 2026-11-04 date is
retrieval, not a claimed upstream release. No remote JavaScript or package
installation was used.

[Provenance and attribution](../../data/trackers/NOTICE.md) retain the exact
9,571-byte original, SHA-256, source URL and GPL reference. The deterministic
offline extractor produces 542 domain/source-line pairs (38,245-byte JSON).
Two IP rules, one wildcard and two image-only rules remain excluded and visible
in the report; no conditional syntax was erased to widen a rule.

The [adapter contract](../TRACKER_CLASSIFICATION.md) explains whole-label
matching, PSL/private-tenant boundaries, bounded indexing, evidence and separate
unknown/invalid/unavailable states. Owner/category are not inferred. Match
results assert membership in this narrow source, not effective blocker behavior
or observed tracking. No runtime collection, score change, request blocking,
network access or history storage was added.

### Checks actually run

- New focused suite: **10 passed**, zero failed/skipped. Fixtures cover known,
  unknown, lookalike, sibling and parent domains; IDNs; local/IP/unknown suffixes;
  conditional/wildcard omissions; private tenants and longest matching rule.
  Additional checks cover input validation, URL-secret omission, corrupt or
  missing dataset/dependency, mutation isolation, extraction grammar, and
  exclusion from the beta manifest/package.
- Full existing suite with D22 tests: **187 passed, zero failed/skipped**.
- Every one of the 542 included rules matches its original source line and
  classifies as listed. Source hash/size and both generated files reproduce
  exactly with `node tools/build-tracker-data.mjs --check`. A changed source
  fails the hash check.
- New JavaScript syntax checks pass. Existing local lint passes for the MV2
  manifest, references, 16-file allowlist and all shipped JavaScript.
- No native Firefox session or new Mozilla validator run: these assets are
  unshipped. Earlier seven validator warnings remain unresolved.

### Remaining acceptance and next action

D22 is **not complete**: native minimum/current Firefox loading/normalization,
trusted local JSON loading/error behavior and production integration remain
pending. The classifier is not connected to tab requests or the popup. D21 and
the stable beta record/context/settings prerequisites remain open; future
request capture and first/third-party classification were not implemented.

Next execute the D19 controlled two-tab acceptance procedure documented in
[PROGRESS](PROGRESS.md), then resolve prerequisites before integrating the
local helpers/data together with package paths, GPL/tldts notices, source-review
materials and native checks. Never report zero trackers without observations.
No D23 work, commit or push was performed.

Final D22 checks: **219 local links across 36 Markdown files pass**, including
heading anchors; whitespace check passes. Git filtered/unfiltered source object
hashes match, confirming original dataset newline preservation. Generated JSON
is pinned to LF for reproducible checks across Windows checkouts.

Of 90 pre-existing files snapshotted before D22, **86 remain byte-identical**,
none are missing. Only .gitattributes, the D21 contract's continuation link,
PROGRESS and this verification log changed. The main README, LICENSE, manifest,
package allowlist, runtime, tldts assets and existing D20 drafts/contributor
changes are intact.

The existing ZIP was inspected without rebuilding: all **16 entries match
runtime source**, D22 files are excluded, and its SHA-256 remains
**A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.

## D23 bounded request capture — 2026-11-04

**Partial isolated collector; no production or native-browser acceptance claimed.**
One agent, base `90d641a805e8438a8b7e0c0f7197a428245444b7`. Read shared
constraints, D23, PROGRESS and relevant source/test/package/privacy files.
Existing D20 drafts and contributor changes remain local and preserved.

### Prerequisites and scope

D07 header/navigation records exist, but the beta's content migration,
cleanup/exclusion policies and native acceptance remain open. D21/D22 modules
are still outside the runtime. Mozilla's current
[request API documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest)
and [compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/webRequest.json)
were read: request document IDs are recorded from Firefox 153, beyond the
unchanged manifest minimum 142. This collector requires that identity and
reports unavailable when absent; it does not guess from hostname or timing.

Added [collector and manual contract](../REQUEST_CAPTURE.md),
`lib/request-capture.js` and `tests/request-capture.test.mjs`.
Attachment is explicit; no module startup, manifest or packaging change occurs.
The collector retains only reduced domain/type aggregates after a top-frame
commit, with browser UUID matching and explicit normal-context checks.
Navigation/tab lifecycle and stop release data. It does not inspect bodies,
headers, cookie values or initiator URLs, and does not retain request URLs,
paths, queries, fragments or request IDs. Memory is bounded structurally:
64 records, 256 pairs each, counts capped at 65,535. Browser heap size was not
measured. No TTL or historical browsing store was added.

### Checks actually run

- Focused D23 suite: **16 passed**, zero failed/skipped.
- Full suite: **203 passed**, zero failed/skipped.
- Source syntax and existing local MV2/runtime/reference lint pass.
- Real D21 parsing is exercised with event mocks, not an alternate production
  normalizer. Tests cover top-frame/commit boundaries, same-host tabs and
  container-labelled events, same-URL navigation, stale UUID/timestamps, redirects,
  missing document IDs, private/unknown context, unsupported URLs, IDNs/IP/local
  hosts, tab/error cleanup, all capacity limits, caller mutation, stop and
  partial registration failure. Throwing getters catch inspection of sensitive
  event fields; fetch/storage/log access is forbidden by the harness.
- No native Firefox session, new Mozilla validator run, permissions change or
  external lookup. Earlier seven Mozilla warnings remain outstanding.

### Remaining acceptance

The module is **not shipped or connected to D07 records, the popup or D22
classification**. It does not capture initial navigation, pre-commit, iframe,
worker-without-top-frame or non-HTTP(S) traffic. Event counts are not unique
request counts or evidence of loading/blocking. Empty or unavailable capture
must not become a zero-tracker/safe verdict.

Next run the explicit local background-console procedure in
[REQUEST_CAPTURE](../REQUEST_CAPTURE.md#pending-firefox-procedure) on the
minimum and current Firefox versions and record actual behavior here. Resolve
compatibility and earlier beta record/policy prerequisites, then integrate
identity, policy/access cleanup, package paths and dependency notices in a
focused follow-up. D23 remains partial. No D24 work, commit or push.

Final D23 checks: **225 local links across 37 Markdown files pass**, including
heading anchors; whitespace check passes. Of 100 pre-existing files snapshotted
at the start, **98 remain byte-identical** and none are missing; only PROGRESS
and this verification log changed. Main README, runtime, manifest, package tools,
D21/D22 assets and pending D20 contributor/release drafts are intact.

Inspected the existing beta ZIP without rebuilding it: all **16 entries match
current runtime source**, D23 is excluded, and SHA-256 remains
**A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.

## D24 observed request classification — 2026-11-04

**Partial isolated integration; no production or native-browser acceptance
claimed.** One agent, base `90d641a805e8438a8b7e0c0f7197a428245444b7` with
the uncommitted D23 collector/tests/documentation and D20 drafts preserved.
Read shared constraints, D24, PROGRESS, D07 record source/contract, D21–D23
modules, manifest/package paths and relevant tests. No applicable AGENTS.md was
found in the checkout or ancestor paths.

### Changes and prerequisite boundary

Added [request classification contract](../REQUEST_ANALYSIS.md),
`lib/request-analysis.js`, `tests/request-analysis.test.mjs` and
`tests/fixtures/request-analysis.json`. It consumes the actual D23 collector
by tab/document UUID using a trusted current D07 record, and applies actual
D21 comparison and D22 dataset classification. It does not alter those modules
or enable a production listener, message API, renderer or score.

Findings separate site relationship from list membership. First-party,
unclassified third-party and known-tracker classifications remain distinct;
listed first-party hosts preserve both facts. A known-tracker result means
evidence of a rule match, not observed tracking or blocking. Unknown boundaries
and unavailable dependencies never become safe/unclassified success. Dataset
owner/category remain null; company ownership is not inferred.

Canonical hostname/type deduplication retains maximum cumulative counts.
Repeated reads do not accumulate results. Coverage/truncation/saturation flags
are retained, and malformed/oversized snapshots fail without partial findings.
No persistent history, network lookup, arbitrary record copying or sensitive
URL components were added.

### Checks actually run

- **14 focused tests pass**, zero failed/skipped, including 14 fixture rows.
- **217 full-suite tests pass**, zero failed/skipped.
- New module syntax and existing local MV2/runtime/reference lint pass.
- Integration tests drive the actual D07 store, tldts/D21, D22 adapter/pinned
  data and D23 collector with simulated browser events. They cover repeated
  requests/types, two tabs, navigation resets, late old-document events,
  private invalidation and stop without reusing earlier classifications.
- Other checks cover multi-part/private boundaries, IDN/IP/local/unknown hosts,
  same-site listed hosts, source evidence, null owner/category, corrupt/missing
  dataset, exact snapshot validation, capacity bounds, deduplication, deterministic
  ordering, and mutation isolation. Harnesses forbid network/storage/logging.
- No Firefox session or new Mozilla validator run. D23's documented minimum
  version/document-ID gap, beta prerequisite gaps and seven inherited validator
  warnings remain unresolved.

### Pending acceptance and next action

D24 is not complete: the new module and its prerequisites remain outside the
manifest/ZIP. Production setup, identity/access policy, package/license material
and native Firefox classification are pending. D25 UI was not implemented.

Start the existing local acceptance server and follow D23's background-console
setup, then the [D24 native continuation](../REQUEST_ANALYSIS.md#pending-firefox-continuation).
Use actual D07 records and D23 observations, keep lookup off, and record native
versions/results for first/third-party local observations, repeated reads,
tab/navigation/private/missing-ID behavior. Automated known-list fixtures are
not presented as real-browser passes. Resolve prerequisites before production
integration. No commit or push.

Final D24 checks: **237 local links across 38 Markdown files pass**, including
heading anchors; whitespace check passes. Of 103 pre-existing files snapshotted
at the start, **101 remain byte-identical** and none are missing; only PROGRESS
and this verification log changed. In particular, all uncommitted D23 module,
test and contract files, pending D20 drafts/contributor changes, main README,
LICENSE, runtime and packaging files remain intact.

Inspected the existing ZIP without rebuilding: all **16 entries match current
runtime source**, D24 is excluded, and SHA-256 remains
**A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.

## D25 request details view — 2026-11-05

**Partial isolated UI; production and native Firefox acceptance remain open.**
One agent, base `15a3968bcdbe2e943969d0ea3622349742e905fa`.
Read shared constraints, D25, progress, relevant D07/D21–D24 source/contracts,
popup, manifest and packaging/tests. Preserved the original workspace and
uncommitted D20 contributor/release/verification work in the separate checkout.

### Changes and prerequisite boundary

Added the [details contract and native procedure](../REQUEST_DETAILS.md),
`details/requests.html`, CSS, validated text renderer and lifecycle controller;
`lib/request-details-source.js` reads the actual D07 store through D24.
Added focused tests/helpers and a loopback synthetic preview server.

Cards show hostname, observed types/counts, separate party/list classification,
source evidence and snapshot retrieval date. Null owner/category are explicit.
Coverage, truncation, lower bounds and unavailable states remain visible.
There are no unsupported blocked-request totals, safe verdicts or implicit scans.
The controller binds one explicit target, clears invalidated/hidden results,
avoids reads while hidden and guards delayed reads. No persistent data or new
network service is introduced.

The production popup, manifest, package allowlist, README and score are untouched.
The view/source/dependencies remain unshipped. Earlier beta prerequisites,
D23 document-ID compatibility, production access/loading and native acceptance
are not resolved by this isolated slice.

### Checks actually run

- **13 focused tests pass**, including real D07/D21/D22/D24 with a fixture
  capture snapshot, evidence/date consistency, null owner/category, first-party
  list matches, corrupt data, injection/bounds, private rejection and copying.
- **230 full-suite tests pass**, zero failed/skipped. Controller tests simulate
  explicit target binding, navigation during delayed reads, tab closure/replacement,
  permission removal, initial hidden state, hide/show, refresh and failed reads.
- New JavaScript syntax and existing local runtime/MV2/package-reference lint pass.
- In-app browser inspected the clearly labeled synthetic loopback preview:
  three classified cards, expanded rule/revision/source/hash evidence, Enter
  key collapsing disclosure with visible focus, refresh without duplicated
  cards, narrow dark layout and long-domain wrapping, capture/saturation warnings,
  and separate empty/unavailable messages. No live website capture was exercised.
- No native Firefox session or new Mozilla validator run. Light theme, zoom,
  screen reader and native extension lifecycle remain pending. Seven inherited
  validator warnings remain open.

### Pending acceptance and next action

D25 is **not complete**. Follow the [native procedure](../REQUEST_DETAILS.md#pending-firefox-procedure)
using the local acceptance server and actual current page-B tab record, with
lookup off. Verify observed counts and refresh, two tabs, navigation/late reads,
private/missing identity, stopped capture and closure; record actual browser
versions/results. Resolve production prerequisites and packaging before enabling
the view. No D26 implementation, commit or push.

Final D25 checks: **246 local links across 39 Markdown files pass**, including
heading anchors; whitespace check passes. Of 107 pre-existing files snapshotted
at the start, **105 remain byte-identical** and none are missing; only PROGRESS
and this verification log changed. D20 drafts/contributor changes, README,
LICENSE, runtime and packaging files are preserved. Nine D25 files were added.

The existing ZIP was inspected without rebuilding: all **16 entries match the
current runtime source**, D25 is excluded, and SHA-256 remains
**A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.

D25 publication verification: the exact staged snapshot excludes local D20
drafts and contributor changes. All 230 tests, local runtime lint, new script
syntax and 227 local documentation links across 36 Markdown files pass. README
and runtime/package paths are unchanged; native acceptance remains pending.

## D26 monitoring access foundation — 2026-11-08

**Partial isolated implementation; no production or native-browser acceptance.**
One agent, base `436f2e915b4b6fb7291001c5189b52b20837d37a`.
Read shared constraints, D26, PROGRESS, manifest, header/record/settings/consent
paths and D23/D25 source/contracts. No applicable AGENTS.md found. The original
workspace and existing D20 contributor/release/verification work are preserved.

### Changes and prerequisite boundary

Added [monitoring access contract](../MONITORING_ACCESS.md),
`lib/monitoring-access.js` and `tests/monitoring-access.test.mjs`.
This bounded slice owns optional host permission transitions and the actual
D23 collector. The shipping manifest is intentionally rejected because required
hosts and static content scripts cannot provide genuine on-demand-only access.

Grant requests occur synchronously in the caller's gesture stack; capture
attaches only after grant confirmation. Denial/errors stay inactive. Revocation
and selecting on-demand immediately detach/clear capture. A late grant after
cancellation is removed without restarting capture. Failed removal is not
described as revoked access. Fresh instances never auto-start from existing
grants. Disposal stops collection but does not promise permission removal.

No scanner, product control, manifest migration, settings persistence or
header/content-path integration is claimed. The module remains outside the
manifest and ZIP. README, runtime behavior, breach consent and package list
are unchanged. No D27 work.

### Verification

- **12 focused tests pass**, zero failed/skipped, using actual D23/D21 modules
  with simulated browser events/permissions. Tests cover synchronous and exact
  request scope; denial, rejection, malformed grant, failed confirmation;
  actual collector attachment, capture, cleanup and re-enable; revocation;
  unrelated breach consent; immediate disable; retained access; late grant
  cancellation; duplicate clicks; disposal and collector registration failure.
- **242 full-suite tests pass**, zero failed/skipped.
- New module syntax and existing local runtime/manifest/reference lint pass.
- Official Mozilla permission request, manifest permission and webRequest
  references were checked on 2026-11-08; links and limitations are in the contract.
  No actual Firefox permission prompts, grant/removal or UI were exercised.
- No new Mozilla validator run. Seven inherited warnings, earlier beta
  migration/settings/native gaps and D23 document-ID compatibility remain open.

### Pending and next exact action

Create the disposable MV2 optional-host harness described in
[MONITORING_ACCESS](../MONITORING_ACCESS.md#next-exact-action); use one persistent
controller owner and actual extension buttons. Run the local acceptance server
in a disposable Firefox profile and test denial/grant/revocation, cancelled
late grants, shutdown/restart, private/container context and version compatibility.
Then integrate one shared policy across header/content/request/UI paths and
implement the current-page scan before claiming an on-demand product mode.
Record actual native outcomes. D26 remains partial; no commit, push or D27.

Final D26 checks: **253 local links across 40 Markdown files pass**, including
heading anchors; whitespace check passes. Of 116 pre-existing files snapshotted
at the start, **114 remain byte-identical** and none are missing. Only PROGRESS
and this verification record changed; three D26 files were added. README,
LICENSE, all runtime files, package configuration and unrelated D20 drafts are
preserved. The existing ZIP was inspected without rebuilding: all 16 entries
match current runtime source, with unchanged SHA-256
**A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.

## D27 cookie metadata collection — 2026-11-08

**Partial isolated implementation; production and native Firefox acceptance open.**
One agent, base `436f2e915b4b6fb7291001c5189b52b20837d37a`, preserving
uncommitted D26 and D20 work. Read shared constraints, D27, progress, manifest,
D07/D21/D26 source and relevant permission docs. No applicable AGENTS.md found.

### Changes and prerequisite boundary

Added [cookie metadata contract](../COOKIE_METADATA.md),
`lib/cookie-metadata.js` and `tests/cookie-metadata.test.mjs`.
Explicit optional-cookie permission requests do not initiate collection.
Independent cookie/host permission checks gate reads scoped to one active
normal-context tab, current D07 identity, exact cookieStoreId and separate
unpartitioned/derived top-level-site partitions. No all-store or all-partition
query is used.

The reduced projection never reads cookie names, values or paths. Raw browser
objects are projected on resolution before another await; no raw response or
result cache is retained by the module. Browser-created memory cannot be
zeroized by this code. Results are bounded to 256 metadata rows and one read
per instance. Malformed/mismatched data is unavailable, not partial success.
The browser's initial response allocation is not bounded by this output cap.

Legacy first-party-isolation cookies and third-party frame domains are outside
coverage and explicitly disclosed. Unknown purpose/SameSite/expiry remain
null where applicable. Permission/context changes invalidate pending results;
final permission/tab/store/navigation checks guard asynchronous completion.
Consumers must clear copies already displayed when their access policy changes.

The live manifest has no cookies permission, so the reader refuses activation.
No README, shipping runtime, package configuration, D26 code or D28 UI change.
Shared access controls, optional declarations, UI transport and native tests
remain prerequisites before enabling the feature.

### Checks actually run

- **14 focused tests pass**, zero failed/skipped. Actual D07 store and D21 parser
  are used with simulated cookies/permissions/events.
- **256 full-suite tests pass**, zero failed/skipped.
- Cases cover synchronous optional requests; denied/error/revoked grants;
  exact active-tab/store/partition filters; secret-property getters; valid empty
  versus unavailable; metadata unknowns; private/missing/stale context;
  PSL/private/local/IP/IDN sites; wrong domains/stores/partitions/FPI;
  malformed/oversized data; concurrent reads; lifecycle invalidation;
  final identity and permission checks; no cache mutation; listener rollback.
- New module syntax, existing local MV2/runtime/reference lint and documentation
  links pass. No new dependency or runtime permission was added.
- Mozilla cookies/getAll/Cookie/isolation guidance checked on 2026-11-08.
  Sources are linked in the contract. No actual browser cookies were accessed,
  no Firefox cookie permission granted, and no native acceptance claimed.
  No new Mozilla validator run; seven inherited warnings remain outstanding.

### Pending acceptance and next action

Follow [the disposable native procedure](../COOKIE_METADATA.md#verification-and-next-exact-action):
create a test extension copy with optional cookies and actual gesture control,
D21/D27 helpers and current D07 records; start the local acceptance server.
Use only synthetic local cookies in a disposable Firefox profile. Check actual
denial/grant/revocation, stores/containers, partition key equivalence, the FPI
coverage limitation, private context and stale reads. Record browser versions
and results, then integrate shared product access/UI lifecycle and packaging.
D27 remains partial. No commit, push or D28.

Final D27 checks: **258 local links across 41 Markdown files pass**, including
heading anchors; whitespace check passes. Of 119 pre-existing files snapshotted
at the start, **117 remain byte-identical** and none are missing. Only PROGRESS
and this verification record changed; three D27 files were added. In particular,
the uncommitted D26 source/tests/contract, D20 drafts/contributor changes,
README, LICENSE and shipping runtime/package configuration are preserved.
The existing ZIP was inspected without rebuilding: all 16 entries match runtime
source; SHA-256 remains
**A7FEE5DA5BE494EE2688DD6FC06AF4262FEA80DBD8F0D2D231C31D81DFF8DF25**.

D26-D27 publication verification: the exact staged snapshot excludes local D20
drafts and contributor changes. All 256 tests, local runtime lint, new module
syntax and 239 local links across 38 Markdown files pass. README and shipping
runtime/package paths are unchanged. Both days remain partial pending production
integration and native Firefox acceptance.
