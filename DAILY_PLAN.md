# Privacy Monitor: daily development plan

Prepared 2026-09-28 from the reviewed v1.1 source. These are proposed work items, not completed changes.

## How to use this plan

- Start with D01 and follow the core days in order. Each day is one bounded work session, not a guaranteed duration or quota amount. Carry unfinished work forward before starting its dependent task.
- Aim for one implementation request and, if needed, one focused correction. Reserve two days per week for catch-up, personal Firefox testing, or rest. Forty core sessions would therefore be about eight weeks at five sessions per week, with extra time for overruns.
- Stay with GPT-6 Astra if that is your preference. Use Standard speed. Try low reasoning for straightforward wording/style work and medium for ordinary implementation; reserve high for difficult lifecycle or permission problems. These are suggested starting points, not measured usage guarantees. Do not change models or account settings automatically.
- Record the observed allowance change for the first three sessions. Use that evidence to shorten later sessions. Weekly allowances and other Codex work matter too; the day numbers are not quota reset dates.
- Keep related corrections in the same chat. At a milestone boundary or when a chat contains substantial unrelated history, start a fresh project chat with PROGRESS.md and the selected day. A new chat does not reset your allowance and is not automatically cheaper.
- Run focused checks for today's behavior. Run the broader relevant checks at release checkpoints. Do not repeatedly run unchanged checks after they pass.
- Save a working checkpoint before the next day. Use an existing Git checkout if available; the reviewed local folder was not a Git repository. Do not overwrite it with a clone or discard existing work.

