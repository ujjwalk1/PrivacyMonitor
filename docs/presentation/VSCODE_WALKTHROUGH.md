# VS Code walkthrough

Open **C:\Users\91851\OneDrive\Desktop\PrivacyMonitor-presentation** as the VS Code folder. Keep the original `priv-mon-new` folder closed during rehearsal so you do not accidentally load or edit the wrong copy.

The following eight tabs are the essential path through the current implementation. Paths are exact relative to the final repository root. Function names were checked in the reviewed source; use Ctrl+F to navigate. Runtime files have not moved or changed in the documentation reorganization.

## 1. manifest.json — entry points

[Open source](../../manifest.json). Navigate to `background`, `content_scripts`, `browser_action`, `options_ui` and `data_collection_permissions`.

**Purpose:** tells Firefox which scripts run where, what permissions exist and which popup/options pages to open.

**Explain:** MV2 with a persistent background; settings load before the content script; background order initializes the store before event producers. The manifest says version 1.1, not fifteen releases. Optional browsing-activity consent is distinct from broad page-monitoring access. The permission/minimum-version audit is still future work.

**Speaking note:** “This is the wiring diagram. Firefox runs the page scanner in web pages and keeps header state in the background. The popup is a view over their observations.”

**Next:** follow `content_scripts` into the code that examines a page.

## 2. content-script.js — observations and local hints

[Open source](../../content-script.js). Navigate in this order: `resolveFormDestination`, `analyzeInsecureForms`, `analyzePage`, `scheduleDynamicAnalysis`. For password questions, use `checkPasswordStrength` and `setupPasswordListeners`.

**Purpose:** computes page/count/form observations, shows password feedback and form banners, watches relevant DOM changes and handles refresh.

**Explain:** relative actions use `baseURI`; missing/empty actions use the document URL. Submitter overrides and native form ownership matter. One scan path serves startup and refresh. The normal-context guard precedes persistence, but local warnings can run privately. A 500 ms coalescing schedule reduces repeated scans; it is not a real-time guarantee.

**Speaking note:** “The banner says the form can submit over HTTP because we inspect possible markup routes. We do not capture or block submissions. Password feedback stays local and is only a heuristic.”

**Next:** show the new record model that will ultimately replace the scanner's remaining hostname storage.

## 3. analysis-records.js — identity and validation

[Open source](../../analysis-records.js). Navigate to `createStore`, its `begin` and `update` functions, and `createMessageHandler`.

**Purpose:** supplies bounded records with observation states and unique navigation generations.

**Explain:** each tab can have its own record; a new generation invalidates late writes. Payloads are checked, data is copied on input/output, and reads are restricted to the extension popup. The schema supports more sections than the current production migration uses.

**Speaking note:** “A hostname alone cannot identify which page produced a result. This store adds tab and navigation identity. Headers use it today; content observations are the remaining migration.”

**Next:** show the event producer that actually populates these records.

## 4. background.js — observed response headers

[Open source](../../background.js). Navigate to `fingerprint`, `publish`, `onHeadersReceived`, `onCompleted` and `onCommitted`.

**Purpose:** connects Firefox request/navigation events to the correct header record.

**Explain:** a response needs matching resource identity, completion and committed navigation before publication. Redirects and errors invalidate previous evidence. A 304 is not treated as a complete absence observation. Raw header values are not retained.

**Speaking note:** “This avoids showing one page's headers on another page. The matching is deliberately conservative: uncertainty produces unavailable evidence instead of a reassuring but stale result.”

**Next:** trace how the popup asks for this record and combines it with content observations.

## 5. popup.js — coordination and user actions

[Open source](../../popup.js). Navigate to `fetchHeaderData`, `loadAllData` and `refreshData`; keep `setBreachLookupEnabled` available.

**Purpose:** reads the active tab, loads local observations, obtains headers, controls optional lookup and renders state.

**Explain:** headers arrive through a validated runtime message; normal-tab content still arrives from hostname storage. Load-version and consent-revision checks discard stale UI updates. Refresh messages the existing content script and waits for its acknowledgement. It does not reload headers. Private/unknown context skips shared content and breach work.

