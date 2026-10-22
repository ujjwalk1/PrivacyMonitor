# Supervisor briefing: Privacy Monitor through D15

Prepared 2026-10-22 for the 2026-10-23 presentation. This is a speaking/reference document, separate from the product README and excluded from the extension package. Pair it with the [VS Code walkthrough](VSCODE_WALKTHROUGH.md), [live demonstration](DEMO.md) and [verification record](../development/VERIFICATION.md).

## The central message

“Privacy Monitor brings several browser observations into one interface: connection status, security-header presence, form destinations, page counts and local password feedback. The work through D15 improves the reliability of those observations, makes uncertainty visible and makes external breach lookup optional. It is a development beta with unfinished storage migration and native Firefox acceptance.”

Do not say “all fifteen days are complete.” The plan requires acceptance evidence, and the progress log explicitly reports no day with full Firefox acceptance. D01–D08, D11–D12 and D14–D15 have implementation evidence; D09, D10 and D13 are partial. Automated checks support specific behaviors, not a claim of comprehensive protection.

## Evidence and history

The comparison baseline is exactly [8c3b240cfa46a57e373a5ece8325a84b4fc66486](https://github.com/ujjwalk1/PrivacyMonitor/commit/8c3b240cfa46a57e373a5ece8325a84b4fc66486). It exists and is an ancestor of the reviewed head [ce3647a5731e114379e1debcfe9f04df26f6874f](https://github.com/ujjwalk1/PrivacyMonitor/commit/ce3647a5731e114379e1debcfe9f04df26f6874f). The baseline commit itself changed a contact email; its tree represents the reviewed v1.1 implementation. It is not the first implementation commit.

Evidence includes current runtime source, manifest, tests, technical notes, progress, the original plan, baseline source and changed-file history. Commit dates below are Git author dates, not claims about when every task started or finished.

| Scope | Repository commit | Author date | Mapping confidence |
| --- | --- | --- | --- |
| D01 | [5eb66dc](https://github.com/ujjwalk1/PrivacyMonitor/commit/5eb66dc) | 2026-09-29 | Subject, tooling and notes agree. |
| D02 | [fab3ed2](https://github.com/ujjwalk1/PrivacyMonitor/commit/fab3ed2) | 2026-09-29 | Pure scoring extraction and tests agree. |
| D03 | [5bf8140](https://github.com/ujjwalk1/PrivacyMonitor/commit/5bf8140) | 2026-09-29 | State module, popup and fixtures agree. |
| Documentation | [cd574f1](https://github.com/ujjwalk1/PrivacyMonitor/commit/cd574f1) | 2026-09-29 | Organization follow-up, not another development day. |
| D04 | [7d9186e](https://github.com/ujjwalk1/PrivacyMonitor/commit/7d9186e) | 2026-10-08 | Outcome/timeout changes and tests agree. |
| D05 | [1fb0a83](https://github.com/ujjwalk1/PrivacyMonitor/commit/1fb0a83) | 2026-10-11 | Consent wiring and tests agree. |
| D06 | [d51d866](https://github.com/ujjwalk1/PrivacyMonitor/commit/d51d866) | 2026-10-11 | Shared service/cache/backoff agree. |
| D07 | [3fc13bb](https://github.com/ujjwalk1/PrivacyMonitor/commit/3fc13bb) | 2026-10-20 | Record/store/message foundation agrees. |
| D08 | [65462fc](https://github.com/ujjwalk1/PrivacyMonitor/commit/65462fc) | 2026-10-20 | Header/navigation migration agrees. |
| Partial D09 + D10 | [bd70157](https://github.com/ujjwalk1/PrivacyMonitor/commit/bd70157) | 2026-10-21 | Combined publication; no separate per-day commit boundary. |
| D11 + D12 | [e6774eb](https://github.com/ujjwalk1/PrivacyMonitor/commit/e6774eb) | 2026-10-21 | D11 prerequisite and D12 published together. |
| Partial D13 + D14 | [938d2f2](https://github.com/ujjwalk1/PrivacyMonitor/commit/938d2f2) | 2026-10-21 | Settings and accessibility published together. |
| D15 | [ce3647a](https://github.com/ujjwalk1/PrivacyMonitor/commit/ce3647a) | 2026-10-22 | Presentation/icons and tests agree. |

The combined commits support feature-to-plan mapping through source and notes, but the exact intra-commit order or individual editing date is uncertain. Password heuristics, basic page counts, header monitoring, breach lookup and form banners existed before D01; do not attribute their original invention to the later days.

## Before and after

| Area | Baseline source | Current source | Practical meaning |
| --- | --- | --- | --- |
| Score | Base 20 + HTTPS 25 + headers at most 30; maximum 75 before penalties. Missing all six headers still left the header subscore at 58. Cookie/script counts and breach history reduced score. | HTTPS 40 + normalized observed header weight up to 40 + no detected HTTP password form 20. Incomplete inputs return null. | Maximum is reachable and the score describes present technical observations. It remains a heuristic. |
| Missing evidence | Optional/default values could yield a numeric score and broad success wording. | State mapper and score validation distinguish absent evidence, errors and valid zero. | A failed scan does not masquerade as a successful check. |
| Headers | Persistent `headers_<hostname>` rows retained raw values. | Main-frame completion/commit matching writes transient per-tab presence records. | Reduces cross-tab/stale-header reuse and stored sensitive detail. |
| Content storage | `security_data_<hostname>` included full `location.href`. | New summaries omit full URLs and skip private/unknown-context writes. | Reduces new retention, but old rows and same-host sharing remain. |
| Breach lookup | Popup performed direct lookups without the later explicit consent/cache boundary. | Firefox consent, privileged service, explicit outcomes, deadline and bounded transient cache. | Users control disclosure; local score is independent of external availability. |
| Refresh | Separate injected scan and fixed wait could diverge from startup behavior. | Validated message calls the same scan and waits for completion. | One source of scan logic; navigation-bound content migration still unfinished. |
| Form resolution | Prefix/page-protocol checks could misread relative/base/override destinations. | URL resolution with document base, document-URL fallback and associated submitters. | Warnings reflect possible markup routes more accurately. |
| Dynamic behavior | Per-field listener registry and limited added-node handling. | Delegated password events, removals/attribute/base handling and coalesced shared scans. | Fewer stale field references and more consistent updates. |
| User controls | No current versioned display-settings UI. | Two persisted display controls with live storage-change handling. | Users can hide hints without turning off observations; no site exclusions yet. |
| Presentation | Earlier sectioned popup. | Explicit status text, focus treatment, announcements, themes, wrapping and local icons. | More explainable and usable; native assistive-technology and theme checks still required. |
| Maintenance | No current local regression/package infrastructure. | 162 passing tests in this review, syntax/reference checks and a 16-file verified archive. | Repeatable evidence and a small package; mocks do not prove Firefox integration. |

## D01 — Recoverable baseline and local tooling

**Problem.** Changes needed a recoverable starting point and repeatable checks. The existing local folder was not a Git checkout, so replacing it would risk unrelated files.

**Change and user value.** Added dependency-free tests, local lint, an explicit packaging allowlist and setup/recovery documentation. This helps prevent missing runtime assets and enables repeatable development without a framework or dependency installation.

**How to explain it.** “The extension runs directly from JavaScript files. I added a small safety net around those files: syntax/reference checks, behavioral tests and an archive whose contents are compared with the source.”

**Files/functions.** `tools/lint.mjs` validates manifest references and invokes Node syntax checks. `tools/package.ps1` compresses the allowlisted files and verifies entry names and SHA-256 bytes. `tools/extension-files.json` defines the package boundary; `tests/baseline.test.mjs` exercises startup wiring.

**Evidence/tradeoff.** Current tests/lint/package checks are recorded separately in the verification report. Local recovery archives described in earlier notes are not prerequisites for a fresh clone. This tooling is not Mozilla validation and does not establish Firefox installation. A small custom checker avoids a build system but has a deliberately limited validation scope.

## D02 — Correct local score

**Problem.** The baseline's formula could reach only 75 even in its best case, while cookie counts, script counts and historical breaches were treated as current security penalties. Missing information could still produce a number.

**Change and user value.** Extracted a pure scorer, corrected the declared 0–100 range and removed unrelated count/history penalties. Users see a score with a narrower, explainable meaning.

**How it works.** `PrivacyMonitorScoring.calculateSecurityScore` validates required inputs; every header must be explicitly present or absent. Header weights total 42 and are normalized to 40 points. HTTPS contributes 40; zero detected HTTP password forms contributes 20. Missing/conflicting values return null.

**Files/functions.** `scoring.js`, `popup.js: loadAllData`, `tests/scoring.test.mjs` and `tests/popup-score.test.mjs`.

**Evidence/tradeoff.** Tests cover best/worst cases, invalid/missing observations and breach independence. The full suite passes. Presence alone does not establish that a CSP or other policy is effective, and the chosen weights are a product heuristic, not a validated risk model.

## D03 — Honest popup states

**Problem.** Missing observations and failed access needed to be distinguishable from a clean result.

**Change and user value.** Added loading, incomplete, unavailable and unsupported states, plus section-level observation mapping. A user can see why a score is missing.

**How it works.** `PrivacyMonitorPopupState` validates connection, counts, forms and headers. `page` accepts HTTP/HTTPS only. `local` requires complete observed sections before “ready.” Popup rendering resets old results and uses a load-version guard to prevent an earlier asynchronous operation from replacing the current view.

**Files/functions.** `popup-state.js: page, local, headers, forms`; `popup.js: resetView, renderOverall, loadAllData`; `tests/popup-state.test.mjs`.

**Evidence/tradeoff.** Automated state tests pass; existing preview fixtures let a presenter inspect each state. Preview browser APIs are mocked. Native restricted-page behavior remains pending. Withholding a score is intentional when evidence is inadequate.

## D04 — Breach outcomes and deadline

**Problem.** Network or HTTP failure is not proof that a domain has no breach history, and a stalled response should not leave the interface waiting indefinitely.

**Change and user value.** Distinguished valid empty/results responses from HTTP failure, malformed data, network failure and timeout. Added an eight-second deadline covering fetch and body reading.

**How it works.** The current service races request work against a deadline and cancellation. `popup-state.js: breaches` validates every displayed field, including dates. Only a validated array becomes empty/results. HTTP errors, including 404, stay errors.

**Files/functions.** Originally introduced in `popup.js`; the current owner is `breach-service.js: lookup`, with `popup.js: renderBreaches` and `tests/breach-results.test.mjs`.

**Evidence/tradeoff.** Simulated outcomes and deadline tests pass. Real service success has not been established in this review. A deadline improves responsiveness but cannot guarantee that an already transmitted request is canceled at the remote server.

## D05 — Optional lookup and consent

**Problem.** A hostname sent to an external service is browsing activity and needs understandable user control.

**Change and user value.** Lookup defaults off, exposes enable/disable controls and uses Firefox's optional `browsingActivity` permission. Local observations remain usable independently.

**How it works.** `readBreachConsent` reads Firefox's permission state. The user-triggered `setBreachLookupEnabled` requests/removes consent. Revisions invalidate stale results. The service rechecks permission before cache or request use. Unsupported or failed consent APIs do not silently enable lookup.

**Files/functions.** `manifest.json: browser_specific_settings.gecko.data_collection_permissions`; `popup.js: readBreachConsent, setBreachLookupEnabled, onBreachPermissionChanged`; `breach-service.js: lookup, clear`; `tests/breach-consent.test.mjs`.

**Evidence/tradeoff.** Mocked grant, denial, revocation, unsupported API and late-result cases pass. Actual Firefox prompt, permission persistence and focus return remain pending. Firefox owns consent instead of a separate local preference, reducing conflicting sources of truth. Disabling cannot retract a hostname already received by HIBP.

## D06 — Bounded caching and backoff

**Problem.** Every popup reopening could repeat an external request, while rate limits needed predictable handling.

**Change and user value.** Reuses fresh successful results, shares concurrent same-host work, limits retained data and honors cooldown. Errors never become cached clean results.

**How it works.** Ten-minute TTL begins when a result settles. At most 32 hosts are cached, each no more than 32,768 JSON characters; at most four requests are pending. Larger successful results are returned without caching. HTTP 429 uses Retry-After or fallback exponential delays; the fallback starts at 60 seconds and is capped at 15 minutes. There is no scheduled retry. Revocation clears results/cancels work but retains cooldown during the same background session.

**Files/functions.** `breach-service.js: lookup, retryDelay, clear`; `tests/breach-cache.test.mjs`; [cache details](../BREACH_CACHE.md).

**Evidence/tradeoff.** Tests cover expiry, bounds, deduplication, revocation, timing and failures. Browser reopen/restart and real HTTP 429 behavior remain pending. Transient caching reduces repeated disclosure but is not a persistent offline breach database.

## D07 — Per-tab record foundation

**Problem.** Hostname keys cannot distinguish separate tabs or successive pages on one host.

**Change and user value.** Added a strict per-tab schema with navigation generation, context fields and observation states, establishing the structure for isolated results.

**How it works.** `createStore` supplies `begin/get/update/remove/clear`. A session ID plus increasing generation rejects stale writes, including same-URL reloads. Returned data is copied. The store caps at 256 records. The message handler validates extension identity, popup URL, shape and version.

**Files/functions.** `analysis-records.js: validData, createStore, createMessageHandler`; `analysis-background.js`; `tests/analysis-records.test.mjs`.

**Evidence/tradeoff.** Same-host tab separation, stale generation and invalid/sensitive payload tests pass. This is a foundation, not proof that every producer uses it. Only headers are wired to it today; content migration remains D09.

## D08 — Navigation-scoped header evidence

**Problem.** A persistent hostname header row can describe a different tab or previous document. Redirect and delayed events make simple matching unreliable.

**Change and user value.** Header presence belongs to a tab's committed navigation, and uncertain capture stays unknown/unavailable.

**How it works.** `background.js` uses main-frame request IDs, event times, commit identity and transient URL fingerprints. `publish` requires a matching committed resource and completed request. Redirects and errors invalidate evidence. Tab removal/replacement releases records. A 304 cannot prove omitted headers are absent, so it is unavailable.

**Files/functions.** `background.js: fingerprint, matching, publish` and event listeners; `popup.js: fetchHeaderData`; `popup-state.js: legacyHeaders`; `tests/header-navigation.test.mjs`.

**Evidence/tradeoff.** Automated redirects, errors, delayed events and lifecycle cases pass. Real Firefox event ordering, cache/304 and container cases remain pending. Conservative matching may yield incomplete observations; that is preferable to claiming the wrong page's headers. Header values are not evaluated.

## D09 — Shared scanning and refresh, partial

**Problem.** The popup's second injected scanner duplicated page logic and used a fixed delay instead of waiting for completed analysis.

**Change and user value.** Startup, dynamic scans and refresh now use `analyzePage`. Refresh awaits a validated acknowledgement; warnings are preserved or recreated, and errors clear the score.

**How it works.** The popup sends a versioned refresh message to frame 0. The content listener validates the popup sender, queues the shared scan and acknowledges after persistence. A failed write does not permanently poison later retries.

**Files/functions.** `content-script.js: analyzePage, runtime.onMessage`; `popup.js: refreshData`; `tests/content-refresh.test.mjs`.

**Evidence/tradeoff.** Shared-path, slow/failing write and warning tests pass. **Not complete:** content data still goes to hostname storage; popup readers are not fully migrated, and content results are not navigation-bound. Serialization is within one document, not across tabs. Next implementation step is the background-bound content contract before removing legacy writes.

## D10 — New-data privacy guards, partial

**Problem.** Full page URLs and private-context data should not enter persistent scan history or external lookup.

**Change and user value.** New page summaries omit full URLs. Content writes require a known normal context; private/unknown popups skip shared content rows and breach cache/network work.

**How it works.** `analyzePage` returns before persistence unless `inIncognitoContext === false`. Popup and breach service independently check `tab.incognito`. Local warning rendering happens before the persistence guard, so it can still work privately.

**Files/functions.** `content-script.js: analyzePageSecurity, analyzePage`; `popup.js: loadAllData, fetchBreaches`; `breach-service.js: lookup`; `tests/private-context.test.mjs`.

**Evidence/tradeoff.** New-record privacy and service/cache guard tests pass. **Not complete:** old rows are not deleted; they may contain URLs or earlier private data. Cleanup must follow D09 so active legacy readers/writers do not break or recreate rows. Private popup incompleteness is an explicit current limitation, not a completed private analysis pipeline.

## D11 — Form destinations

**Problem.** Testing an action string's prefix or the page protocol misses base URLs and submit-button overrides.

**Change and user value.** Resolves actual markup destinations, accounts for associated controls, and labels warnings as “can submit” rather than asserting a submission happened.

**How it works.** `resolveFormDestination` uses the document URL for missing/empty actions and `baseURI` for relative actions. It evaluates submitter action/method overrides independently. Associated external and image controls count; disabled submitters do not. Dialog routes are non-network. HTTP routes count each form once. Unknown routes make the aggregate unavailable instead of earning a complete score.

**Files/functions.** `content-script.js: resolveFormDestination, analyzeInsecureForms, injectFormWarning`; `tests/form-destinations.test.mjs`; `tests/fixtures/form-destinations.html`.

**Evidence/tradeoff.** Automated edge cases pass. Native fixture expected counts are 5/5 insecure/password forms without query or with HTTP base, and 4/4 with HTTPS base. Those are expected browser results, not recorded native passes. JavaScript fetch/submission changes, shadow trees and unscanned frames remain outside coverage. Published with D12; no separate D11 commit boundary.

## D12 — Dynamic monitoring

**Problem.** Modern pages insert/remove fields and change destination/ownership attributes after startup; a retained registry can accumulate stale nodes.

**Change and user value.** Delegated password handlers and relevant mutation rescans keep warnings and feedback aligned with current markup. Missing banners are repaired without duplication.

**How it works.** One active input replaces the historical set of fields. Observer options include child changes, form actions/methods, submitter attributes, ownership, disabled/type/id and base href changes. A 500 ms coalescing timer and in-flight/dirty flags avoid a mutation backlog. The observer disconnects during synchronous extension DOM changes to avoid self-triggered loops.

**Files/functions.** `content-script.js: setupPasswordListeners, reconcilePasswordFeedback, scheduleDynamicAnalysis, affectsFormMonitoring, setupMutationObserver`; `tests/dynamic-content.test.mjs`; `tests/fixtures/dynamic-forms.html`.

**Evidence/tradeoff.** Burst, removal/reinsertion, attribute and slow-write tests pass. Real page/Firefox lifecycle checks remain pending. Callback scheduling is bounded, but the scan itself still traverses the accessible document; there is no measured large-page performance guarantee.

## D13 — Display settings, partial

**Problem.** Users need control over visible hints without editing code.

**Change and user value.** Added two persisted switches: password feedback and form-warning banners, plus explicit save/default/error states. Open pages respond to preference changes.

**How it works.** `settings.js` validates the exact versioned schema; unreadable data suppresses hints. `options.js: save` awaits the owned-key write. Content listens to storage changes, immediately removes disabled UI and schedules reconciliation. Analysis counts continue regardless of visible hints.

**Files/functions.** `settings.js: normalize, read`; `options.html`; `options.js: save`; `content-script.js: initializeDisplaySettings`; `tests/settings.test.mjs`.

**Evidence/tradeoff.** Mocked persistence, failed reads/writes, delayed startup, live disable and private handling pass. **Not complete:** site exclusions are absent, and real restart/live-settings acceptance remains pending. A future exclusion must cover every producer, request and stale result; two cosmetic toggles cannot honestly substitute for that policy. Published with D14.

## D14 — Popup accessibility

**Problem.** Keyboard and assistive-technology users need stable controls, meaningful names and understandable status transitions.

**Change and user value.** Added semantic headings, visible focus, text status, accessible score descriptions, live announcements and reduced-motion treatment. Busy/unavailable actions keep stable focus order using `aria-disabled` plus handler guards.

**How it works.** `renderOverall` updates polite status and score descriptions; `setActionUnavailable` and `actionUnavailable` coordinate state and event handling. Settings errors have a visible/announced explanation. Color supplements text rather than being the sole status cue.

**Files/functions.** `popup.html`; `popup.js: renderOverall, updateScoreRing, setActionUnavailable, actionUnavailable`; `tests/popup-accessibility.test.mjs`.

**Evidence/tradeoff.** Automated names/guards/contrast checks pass. Prior progress records mocked browser keyboard checks. Real Firefox focus, native permission prompt, NVDA/screen-reader behavior and high contrast remain pending. ARIA attributes and author-color calculations do not establish accessibility compliance.

## D15 — Presentation and local icons

**Problem.** Long domains/results, theme differences and small popup dimensions needed consistent presentation.

**Change and user value.** Added light/dark palettes, wrapping, responsive sizing/spacing and three lightweight local SVG icons, retaining existing behavioral controls.

**How it works.** `popup.html` uses the color-scheme media query and wrapping/layout rules. The manifest declares default and theme toolbar assets. The package allowlist includes all icons; no remote image or font dependency is introduced.

**Files/functions.** `popup.html`; `popup.js: renderBreaches` themeable “more” row; `manifest.json`; `icon.svg`, `icon-light.svg`, `icon-dark.svg`; `tests/popup-preview.mjs`; `tests/popup-accessibility.test.mjs`.

**Evidence/tradeoff.** The reviewed handoff reports 18 mocked preview layouts, icon sizes 16/32/48/96, keyboard inspection and 200% CSS zoom simulation. This review reruns the test suite, but does not turn historical previews into installed-Firefox evidence. Real toolbar/theme selection, popup overflow, native zoom/display scaling and screen-reader checks remain pending. No fabricated interface screenshot is used in the public README.

## What to emphasize about engineering quality

Correctness improved through explicit input validation, stale-result rejection, accurate form resolution and shared scan logic. Privacy improved by making hostname disclosure opt-in, reducing new stored detail and refusing private/unknown external access. Maintainability improved through pure modules, a documented message contract, controlled fixtures and a verified package boundary. Usability improved through explainable uncertainty, display settings and accessible presentation.

The remaining architecture work matters just as much: current normal-tab content data can still be stale/shared by hostname; cleanup is deferred; native behavior has not been accepted. Present this as a clear engineering backlog rather than hiding it.

## Preparation and next priorities

Open the separate presentation checkout, not the preserved original folder. Follow [DEMO.md](DEMO.md) before the meeting. First perform a real temporary-load smoke check and record exact Firefox/OS results. If it fails, use the explicitly labeled synthetic preview and source/tests as fallback; do not describe that as a working installed extension.

After the presentation, the next implementation action is finishing D09's tab/navigation-bound content migration, followed by D10 cleanup and D13 exclusions. D16 onward remains planned. This documentation session does not implement or accept those later days.
