# Privacy Monitor

A Firefox Manifest V2 extension for observing page connections, security-header
presence, HTTP form destinations, and cookie/script counts, with local password
strength feedback and a separate historical breach lookup.

**Development status:** D01–D08 implementation is present, including per-tab header capture. Partial D09 unifies local scan/refresh; partial D10 adds privacy guards. D11 corrects form destination resolution; D12 adds bounded dynamic monitoring. Partial D13 adds on-page display settings; site exclusions remain unimplemented. Content-record migration and old-data cleanup remain pending. The local tests, local lint,
package verification, and mocked popup wording review pass. Installed-Firefox
acceptance is still pending; this is not a submission-ready release. The manifest
version remains `1.1`.

[Development guide](docs/DEVELOPING.md) · [Score rules](docs/SCORING.md) ·
[Popup states](docs/POPUP_STATES.md) · [Current progress](PROGRESS.md) ·
[Daily plan](DAILY_PLAN.md)

## Features implemented through D15 (partial D09/D10/D13; acceptance pending)

| Day | Implemented additions | Verification and limits |
| --- | --- | --- |
| **D01 — Recoverable baseline and local tooling** | Recoverable source baseline; dependency-free startup smoke tests and local lint; an allowlisted Windows package command with file-hash verification; Firefox loading and recovery instructions. | Local commands pass. Original recovery ZIPs are local-only; Git history also preserves the baseline. Live Firefox loading checks remain pending. |
| **D02 — Documented page score** | A pure 0–100 scorer: HTTPS **40**, weighted header presence **40**, no observed HTTP password forms **20**. Complete best/worst observations reach 100/0. Missing or invalid required inputs return no score. Historical breaches, cookies, and third-party script counts do not affect the score. Local scoring does not wait for the breach lookup. | Tests cover boundaries, deductions, missing/invalid inputs, and breach independence. The score is an observation heuristic, not a safety guarantee. [Rules and limits](docs/SCORING.md). |
| **D03 — Honest popup states** | Explicit loading, incomplete, unavailable, unsupported-page, and ready states. Missing evidence stays neutral; available partial observations remain visible. Reloads clear old results, and superseded requests cannot overwrite a newer popup load. Failed/malformed breach results no longer look like successful empty results. Includes local visual fixtures. | State tests and mocked browser wording review pass. Installed-Firefox checks remain open. [State mapping](docs/POPUP_STATES.md). |
| **D04 — Bounded breach lookup** | Distinct empty, records, HTTP error, network error, malformed response, and timeout outcomes. An eight-second deadline covers the request and body read, aborts stalled work, and clears its timer. Late results cannot restore stale success; the local score remains independent. | Simulated outcome/timeout tests and all six mocked browser previews pass. Installed-Firefox checks remain open. [Outcome contract](docs/POPUP_STATES.md#breach-lookup-outcomes-d04). |

**D05 — Optional breach lookup:** off on fresh installation, with a clear disclosure
and Enable/Disable controls backed by Firefox's optional Browsing activity consent.
Disabling/revoking consent cancels pending lookup work; missing consent support
leaves lookup off while local checks work. Tests and mocked control previews pass;
native Firefox acceptance remains pending. [Consent and checks](docs/BREACH_CONSENT.md).

**D06 — Transient breach cache and backoff:** shared background results last up to
10 minutes, with at most 32 hostnames and bounded retained data. Concurrent requests
for one hostname share work. HTTP 429 pauses further uncached lookups across pages;
retry timing is explicit, and no retry runs automatically. Failures are never cached
as clean results. [Limits and pending checks](docs/BREACH_CACHE.md).

**D07 — Per-tab record and message foundation:** a bounded in-memory store keeps
separate observations and navigation identities per tab, with explicit container
and private-context fields and a validated read-only popup message contract.
Focused tests pass. D08 connects headers; remaining scans/readers move in D09.
Real Firefox integration remains pending. [Contract and migration](docs/ANALYSIS_RECORDS.md).

**D08 — Headers scoped to tab navigation:** main-frame responses enter the transient
record only after request completion and matching page commitment. Navigation,
redirects, errors, and closed/replaced tabs discard earlier evidence. The popup
reads headers through the D07 message contract; missing or uncertain capture stays
unknown. No new hostname header records or raw header values are stored. The new
`webNavigation` permission supplies navigation boundaries. Native Firefox checks
remain pending. [Lifecycle and acceptance checklist](docs/HEADER_LIFECYCLE.md).

**D09 — Partial shared scan/refresh:** startup and popup refresh now use the same
content-script scan, await persistence, and preserve/recreate form warnings. The
duplicate injected scanner and fixed delay are removed. Content-record migration,
remaining popup readers, and native Firefox acceptance are still pending.
[Implemented portion and exact remainder](docs/SCAN_REFRESH.md).

**D10 — Partial privacy safeguards:** new scan summaries omit full URLs. Private
or unknown contexts cannot write scan records, read shared legacy content records,
or use breach requests/cache, even with consent. Page warnings still work locally;
private popup content observations remain incomplete pending D09. Existing stored
rows are not yet removed because D09's migration is unfinished.
[Safeguards and remaining cleanup](docs/PRIVATE_HANDLING.md).

**D11 — Form destination resolution:** relative actions use the document base;
missing/empty actions use the document URL. Associated submit-button overrides,
including external and image controls, are checked independently. HTTP pages with
HTTPS destinations are classified by the destination. Unsupported routes make form
observations unavailable instead of awarding a complete score. Automated fixtures
pass; native Firefox acceptance remains pending.
[Rules, JavaScript limits, and browser fixture](docs/FORM_DESTINATIONS.md).

**D12 — Dynamic monitoring:** form/password additions, removals, destination and
ownership changes, and base changes now update findings through coalesced scans.
Warnings repair without duplication; shared password handlers avoid a retained
registry of old fields. Mutation bursts and slow writes do not build a scan backlog.
Automated checks pass; native Firefox acceptance remains pending.
[Bounds, limits, and browser checks](docs/DYNAMIC_MONITORING.md).

**D13 — Partial on-page settings:** a compact settings page saves controls for
password-strength feedback and HTTP password-form warnings, and applies changes
to open pages. These control visible hints; analysis and popup findings continue.
Site exclusions are not implemented. Native settings/restart checks remain pending.
[Implemented portion and exact remainder](docs/SETTINGS.md).

**D14 — Popup accessibility:** semantic headings, visible keyboard focus, stable
button order, higher-contrast status text, accessible score descriptions, and
polite result announcements. Automated checks and mocked browser keyboard checks
pass; installed-Firefox and screen-reader acceptance remain pending.
[Behavior and native acceptance checklist](docs/POPUP_ACCESSIBILITY.md).

**D15 — Popup presentation and icons:** light/dark palettes, wrapping for long
hostnames and results, responsive layout, spaced consent controls, and small local
SVG extension/toolbar icons. Tests and local theme/reflow previews pass; native
Firefox theme, toolbar, zoom and popup checks remain pending.
[Presentation evidence and pending checks](docs/POPUP_PRESENTATION.md).

### Existing monitoring features

- **Password feedback:** local checks for length, character variety, and common
  patterns, with suggestions beside password inputs. This is a heuristic estimator.
- **Connection and headers:** HTTP/HTTPS observations and presence checks for CSP,
  HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and
  Permissions-Policy. Header values are not evaluated for effectiveness.
- **Form warnings:** scans form destinations for HTTP and adds a warning to
  detected HTTP password forms. These are possible markup destinations, not
  observed submissions; JavaScript and dynamic changes have known limitations.
- **Page counts:** cookies accessible through `document.cookie`, script elements,
  and scripts whose hostname differs from the page. These counts are not a cookie
  inspector or tracker classification system.
- **Historical breaches:** a domain lookup through Have I Been Pwned, displayed
  separately from the page score. The popup shows up to three recent records.
- **Popup refresh:** awaits the shared content-script scan and preserves warnings. A failed refresh shows
  unavailable and clears the old score; the scanner itself still has limitations.

## Try the development extension

Clone or download [this repository](https://github.com/ujjwalk1/PrivacyMonitor):

```sh
git clone https://github.com/ujjwalk1/PrivacyMonitor.git
cd PrivacyMonitor
```

1. Use a disposable Firefox test profile and non-sensitive test pages.
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
3. Select the repository-root `manifest.json`.
4. Reload an ordinary HTTP/HTTPS page, then open Privacy Monitor from the
   extensions menu. Header observations require a page load after installation.
5. Follow the [Firefox checklist](docs/DEVELOPING.md#load-and-check-in-firefox)
   and record results in [PROGRESS.md](PROGRESS.md).

Temporary installation ends when Firefox restarts. A tested minimum Firefox
version has not yet been selected; Firefox 156.0.1 was found on the development
machine, but installation there has not been verified.

## Local checks and packaging

Use Node.js 24 LTS and Windows PowerShell 5.1+ or PowerShell 7. The recorded runs
used Node 24.19.0. From the repository root, no dependency installation is needed:

```powershell
node --test tests/*.test.mjs
node tools/lint.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
```

The package command creates `dist/privacy-monitor-1.1.zip`, containing only the
16 extension files listed in [tools/extension-files.json](tools/extension-files.json),
and verifies their contents against the source. It is an unsigned development
package. Local lint checks syntax and package references; it is not Mozilla's
add-on validator.

To inspect the popup using synthetic data without making breach requests:

```powershell
node tests/popup-preview.mjs
```

Open `http://127.0.0.1:4179/` and stop the server with Ctrl+C when finished.
The [preview guide](docs/POPUP_STATES.md#verification-and-next-browser-check)
explains its mocked APIs and limitations.
For D15's light/dark, icon, long-content and zoom-simulation fixtures, open
`http://127.0.0.1:4179/presentation.html`.

## Repository layout

```text
PrivacyMonitor/
├── README.md                  # Overview, features, and quick start
├── LICENSE                    # GPL-3.0 license
├── DAILY_PLAN.md               # Sequenced work plan; proposed work is not completed work
├── PROGRESS.md                 # Current handoff and pending acceptance checks
├── manifest.json              # Firefox MV2 entry point
├── icon*.svg                  # Local default/light/dark extension icons
├── analysis-records.js        # D07 record schema, store, and read-only message contract
├── analysis-background.js     # D07 store/listener initialization
├── background.js              # D08 navigation-scoped response-header capture
├── breach-service.js          # Transient shared lookup, cache, and rate-limit timing
├── content-script.js          # Page, password, and form observations
├── settings.js                # Partial D13 display-preference schema and reader
├── options.html               # On-page settings UI
├── options.js                 # Persistent display controls
├── popup.html                 # Popup markup and styles
├── popup.js                   # Popup loading, rendering, and refresh
├── popup-state.js             # Observation-to-display state mapping
├── scoring.js                 # Pure page-score calculation
├── docs/
│   ├── ANALYSIS_RECORDS.md    # D07 record/message contract and migration boundaries
│   ├── PRIVATE_HANDLING.md    # Partial D10 safeguards and cleanup prerequisites
│   ├── FORM_DESTINATIONS.md   # D11 resolution rules, limits, and browser fixture
│   ├── DYNAMIC_MONITORING.md  # D12 observer bounds, lifecycle, and browser checks
│   ├── SETTINGS.md            # Partial D13 settings, limits, and exclusion remainder
│   ├── SCAN_REFRESH.md        # Partial D09 and remaining migration/browser checks
│   ├── HEADER_LIFECYCLE.md    # D08 correlation rules and Firefox acceptance checks
│   ├── DEVELOPING.md           # Commands, recovery, and Firefox checklist
│   ├── SCORING.md              # D02 weights, inputs, and limits
│   ├── POPUP_STATES.md         # D03 states, D04 breach outcomes, and previews
│   ├── BREACH_CACHE.md         # D06 cache, retry policy, and Firefox checks
│   └── BREACH_CONSENT.md       # D05 disclosure, consent, and Firefox checks
├── tests/
│   ├── *.test.mjs             # Smoke, scoring, popup-state, and breach tests
│   ├── helpers/               # Shared test harness
│   ├── fixtures/              # Synthetic browser-preview data
│   └── popup-preview.mjs      # Local-only preview server
└── tools/
    ├── extension-files.json   # Package allowlist
    ├── lint.mjs               # Dependency-free local checks
    └── package.ps1            # Build and verify the development ZIP
```

The extension files stay at the root so temporary loading and packaging keep the
same entry points. Generated `dist/`, `checkpoints/`, `node_modules/`, and
`web-ext-artifacts/` are ignored. Local recovery archives and screenshots are not
required for a fresh clone.

## Current privacy behavior and limitations

- Breach lookup starts **off**. After Firefox consent, opening or refreshing an
  normal tab's popup reuses a fresh cached result or sends its **hostname** to Have I Been Pwned, which also sees
  the connection IP address. New requests wait out any rate-limit cooldown.
  Results stay only in background memory; reload/restart and consent revocation clear them.
  Requests omit credentials/referrers and contain no
  page path, query, password, cookie value, or score. Disable it in the popup or
  Firefox add-on permissions. Without native consent support, lookup stays off.
- New normal-tab scans store observation summaries without full URLs. Private or
  unknown-context scans do not write them, and private popups do not read shared
  content records or use breach lookup/cache. Local warnings remain available;
  private popup scores remain incomplete until D09's migration is finished.
- Older stored records may still contain full URLs and earlier private data.
  Hostname-keyed normal-tab records can be stale or shared across tabs. Headers use
  transient per-tab records. D09's remaining migration must precede D10's targeted
  old-record cleanup; no preferences or historical rows were deleted in this slice.
- Password feedback runs locally. The implementation does not persist password
  values or include them in the breach lookup.
- The manifest requests HTTP/HTTPS host access, `activeTab`, `storage`,
  `cookies`, `scripting`, `webRequest`, and `webNavigation`. The latter resets and
  binds header observations to page navigation. The broad monitoring permissions
  and currently unused `cookies` permission await the D16 audit.
- Non-HTTP/HTTPS URLs are unsupported. Firefox can also restrict access to some
  HTTPS pages. Missing observations do not mean a page passed a check.
- Breach requests now time out after eight seconds. Failures mean unavailable
  evidence. Fresh successful results are cached for 10 minutes; HTTP 429 applies
  shared backoff. Reopen or refresh after the wait to retry; there is no automatic retry.
- Refresh now shares the content scan, but content records still use hostname storage.
  Dynamic form handling, header-value evaluation, and isolation of the remaining
  content scans remain unfinished. A score of 100 does not establish site trustworthiness.

## Roadmap and validation

[DAILY_PLAN.md](DAILY_PLAN.md) is the source of planned work.
[PROGRESS.md](PROGRESS.md) records what was implemented and what remains unverified.
D01–D08's live Firefox checks must be resolved before treating the baseline as
accepted. No later day is claimed as complete.

The original v1.0 introduced password feedback and basic page counts. v1.1 added
header capture, historical breach lookup, form warnings, and the sectioned popup.
D02 subsequently replaced the score formula and removed the breach-history
penalty; D03 added the explicit display states described above.

## License and support

Licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE).

- [Report an issue](https://github.com/ujjwalk1/PrivacyMonitor/issues)
- Contact: nee103kn3@mozmail.com