**Speaking note:** “The popup combines evidence, but it does not pretend missing data is a pass. A refresh reuses the same scanner instead of injecting a second implementation.”

**Next:** isolate the small deterministic function that decides the numeric score.

## 6. scoring.js — explainable calculation

[Open source](../../scoring.js). Navigate to `HEADER_WEIGHTS` and `calculateSecurityScore`.

**Purpose:** computes a local technical observation score without DOM, storage or network access.

**Explain:** HTTPS 40, headers up to 40, no detected HTTP password forms 20. Header weights total 42 and are normalized. Missing or conflicting scoring inputs return null. Cookies, scripts and breach history do not affect the number.

**Speaking note:** “The maximum now really is 100. It measures these technical observations, not whether the site is trustworthy. We withhold the number when required evidence is missing.”

**Next:** show why historical breach information is separately fetched and displayed.

## 7. breach-service.js — optional external boundary

[Open source](../../breach-service.js). Navigate to `lookup`, `retryDelay` and `clear`.

**Purpose:** provides one privileged service shared by popup openings, with consent/context checks, timeout, caching and backoff.

**Explain:** only a hostname is accepted; private/unknown contexts are rejected before cache use. Permissions are rechecked. Four pending operations, 32 cached hosts, ten-minute TTL, per-entry retention cap and an eight-second request deadline bound service work. Revocation clears results/cancels work but keeps cooldown for the current session.

**Speaking note:** “This is the only application-defined external lookup. The user chooses it, the service sees the hostname and connection IP, and a failure never becomes a clean result.”

**Next:** contrast optional external consent with local display preferences.

## 8. settings.js — small persistent preference contract

[Open source](../../settings.js). Navigate to `KEY`, `defaults`, `normalize` and `read`.

**Purpose:** defines one versioned local-storage key and validates two display controls.

**Explain:** password feedback and form banners default on. Invalid/unreadable settings suppress hints; they are not silently interpreted as consent. `options.js` writes this key, and the content script responds to storage changes. Hiding hints does not stop analysis; site exclusions are unfinished.

**Speaking note:** “These switches control what appears on the page. They are separate from external-lookup consent and do not yet implement per-site exclusions.”

**Finish:** return to the [architecture diagram](../ARCHITECTURE.md) and [roadmap](../ROADMAP.md), then summarize the remaining migration and browser acceptance.

## Only open if asked

| Question | Additional file and navigation |
| --- | --- |
| How does a record listener start? | [analysis-background.js](../../analysis-background.js), store initialization and listener registration. |
| How are unknown/error states mapped? | [popup-state.js](../../popup-state.js), `local`, `breaches`, `legacyHeaders`. |
| Where are keyboard/theme details? | [popup.html](../../popup.html), headings, `role="status"`, `aria-live`, focus styles and `prefers-color-scheme`. |
| How do settings save/error states work? | [options.js](../../options.js), `save`; [options.html](../../options.html), controls and status. |
| What proves the score? | [scoring.test.mjs](../../tests/scoring.test.mjs), boundary and incomplete-input cases. |
| What proves navigation isolation? | [header-navigation.test.mjs](../../tests/header-navigation.test.mjs), redirects, delayed events and tab closure. |
| What proves private guards? | [private-context.test.mjs](../../tests/private-context.test.mjs). |
| What exercises dynamic changes? | [dynamic-content.test.mjs](../../tests/dynamic-content.test.mjs), plus [the actual fixture](../../tests/fixtures/dynamic-forms.html). |
| What goes into the package? | [extension-files.json](../../tools/extension-files.json) and [package.ps1](../../tools/package.ps1). |
| What is unfinished? | [PROGRESS.md](../development/PROGRESS.md), [VERIFICATION.md](../development/VERIFICATION.md), [ROADMAP.md](../ROADMAP.md). |

For the first minute, have **manifest.json, content-script.js and popup.js** open, with this walkthrough in Markdown preview. Add the other five in the order above when rehearsing the source explanation.