OpenAI says usage depends on model, task complexity, context, reasoning, and tools; prompt length alone cannot predict it. Standard speed avoids the increased consumption associated with Fast mode. Source: [OpenAI usage and pricing guidance](https://learn.chatgpt.com/docs/pricing).

## Shared constraints for every implementation session

1. Implement only the selected item and necessary prerequisites. Keep the existing plain JavaScript extension; a framework rewrite is outside this plan.
2. Default to local processing. Keep passwords transient; do not persist or log passwords, cookie values, request bodies, or sensitive URL components. External lookups need accurate disclosure and consent.
3. Preserve functionality during refactors. If a transition needs a temporary compatibility layer, document it and remove it when its migration is complete.
4. Separate unknown, unavailable, not observed, and successful results. Third-party activity is not automatically tracking; a technical score is not a safety guarantee.
5. No subagents, broad cleanup, speculative features, publishing, or unrelated dependency upgrades as part of a daily slice. Small dependencies are acceptable when needed for the selected behavior; explain the choice.
6. A task is done only when its acceptance check passes. Mark browser checks as pending when they have not actually been performed.
7. If the task expands substantially, complete a safe smaller slice where possible and record the exact remainder. Do not mark the day complete to satisfy a calendar target.
8. Finish by updating PROGRESS.md with status, relevant file paths, verification, and the next action. Keep it short; do not append a transcript.

## Core days 01-20: dependable Firefox beta

Stay on MV2 for this milestone unless a verified requirement forces a change. MV3 is a separate optional track. Before release, verify current Mozilla requirements rather than relying on this document's date.

| Day | One deliverable | Acceptance check / boundary |
| --- | --- | --- |
| D01 | Establish a recoverable baseline and minimal local test/package commands. Record how to load the existing extension in Firefox. | Existing behavior still loads; test and lint commands are reproducible. Preserve the local files if connecting to Git. No application rewrite. |
| D02 | Extract and correct the score calculation. Document weights and separate historical breaches from present-page scoring. | Tests cover maximum/minimum, deductions, and missing inputs. A complete best-case observation can reach the declared maximum. |
| D03 | Give the popup explicit loading, incomplete, unavailable, and unsupported-page states. | Missing evidence never appears as a successful check. Test the state mapping; inspect wording manually. |
| D04 | Fix breach-result handling and add a request timeout. | Simulated success-empty, success-with-results, HTTP failure, malformed response, and timeout produce distinct correct states. |
| D05 | Make breach lookup optional with clear disclosure, a user control, and the applicable Firefox consent wiring. | A fresh install makes no breach request before consent; disabling the feature prevents further requests. Local checks remain usable. Verify current consent documentation. |
| D06 | Add bounded breach caching and rate-limit backoff. | Reopening the popup reuses fresh results; expiry and retry timing work; failures never become cached clean results. Keep cache transient for this release. |
| D07 | Introduce the per-tab analysis record and message contract. | Two tabs on the same hostname have separate results in focused tests. Document navigation identity and container/private context fields. Preserve legacy readers until migrated. |
| D08 | Move header results into the new records and handle navigation resets. | Redirects, navigation, and delayed old events cannot apply previous-page headers to the new page. Closed tabs release records. |
| D09 | Route content scans and popup refresh through shared analysis and messages. | Refresh invokes one analysis path, awaits completion, and preserves/recreates warnings. Remove the duplicated popup scan and migrate remaining readers. |
| D10 | Remove obsolete persistent scan records and enforce private-session handling. | Existing hostname-keyed scan data is cleared without deleting preferences. New scans retain no full URL history; private data never enters persistent storage or external lookups. |
| D11 | Correct form destination resolution. | Fixtures cover relative/empty actions, base URLs, submit-button overrides, and HTTP pages with HTTPS destinations. Document JavaScript-submission limits. |
| D12 | Make form/password monitoring respond to relevant dynamic changes. | Added fields and changed form destinations update findings; warnings do not duplicate; removed nodes do not accumulate. Bound observer work. |
| D13 | Add a compact settings page for existing features and site exclusions. | Settings survive restart; an excluded site stops analysis and removes injected UI. This does not yet redesign host permissions. |
| D14 | Make the existing popup keyboard- and screen-reader-friendly. | Focus order, button names, contrast, non-color status text, and status announcements work. Avoid a visual redesign. |
| D15 | Polish presentation and add lightweight extension icons. | Inspect dark/light themes, long domains, zoom, and popup overflow. Use simple local assets; avoid an image-generation or branding project. |
| D16 | Audit the Firefox manifest, actual permissions, stable ID, and minimum version. | Linter passes for the chosen minimum; unused cookies permission is removed until needed. Explain broad monitoring access accurately. |
| D17 | Update the README, privacy statement, and limitation wording. | Links point to PrivacyMonitor; documented transmissions/retention match code; preserve GPL-3.0 and required notices. No claims of comprehensive protection. |
| D18 | Run the beta acceptance matrix and record exact failures. | Check multiple tabs, redirects, offline/API errors, excluded sites, restricted pages, dynamic forms, and private browsing. This session diagnoses; avoid an unlimited repair loop. |
| D19 | Fix the highest-priority beta regression and add its focused check. | The reproduced failure passes. If more release blockers remain, repeat as D19a/D19b on later days before D20. |
| D20 | Prepare the Firefox submission package and listing materials. | Build/lint pass; data declarations, screenshots, reviewer steps, source/build instructions, and package contents are verified. Submission remains a separate explicit user action. |

Release gate: D20 is submission-ready only after D01-D19 acceptance checks pass, browser testing is complete, and current Mozilla policy requirements have been verified. AMO approval time is outside the schedule.

## Core days 21-40: useful privacy analysis

These depend on the stable analysis records and consent/settings from the beta. Finish one vertical feature before moving to the next.

| Day | One deliverable | Acceptance check / boundary |
| --- | --- | --- |
| D21 | Add shared site/domain matching using a maintained public-suffix-aware solution. | Fixtures cover subdomains, multi-part suffixes, localhost, IP addresses, and internationalized names. Do not equate company ownership with same-site identity. |
| D22 | Choose and bundle a small tracker-classification dataset and adapter. | Record source, version, license, update method, and unknown handling. Match known and unknown fixtures; no remote code. |
| D23 | Capture bounded request metadata for the current tab/navigation. | Capture accessible request domains/types without bodies or sensitive URL components. Navigation resets records; memory has a documented cap. |
| D24 | Classify observed requests using D21-D23. | Distinguish first-party, unclassified third-party, and known-tracker matches. Test deduplication and unavailable ownership/category data. |
| D25 | Show tracker details in the popup or a small details view. | Each finding shows domain, observed activity, classification evidence, and dataset date. Make no claim about blockers' actions that cannot be observed. |
| D26 | Add on-demand versus continuous monitoring permission behavior. | Test denied, granted, and revoked access. Explain that an on-demand scan cannot reconstruct past requests or headers; request optional access from a user gesture. |
| D27 | Add cookie metadata collection with optional permission. | Scope by active tab, container/store, and partition; discard values immediately. Revoked permission shows unavailable, not zero cookies. |
| D28 | Display the cookie inspector. | Show domain, expiry/session status, Secure, HttpOnly, SameSite, and partition. Unknown purpose stays unknown; no cookie editing/deletion in this slice. |
| D29 | Evaluate HSTS, nosniff, and Referrer-Policy values. | Use positive/negative fixtures and explain applicability. A present but ineffective value is not automatically green. |
| D30 | Evaluate a bounded set of CSP and framing-policy findings. | Separate enforced/report-only policy and account for frame-ancestors/X-Frame-Options. Explicitly document unsupported cases; no full CSP compliance engine. |
| D31 | Replace the password heuristic with a locally bundled estimator. | Representative common passwords and passphrases behave sensibly. No network requests or persistent passwords; control dictionary/package size. |
| D32 | Refine password feedback controls and lifecycle. | Enable/disable works immediately; switching fields does not show stale feedback; cleanup works. Verify relevant dynamic input cases. |
| D33 | Collect mixed-content observations from accessible evidence. | Fixtures distinguish insecure URLs referenced by markup from observed request outcomes. Do not infer successful loading solely from a DOM URL. |
| D34 | Present mixed-content findings and limitations. | UI differentiates observed, attempted, and unknown outcomes where available. Browser-blocked traffic is not presented as successfully loaded. |
| D35 | Capture Firefox TLS/certificate metadata for the page. | Verify API/permission requirements; handle unavailable information and navigation correctly. Avoid expanding into a remote certificate scanner. |
| D36 | Display connection details. | Show available protocol, issuer, validity dates, and evidence limits. HTTPS/certificate validity is not described as proof of site trustworthiness. |
| D37 | Add on-demand localStorage/sessionStorage usage metadata. | Read only accessible storage in permitted contexts; do not retain values or sensitive key names. Label byte counts as estimates and scope limits clearly. |
| D38 | Measure and fix one performance bottleneck. | Record before/after measurements on a repeatable page: observer work, request-record memory, popup load, or password estimator cost. |
| D39 | Run integration checks for the new features. | Exercise permission revocation, tab/container isolation, navigation, offline behavior, and capped memory. Record blockers; schedule each substantial repair separately. |
| D40 | Prepare the next release and its change notes. | Relevant checks pass, disclosures match new behavior, package notices are complete, and release blockers are resolved. Do not silently publish. |

## Optional advanced tracks

Choose one track after D40. Each numbered entry is a separate session. These are bounded first versions, not promises of production completeness; add repair/validation sessions where evidence requires them. They are not prerequisites for the first Firefox release.

### A: full-page investigation dashboard (5 sessions)

- A1: Build a details-page shell reading the current analysis record; verify empty/stale states.
- A2: Add tracker/request filters; verify counts against the underlying record.
- A3: Add cookie/security panels; preserve evidence and unknown states from the popup.
- A4: Add user-triggered redacted export; inspect an export for URLs, credentials, and identifiers.
- A5: Check accessibility and large bounded datasets; fix one reproduced issue at a time.

### B: local history and change alerts (6 sessions; after A)

- B1: Add an explicit history opt-in and minimal versioned summary schema; verify private sessions are excluded.
- B2: Save bounded daily/domain summaries without sensitive URLs or raw requests; test deduplication.
- B3: Implement expiry, clear-history, and disable behavior; verify existing records follow the chosen policy.
- B4: Compare equivalent observations across visits; distinguish real changes from incomplete capture and dataset updates.
- B5: Display history and comparisons in the dashboard; test missing/expired records.
- B6: Add optional change notifications with cooldown; verify disabled/private modes stay quiet.

### C: optional tracker blocking (7 sessions)

- C1: Verify current Firefox blocking APIs and choose a narrow rule format; record permission and license implications.
- C2: Implement a disabled-by-default engine for a tiny fixture ruleset; verify only intended requests match.
- C3: Add explicit enable/disable controls; verify disabling removes active rules immediately.
- C4: Add per-site exceptions and temporary pause; check restoration behavior.
- C5: Display only evidenced blocking outcomes; do not count other blockers' actions as this extension's.
- C6: Add validated dataset/rule updates with rollback to a working version; test a corrupt update.
- C7: Check common login, video, payment, and embedded-content flows; record breakage and repair before release.

### D: fingerprinting indicators (6 sessions)

- D1: Write a feasibility note for one API family, including execution-world limits, permissions, and false positives. This is a go/no-go checkpoint.
- D2: Prototype one indicator on controlled fixtures behind a disabled setting; retain no fingerprint output or page secrets.
- D3: Attribute observations to a page/frame/source only where evidence supports it; validate messages entering privileged extension code.
- D4: Add bounded counters, lifecycle cleanup, and a simple confidence rule; test legitimate and suspicious fixtures.
- D5: Show evidence and coverage limits; describe indicators rather than definitive tracking verdicts.
- D6: Test compatibility/performance and rollback. If instrumentation is unreliable, keep it experimental and revise the design.

### E: library/advisory identification (6 sessions)

- E1: Select a licensed advisory source and define a supported subset of libraries; verify distribution/update terms.
- E2: Implement one local version detector with known/unknown fixtures; avoid downloading or executing site code.
- E3: Add version-range matching with positive, negative, and ambiguous cases.
- E4: Display potential matches, evidence, and advisory links; do not claim the vulnerability is exploitable on the site.
- E5: Add a bounded data-only update mechanism with validation and last-known-good fallback.
- E6: Test bundled/minified/modified-library false positives and overhead; publish coverage limitations.

### F: user-triggered compromised-password check (5 sessions)

- F1: Verify HIBP's current range API and Mozilla disclosures; implement an explicit opt-in that makes no premature requests.
- F2: Implement transient local hashing and prefix generation with fixtures; never persist passwords or full hashes.
- F3: Implement padded range lookup, timeout, and errors; never query on each keystroke.
- F4: Add a user-triggered check and local suffix matching; verify no-match differs from unavailable and clear transient state.
- F5: Inspect actual outbound requests and disabled/private behavior; document the remaining external disclosure.

### G: Firefox MV3 migration (5 sessions)

- G1: Verify current Mozilla migration requirements and map changed manifest/API behavior; lock the target compatibility baseline.
- G2: Create the MV3 manifest/build variant while keeping the working release recoverable; lint the variant.
- G3: Adapt background state to event-page suspension/restart; test that stale state is not reused.
- G4: Adapt host permissions, injection, and consent behavior; test grant/revoke paths and unavailable observations.
- G5: Run the release acceptance matrix and prepare migration notes. Resolve blockers before switching the distributed build.

### H: additional browser targets (separate tracks after G)

- H1: Inventory current Chromium API gaps and select supported features; do not promise full Firefox parity.
- H2: Add the Chromium manifest and minimal API adapter; verify installation.
- H3: Adapt background lifecycle/storage and test worker restart.
- H4: Adapt monitoring/blocking permissions and disclose feature differences.
- H5: Run Chromium acceptance checks and prepare its package; submission is a separate action.
- H6: Inventory Firefox Android API/UI gaps and select a tested minimum version.
- H7: Adapt popup/settings interaction for touch and small screens.
- H8: Test installation, permissions, and lifecycle on an actual Android environment and prepare a separate release checklist.

Account/email breach monitoring remains outside these tracks until there is a separate decision on service cost, credential custody, and data handling.

## Reusable daily prompt

Implement only Day DXX from DAILY_PLAN.md for Privacy Monitor. Read the shared constraints, that day's row, and PROGRESS.md, then inspect the source needed for this task. Check prerequisites against the current code. Preserve unrelated work and use one agent. Keep changes bounded; avoid unrelated refactoring, new features, or publishing. Add meaningful checks for changed logic and run the relevant checks. If the scope is larger than one focused session, finish a safe smaller slice and record the remainder without marking the day complete. Update PROGRESS.md. Finish with a short account of what changed, verification performed, any pending browser check, and the next exact task. Do not start the next day.

## Release reference points

Use these when the selected task needs API/policy verification; do not browse every source every day.

- [Mozilla web-ext commands](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Firefox data collection consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Mozilla add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Firefox submission process](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Firefox background configuration](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
- [HIBP API](https://haveibeenpwned.com/API/v3)
