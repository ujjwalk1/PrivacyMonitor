# Privacy Monitor

A Firefox Manifest V2 extension for observing page connections, security-header
presence, HTTP form destinations, and cookie/script counts, with local password
strength feedback and a separate historical breach lookup.

**Development status:** D01–D04 are implemented. The 41 local tests, local lint,
package verification, and mocked popup wording review pass. Installed-Firefox
acceptance is still pending; this is not a submission-ready release. The manifest
version remains `1.1`.

[Development guide](docs/DEVELOPING.md) · [Score rules](docs/SCORING.md) ·
[Popup states](docs/POPUP_STATES.md) · [Current progress](PROGRESS.md) ·
[Daily plan](DAILY_PLAN.md)

## Features included through D04

| Day | Implemented additions | Verification and limits |
| --- | --- | --- |
| **D01 — Recoverable baseline and local tooling** | Recoverable source baseline; dependency-free startup smoke tests and local lint; an allowlisted Windows package command with file-hash verification; Firefox loading and recovery instructions. | Local commands pass. Original recovery ZIPs are local-only; Git history also preserves the baseline. Live Firefox loading checks remain pending. |
| **D02 — Documented page score** | A pure 0–100 scorer: HTTPS **40**, weighted header presence **40**, no observed HTTP password forms **20**. Complete best/worst observations reach 100/0. Missing or invalid required inputs return no score. Historical breaches, cookies, and third-party script counts do not affect the score. Local scoring does not wait for the breach lookup. | Tests cover boundaries, deductions, missing/invalid inputs, and breach independence. The score is an observation heuristic, not a safety guarantee. [Rules and limits](docs/SCORING.md). |
| **D03 — Honest popup states** | Explicit loading, incomplete, unavailable, unsupported-page, and ready states. Missing evidence stays neutral; available partial observations remain visible. Reloads clear old results, and superseded requests cannot overwrite a newer popup load. Failed/malformed breach results no longer look like successful empty results. Includes local visual fixtures. | State tests and mocked browser wording review pass. Installed-Firefox checks remain open. [State mapping](docs/POPUP_STATES.md). |
| **D04 — Bounded breach lookup** | Distinct empty, records, HTTP error, network error, malformed response, and timeout outcomes. An eight-second deadline covers the request and body read, aborts stalled work, and clears its timer. Late results cannot restore stale success; the local score remains independent. | Simulated outcome/timeout tests and all six mocked browser previews pass. Installed-Firefox checks remain open. [Outcome contract](docs/POPUP_STATES.md#breach-lookup-outcomes-d04). |

### Existing monitoring features

- **Password feedback:** local checks for length, character variety, and common
  patterns, with suggestions beside password inputs. This is a heuristic estimator.
- **Connection and headers:** HTTP/HTTPS observations and presence checks for CSP,
  HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and
  Permissions-Policy. Header values are not evaluated for effectiveness.
- **Form warnings:** scans form destinations for HTTP and adds a warning to
  detected HTTP password forms. Dynamic content and destination resolution have
  known limitations.
- **Page counts:** cookies accessible through `document.cookie`, script elements,
  and scripts whose hostname differs from the page. These counts are not a cookie
  inspector or tracker classification system.
- **Historical breaches:** a domain lookup through Have I Been Pwned, displayed
  separately from the page score. The popup shows up to three recent records.
- **Popup refresh:** requests another local scan. A failed refresh shows
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
seven extension files listed in [tools/extension-files.json](tools/extension-files.json),
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

## Repository layout

```text
PrivacyMonitor/
├── README.md                  # Overview, features, and quick start
├── LICENSE                    # GPL-3.0 license
├── DAILY_PLAN.md               # Sequenced work plan; proposed work is not completed work
├── PROGRESS.md                 # Current handoff and pending acceptance checks
├── manifest.json              # Firefox MV2 entry point
├── background.js              # Response-header capture
├── content-script.js          # Page, password, and form observations
├── popup.html                 # Popup markup and styles
├── popup.js                   # Popup loading, rendering, and refresh
├── popup-state.js             # Observation-to-display state mapping
├── scoring.js                 # Pure page-score calculation
├── docs/
│   ├── DEVELOPING.md           # Commands, recovery, and Firefox checklist
│   ├── SCORING.md              # D02 weights, inputs, and limits
│   └── POPUP_STATES.md         # D03 states, D04 breach outcomes, and previews
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

- Opening the popup on an analyzed page automatically sends its **hostname** to
  Have I Been Pwned. There is no opt-in control yet; disclosure/consent work is D05.
- Page scans persist the **full page URL** and observation summaries in extension
  local storage. Records are keyed by hostname and can be stale or shared across
  tabs. Per-tab records and retention/private-session fixes are planned for D07–D10.
- Password feedback runs locally. The implementation does not persist password
  values or include them in the breach lookup.
- The manifest requests HTTP/HTTPS host access, `activeTab`, `storage`,
  `cookies`, `scripting`, and `webRequest`. The broad monitoring permissions
  and currently unused `cookies` permission await the D16 audit.
- Non-HTTP/HTTPS URLs are unsupported. Firefox can also restrict access to some
  HTTPS pages. Missing observations do not mean a page passed a check.
- Breach requests now time out after eight seconds. Failures mean unavailable
  evidence; retries, caching, and rate-limit backoff are not automatic.
- Refresh still uses a duplicated injected scanner and can remove form warnings.
  Dynamic form handling, header-value evaluation, and tab/navigation isolation
  remain unfinished. A score of 100 does not establish site trustworthiness.

## Roadmap and validation

[DAILY_PLAN.md](DAILY_PLAN.md) is the source of planned work.
[PROGRESS.md](PROGRESS.md) records what was implemented and what remains unverified.
D01–D04's live Firefox checks must be resolved before treating the baseline as
accepted. No later day is claimed as complete.

The original v1.0 introduced password feedback and basic page counts. v1.1 added
header capture, historical breach lookup, form warnings, and the sectioned popup.
D02 subsequently replaced the score formula and removed the breach-history
penalty; D03 added the explicit display states described above.

## License and support

Licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE).

- [Report an issue](https://github.com/ujjwalk1/PrivacyMonitor/issues)
- Contact: nee103kn3@mozmail.com
