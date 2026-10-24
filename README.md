# 🔒 Privacy Monitor

A dependency-free Firefox browser extension that brings connection security, HTTP response header observations, insecure form warnings, optional data breach lookup, and local password feedback into a single popup.

**Development beta · Firefox Manifest V2 · GPL-3.0**
The extension version is 1.1 (Manifest V2). This is an unsigned development build for temporary installation. A signed Mozilla Add-ons release is planned after validation; this repository does not establish a submitted or approved release. Native Firefox acceptance remains pending; see [verification](docs/development/VERIFICATION.md).

---

## Table of Contents

- [What It Does](#what-it-does)
- [Installation](#installation)
- [Using the Extension](#using-the-extension)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Security Score](#security-score)
- [Privacy and Data Handling](#privacy-and-data-handling)
- [Permissions](#permissions)
- [Development](#development)
- [Roadmap](#roadmap)
- [Known Limitations](#known-limitations)
- [Changelog](#changelog)
- [License](#license)
- [Support](#support)

---

## What It Does

### 🌐 Connection Security
Detects whether the current page is served over HTTP or HTTPS and displays the result prominently in the popup with an HTTP/HTTPS status. HTTPS describes the connection scheme; it does not establish that a site is trustworthy.

---

### 🛡️ Security Header Observation
A background script correlates Firefox navigation and request events to capture HTTP response headers before the popup opens. Six headers are checked:

| Header | Relative Weight (normalized below) | Intended Purpose |
|---|---|---|
| `Content-Security-Policy` | 10 | Restricts sources for scripts, styles, and other resources |
| `Strict-Transport-Security` | 10 | Forces HTTPS on future visits |
| `X-Frame-Options` | 10 | Prevents clickjacking via iframes |
| `X-Content-Type-Options` | 5 | Blocks MIME-type sniffing |
| `Referrer-Policy` | 5 | Controls referrer information sent with requests |
| `Permissions-Policy` | 2 | Restricts access to browser APIs (camera, mic, etc.) |

These are header-presence observations, not validation that the policy values achieve their intended purpose. The relative weights total 42 and are normalized to at most 40 score points.

New header results are stored in a bounded per-tab in-memory record store, not persisted to disk. Header evidence is tied to a specific tab navigation and invalidated on redirect, failed load, or new navigation.

---

### 📋 Insecure Form Detection
Scans every accessible `<form>` in the top-level document for destinations that could submit over HTTP:

- Explicit `action="http://..."` attributes
- Relative-path actions resolved against the document base URL, plus missing/empty actions resolved against the document URL
- Submit-button `formaction` overrides
- Dynamically added or modified forms via a MutationObserver

Insecure password forms get a visible warning banner injected directly into the page. Form scan results contribute to the security score. Warnings are retained and repaired across popup-triggered refreshes.

---

### 🔑 Password Strength Feedback
Provides local feedback while typing into password fields in accessible top-level documents:

- A floating indicator appears below the focused input
- Scores on length (8+ and 12+ character thresholds), lowercase, uppercase, digits, and special characters
- Detects common weak patterns: `123`, `abc`, `password`, `qwerty`
- Color-coded label: Very Weak / Weak / Medium / Strong, with specific improvement suggestions
- Privacy Monitor reads password values transiently and does not store, log or transmit them; this does not prevent the website from reading its own inputs
- Input updates are coalesced with a 300 ms timer; one shared indicator is reused across supported inputs

The strength label is a simple local heuristic, not a measured cracking time or a check against breached passwords. Password feedback and form warning banners can be toggled in **Settings**.

---

### 🍪 Privacy Counts
Collects observable page metrics:

- **Cookies**: count via `document.cookie` (excludes HttpOnly cookies)
- **Scripts**: total `<script>` elements on the page
- **Third-party scripts**: scripts whose `src` hostname differs from the page hostname

These counts are informational. They do not affect the security score and are not classified against a tracker list in the current version.

---

### 🔓 Data Breach Lookup *(opt-in)*
Checks the current page's hostname against the [Have I Been Pwned](https://haveibeenpwned.com) breach database. This feature is **off by default** and requires explicit consent via Firefox's `browsingActivity` optional permission.

When enabled:
- The page hostname (never the full URL, credentials, or referrer) is sent to HIBP; the service also receives the connection IP address
- Successful results are reusable for 10 minutes; expired entries are pruned on a later permitted lookup, not by a deletion timer
- A maximum of 4 concurrent lookups and 32 cached hosts are maintained
- Rate-limit responses use `Retry-After` when valid, with exponential fallback backoff; retries are user-triggered
- Successful consent revocation clears cached results and cancels pending work; a request already received by the service cannot be retracted
- Private browsing and unknown privacy contexts cannot use this feature

A breach result is shown separately from the security score and does not affect the numeric score. The exact page hostname is queried without parent-domain normalization; a subdomain can return different results from its parent. When consent is enabled, localhost, IP addresses and internal hostnames are not excluded. Keep lookup off on pages whose hostname you do not want to share. See [Privacy and Data Handling](#privacy-and-data-handling).

---

### ⚙️ Settings Page
A dedicated options page (accessible from the popup) lets you:

- Toggle password strength feedback on/off
- Toggle in-page form warning banners on/off

Settings are stored under a versioned key (`privacy_monitor_display_settings_v1`) and propagate to the content script via a storage change event. These controls hide feedback and banners; they do not stop scanning, erase saved observations, disable breach lookup or exclude a website.

---

### 📊 Security Score
A 0–100 composite score based solely on local observations. See [Security Score](#security-score) for the full breakdown.

---

### 🖥️ Popup Interface
- Score ring in the header showing the numeric score and a label (Excellent / Good / Fair / Poor / Incomplete)
- Sectioned cards for Connection, Security Headers, Form Security, Breach Lookup, and Privacy Counts
- Keyboard controls and status descriptions for screen readers are implemented; native Firefox and screen-reader acceptance remain pending
- Light and dark presentation using local SVG icons
- **Refresh Analysis** re-runs the content script scan without reloading the page (headers require a full page reload to recapture)
- Breach lookup consent can be granted or revoked directly from the popup

---

## Installation

### Manual / Developer Install (Firefox Desktop)

Requires Firefox desktop **142 or later**. This compatibility floor covers built-in optional breach consent; native Firefox validation is still pending. See the [manifest audit](docs/MANIFEST.md).

1. Clone or download the repository:
   ```bash
   git clone https://github.com/ujjwalk1/PrivacyMonitor.git
   cd PrivacyMonitor
   ```
2. Open Firefox and navigate to `about:debugging`
3. Click **This Firefox** in the left sidebar
4. Click **Load Temporary Add-on…**
5. Select `manifest.json` from the project root
6. Open **Privacy Monitor** through Firefox’s extensions menu; the add-on is listed as **Privacy & Security Monitor**
7. **Reload the page you want to analyse** after loading the extension — the background script needs to observe the navigation to capture headers

> Temporary installation ends when Firefox restarts. Re-load via `about:debugging` afterward. A signed release for persistent installation is planned after validation and submission.

### Firefox Add-ons Store
Not yet published. Watch this repository for updates.

---

## Using the Extension

**Viewing analysis:** Click the toolbar icon on a permitted HTTP/HTTPS page. If the score is incomplete, check which section is unavailable and reload the page. A hard refresh can help when cached responses omit header evidence, but cannot resolve restricted pages or every missing observation.

**Refreshing:** Click **Refresh Analysis** to re-run the content script scan on the current page. This does not reload the page and does not recapture response headers — reload the page for fresh header evidence.

**Password feedback:** Focus a password field in an accessible top-level document and start typing. The floating indicator appears automatically if password feedback is enabled in Settings.

**Form warnings:** If an insecure password form is found, a yellow warning banner is injected into the form on the page. This means the form *can* submit over HTTP according to its markup — it does not mean a submission was intercepted or blocked.

**Breach lookup:** Click the consent prompt in the popup to enable. Firefox will ask for the `browsingActivity` permission. You can revoke it from the popup or from Firefox's add-on permissions page at any time.

**Settings:** Click the Settings link in the popup to toggle password feedback and form banners.

---

## Project Structure

```
PrivacyMonitor/
├── manifest.json            # Permissions, background scripts, content script, popup, options, icons
├── background.js            # Navigation/request correlation; publishes header presence to per-tab records
├── analysis-records.js      # Strict per-tab record schema and bounded in-memory store (max 256 tabs)
├── analysis-background.js   # Read-only popup message listener for tab record retrieval
├── content-script.js        # DOM observation: connection, cookies, scripts, forms, password feedback
├── settings.js              # Reads and applies versioned display preferences
├── scoring.js               # Pure score calculation (no DOM, storage, or network)
├── popup-state.js           # Pure display-state mapping (incomplete/unavailable/error/value)
├── popup.html               # Popup markup
├── popup.js                 # Popup orchestration: data retrieval, breach consent, rendering, refresh
├── breach-service.js        # Optional HIBP hostname lookup with caching, rate-limit backoff, consent
├── options.html             # Settings page markup
├── options.js               # Saves versioned display preferences
├── icon.svg                 # Default extension icon
├── icon-light.svg           # Light-theme icon variant
├── icon-dark.svg            # Dark-theme icon variant
├── .gitignore
├── CHANGELOG.md             # Implemented changes and outstanding items
├── CONTRIBUTING.md          # Setup, checks and review expectations
├── LICENSE                  # GNU GPL v3.0
├── docs/
│   ├── README.md            # Documentation index
│   ├── ARCHITECTURE.md      # Components, data flow, storage and score boundaries
│   ├── PRIVACY.md           # Storage, external services and data handling details
│   ├── ROADMAP.md           # Planned work and future priorities
│   ├── development/         # Internal day plans, progress notes, verification records
│   └── presentation/        # Briefing, source walkthrough, demonstration instructions
├── tests/                   # Dependency-free test files and controlled fixtures
│   └── popup-preview.mjs    # Local preview server with mocked APIs (port 4179)
└── tools/
    ├── lint.mjs             # Syntax and reference checks
    ├── check-docs.mjs       # Documentation consistency checks
    └── package.ps1          # PowerShell packaging script (produces dist/privacy-monitor-1.1.zip)
```

---

## How It Works

```
Page navigation begins
        │
        ├─► background.js
        │     Observes webRequest + webNavigation events
        │     Correlates request/response/completion with committed navigation
        │     Stores header presence in a bounded per-tab in-memory record
        │     (max 256 tabs; invalidated on new navigation, redirect, or tab close)
        │
        ├─► content-script.js  (injected into accessible pages)
        │     Reads display preferences via settings.js
        │     Observes document: protocol, cookies, script counts, form destinations
        │     Attaches local password feedback to password inputs (delegated events)
        │     Injects in-page warning banners on insecure password forms
        │     Writes content summary to local storage (hostname-keyed, normal tabs only)
        │     MutationObserver coalesces dynamic rescans (500 ms timer; batches over 64 entries schedule one scan)
        │
User opens popup
        │
        └─► popup.js
              Queries active tab context
              Requests per-tab header record via analysis-background.js message listener
              Reads saved content summaries only when their document marker matches the current page
              Passes data through popup-state.js (display-state mapping)
              Calculates score via scoring.js (returns null if observations incomplete)
              Renders all sections with explicit incomplete/unavailable/error states
              Optionally contacts breach-service.js for HIBP lookup (consent required)
```

---

## Security Score

The score is calculated by `scoring.js` as a pure function from local observations only. It returns `null` if any required observation is missing or invalid — an incomplete score is shown explicitly rather than displaying a misleading number.

| Signal | Points |
|---|---|
| HTTPS connection | 40 |
| All 6 security headers present (weighted, max 40) | up to 40 |
| No insecure HTTP password forms detected | 20 |
| **Maximum** | **100** |

Header weights: CSP = 10, HSTS = 10, X-Frame-Options = 10, X-Content-Type-Options = 5, Referrer-Policy = 5, Permissions-Policy = 2 (total 42, normalized to 40).

Cookie counts, third-party script counts, and breach history do **not** affect the score. The score reflects what can be observed in the page response and document — not a guarantee of site safety.

| Range | Label |
|---|---|
| 80–100 | Excellent |
| 60–79 | Good |
| 40–59 | Fair |
| 0–39 | Poor |
| — | Incomplete (observations missing) |

---

## Privacy and Data Handling

Local checks run without breach consent. Privacy Monitor contains no analytics, telemetry or developer-operated collection endpoint; its only application-defined service request is the optional Have I Been Pwned hostname lookup.

- **Saved on this device:** display preferences and normal-context content summaries indexed by hostname, including counts, protocol flags, timestamps and a random document marker. Summaries have no automatic expiry or global row cap. Same-host tabs, schemes and containers can overwrite each other's rows, but the popup rejects summaries whose marker does not match the current document. Older saved rows are not automatically cleaned up.
- **Kept in background memory:** bounded tab/header records and optional breach results. Closing the popup does not clear these caches. Breach results become stale after ten minutes but may remain in memory until a later permitted lookup, eviction, consent clearing or background restart.
- **Sent only after breach consent:** the exact page hostname to Have I Been Pwned, with normal connection metadata such as your IP address and the extension’s configured User-Agent. No password, cookie value, page path/query, form contents or score is included. Closing the popup does not cancel an already-started request.
- **Your controls:** disable breach lookup separately from display settings. Restoring display defaults does not erase observations; there is currently no clear-history control or site-exclusion setting. Private or unknown contexts skip new persistent scan writes and breach lookups, but earlier stored data is not retroactively removed.

Read the [privacy statement](docs/PRIVACY.md) for retention, consent-failure handling, shared-cache boundaries and the external service’s policy.

---

## Permissions

| Permission | Current role |
|---|---|
| `storage` | Store display preferences and content scan summaries |
| `webRequest` | Observe HTTP response headers on page load |
| `webNavigation` | Track committed navigations to correlate header evidence to the correct tab/page |
| `http://*/*` `https://*/*` | Continuous HTTP/HTTPS page scanning, tab URL access and main-frame response-header observation; Firefox restricted pages remain inaccessible |
| `browsingActivity` *(optional data-collection permission)* | Enables the HIBP breach lookup; requested at runtime via Firefox consent prompt |

Monitoring starts on permitted HTTP/HTTPS page loads, before the popup opens. The broad website-access prompt is expected; display settings do not revoke host access. The extension does not request `cookies`, `scripting` or `activeTab` permissions. Cookie counts still use `document.cookie`, and refresh messages the existing content script. See the [permission and compatibility audit](docs/MANIFEST.md).

---

## Development

### Requirements
- **Firefox** desktop 142+ (declared API minimum; native acceptance pending)
- **Node.js 24** for tests and tooling
- **PowerShell 5.1+** (Windows) or **PowerShell 7** for packaging

No runtime dependencies to install. No bundler or transpilation step. Optional Mozilla validation uses pinned development tooling; see the [manifest audit](docs/MANIFEST.md#repeat-mozilla-validation).

### Running checks
```bash
# Clone the repository
git clone https://github.com/ujjwalk1/PrivacyMonitor.git
cd PrivacyMonitor

# Run tests
node --test tests/*.test.mjs

# Lint (syntax and reference checks)
node tools/lint.mjs

# Documentation consistency check
node tools/check-docs.mjs

# Build distribution ZIP (produces dist/privacy-monitor-1.1.zip)
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
```

The packaging script uses a 16-file allowlist and verifies each file against its source hash. Documentation, tests, and tooling are excluded from the package.

### Local popup preview
```bash
node tests/popup-preview.mjs
# Open http://127.0.0.1:4179/
```
Popup APIs and breach responses are mocked. This is not an installed-extension test.

### Documentation
- [Architecture](docs/ARCHITECTURE.md) — components, data flow, storage boundaries, score details
- [Privacy & Storage](docs/PRIVACY.md) — what is stored, where, for how long, and what is sent externally
- [Roadmap](docs/ROADMAP.md) — planned work and future priorities
- [Contributing](CONTRIBUTING.md) — setup, checks, and review expectations
- [Changelog](CHANGELOG.md) — implemented changes and what remains outstanding
- [Documentation index](docs/README.md) — full reference list

---

## Roadmap

This section separates **committed near-term work** (taken from the repository's own milestone plan) from the **long-term vision** of turning Privacy Monitor into a full privacy and security suite. Nothing below the near-term section is implemented yet, and none of it carries a date. These are candidate capabilities, not a three-month delivery commitment: browser API coverage, data-source licensing, accuracy, performance and privacy feasibility must be established before each is scheduled. Any feature that sends data off the device will follow the existing model: off by default, explicit consent, minimal data, and no use in private browsing.

---

### Near-term: finish the current milestone

- **Content record migration**: Bind content-script observations (connection, forms, privacy counts) to the background per-tab record store, removing same-hostname tab sharing in legacy storage
- **Legacy storage cleanup**: Remove obsolete hostname-keyed scan rows after migration; preserve preferences; verify retry and private-session behaviour
- **Site exclusions**: One exclusion policy across scanning, headers, password UI, breach lookup and popup readers, with cancellation and stale-result rejection
- **Native Firefox acceptance**: Outstanding screen-reader, theme, zoom, restart, consent-flow and integration checks
- **Release preparation**: Permission and compatibility changes are implemented, with native validation pending; remaining work includes release documentation, a Firefox acceptance matrix, regression repairs and Mozilla Add-ons submission preparation

---

### Phase 2 — Deeper Security Analysis

- **Header-value analysis**: Go beyond presence/absence and evaluate whether CSP, HSTS (max-age, includeSubDomains, preload) and Referrer-Policy values are actually effective
- **Mixed content detection**: Identify HTTP images, scripts and iframes on HTTPS pages, grouped by resource type and source domain
- **SSL / TLS certificate inspection**: Show issuer, expiry, certificate transparency status and weak signature algorithms; warn when a certificate expires within 30 days
- **Outdated JavaScript library detection**: Fingerprint common libraries (jQuery, Bootstrap, Lodash and others), compare versions against a CVE database, and link to relevant advisories
- **Subresource Integrity checker**: Flag third-party `<script>` and `<link>` tags loaded without an `integrity` attribute
- **Encrypted DNS detection**: Report whether the browser is using DNS-over-HTTPS, since plain DNS exposes every visited domain to the network

---

### Phase 3 — Advanced Privacy Analysis and Enforcement

- **Tracker classification**: Replace raw third-party script counts with categorised results (advertising, analytics, fingerprinting, social widgets, CDN) using a licensed blocklist such as Disconnect or EasyPrivacy, with public-suffix-aware domain matching and the company behind each tracker
- **Fingerprinting detection**: Detect canvas, AudioContext, WebGL and `navigator` probing, and attribute it to specific scripts
- **Cookie inspector**: Categorise cookies (session, persistent, first/third-party, tracking, functional, authentication); flag missing `Secure`, `HttpOnly` and `SameSite` attributes and unusually long lifetimes; includes HttpOnly cookies through the proper API
- **Storage monitor**: Track `localStorage` and `sessionStorage` keys, which scripts write them, and approximate sizes
- **Bounce tracking detection**: Identify redirect chains and link decoration used for cross-site tracking that bypasses cookie blocking
- **CNAME cloaking detection**: Detect third-party trackers disguised as first-party hostnames through DNS aliasing
- **Optional blocking**: Selectively block detected trackers and scripts, with per-site controls

---

### Phase 4 — Real-time Threat Protection

- **Phishing detection**: Opt-in lookups against a phishing database, plus local heuristics for lookalike domains, homograph (IDN) attacks, excessive subdomains and very new domains
- **Typosquatting alerts**: Warn when a domain closely resembles a well-known site through character substitution, homoglyphs or TLD tricks
- **Download safety checks**: Opt-in file-hash lookups against a service such as VirusTotal before the user opens a download
- **Malicious redirect detection**: Track redirect chains and flag suspicious intermediaries, useful against malvertising and affiliate fraud
- **Cryptojacking detection**: Identify in-browser miners by library signatures and WebAssembly patterns, correlated with sustained CPU usage
- **Stronger password tooling**: An entropy-based local password estimator, plus an optional k-anonymity breached-password check (only a hash prefix leaves the device)

---

### Phase 5 — Analytics, Reporting and History

- **Score history**: Per-domain score trends over time, with alerts when a previously good site degrades
- **Weekly privacy report**: Top trackers encountered, most-breached sites visited, worst header hygiene and exposure trends, viewable in a tab or exported as PDF
- **Tracker network graph**: Visualise which tracker companies follow you across the sites you visit
- **Breach timeline**: Chronological breach history per domain, including which data classes were exposed each time
- **Site comparison**: Side-by-side security scorecards for competing services
- **Performance measurement**: Track the extension's own impact on page load time and memory

---

### Phase 6 — User Control and Customisation

- **Per-site rules engine**: Custom rules per domain (block scripts by pattern, force HTTPS, suppress specific warnings for trusted or internal sites)
- **Allowlist and blocklist management**: A settings page for trusted and blocked domains and custom tracker entries
- **Configurable score weights**: Let users decide how much each signal contributes to the score
- **Notifications**: Optional alerts for new breaches affecting visited sites, certificates nearing expiry, and visits to very low-scoring sites
- **Export and audit log**: Export stored data as JSON or CSV for auditing

---

### Phase 7 — Platform and Ecosystem

- **Chrome and Edge**: Manifest V3 port, including adapting header observation to the MV3 APIs
- **Firefox for Android**: Mobile popup layout and compatibility validation
- **Cross-device sync**: Sync preferences, rules and allowlists through `storage.sync`
- **Full dashboard page**: An aggregated analytics view replacing the constrained popup for history, trackers and trends

---

## Known Limitations

- An observation tool, not comprehensive protection: no request blocking, malware/phishing detection, certificate inspection or guarantee that a form submission is safe
- Does not analyze local-file or internal browser pages (`file:`, `about:`, `moz-extension:`, `chrome:`); Firefox can also restrict otherwise ordinary web pages
- Headers are captured only on full page loads; missing captures and 304 responses can leave evidence unavailable. Reload after installation; a popup-triggered refresh does not recapture headers. Presence does not prove a policy value is effective
- Cookie counts use `document.cookie` and exclude HttpOnly cookies
- Third-party script detection is hostname comparison only — no tracker classification is implemented
- Form inspection covers only accessible top-level document markup; JavaScript-controlled submissions, shadow DOM trees, and cross-origin frames are outside coverage
- Same-hostname tabs can still overwrite content summaries until content-record migration is complete. The popup rejects another document's or untagged summaries and shows Incomplete; use Refresh Analysis to collect the current page again. Reload pages after updating the extension if their content script is unavailable or outdated. Legacy rows may contain full URLs or earlier private observations; targeted cleanup remains pending
- Breach errors and empty responses do not confirm a domain has never been breached; the extension checks the domain, not individual email addresses or passwords
- Private browsing and unknown-context tabs produce incomplete popup results; breach lookup is unavailable in these contexts
- Local counts do not change score weights, but missing or invalid counts can still keep the popup incomplete; a high score is not a safety guarantee
- Display settings do not stop analysis or exclude sites; there is no built-in control to erase accumulated observations
- Firefox desktop 142+ is the declared minimum; minimum-version installation and native consent acceptance remain pending

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history. Summary:

**Current development beta (post v1.1 baseline)**
- Corrected scoring to reach 100 with complete best-case evidence
- Added explicit incomplete, unavailable, unsupported, and loading states throughout the popup
- Added opt-in breach lookup with consent, caching, rate-limit backoff, and private-context blocking
- Added per-tab header records with navigation scoping (headers no longer write to persistent hostname rows)
- Unified startup and refresh scans; retained and repaired form warnings across refreshes
- Corrected form destination resolution (base URLs, submit-button formaction overrides, dynamic forms)
- Added persistent display settings, popup keyboard controls, light/dark presentation, local SVG icons
- Added dependency-free tests, lint/doc checks, and a verified packaging allowlist

**v1.1 baseline**
- Password strength feedback, page security counts, security header capture, insecure form warnings, breach lookup, and sectioned popup

**v1.0**
- Initial release: password feedback, HTTPS detection, cookie/script counts, basic popup

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for the extension source license. Existing license text and notices are preserved.

Breach information is provided by [Have I Been Pwned](https://haveibeenpwned.com), whose breach API data is offered under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/); see its [API license terms](https://haveibeenpwned.com/API/v3#License). Privacy Monitor displays selected fields from up to three records, ordered by breach date, and omits other returned fields. This data attribution is separate from the source-code license.

---

## Support

- **Bug reports**: [GitHub Issues](https://github.com/ujjwalk1/PrivacyMonitor/issues) — include Firefox version, steps to reproduce, and expected vs actual behaviour. Use synthetic examples and remove any page secrets from logs or screenshots.
- **Contact**: nee103kn3@mozmail.com

---

Privacy Monitor helps you inspect observable signals. It does not certify a website’s safety.
