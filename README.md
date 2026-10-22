# 🔒 Privacy Monitor

A dependency-free Firefox browser extension that brings connection security, HTTP response header observations, insecure form warnings, optional data breach lookup, and local password feedback into a single popup.

**Development beta · Firefox Manifest V2 · GPL-3.0**
The current manifest version is 1.1. This is an unsigned development build for temporary installation. A signed Mozilla Add-ons release is planned after validation; this repository does not establish a submitted or approved release. Native Firefox acceptance remains pending; see [verification](docs/development/VERIFICATION.md).

---

## Table of Contents

- [What It Does](#what-it-does)
- [Installation](#installation)
- [Using the Extension](#using-the-extension)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Security Score](#security-score)
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
Detects whether the current page is served over HTTP or HTTPS and displays the result prominently in the popup with a clear secure / not secure status.

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
- Password values are read transiently — never stored or transmitted
- Input updates are coalesced with a 300 ms timer; one shared indicator is reused across supported inputs

Password feedback and form warning banners can be toggled in **Settings**.

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
- Successful results are cached in background memory for 10 minutes
- A maximum of 4 concurrent lookups and 32 cached hosts are maintained
- Rate-limit responses use `Retry-After` when valid, with exponential fallback backoff; retries are user-triggered
- Disabling the feature clears all cached results and cancels pending work
- Private browsing and unknown privacy contexts cannot use this feature

A breach result is shown separately from the security score and does not affect the numeric score.

---

### ⚙️ Settings Page
A dedicated options page (accessible from the popup) lets you:

- Toggle password strength feedback on/off
- Toggle in-page form warning banners on/off

Settings are stored under a versioned key (`privacy_monitor_display_settings_v1`) and propagate to the content script via a storage change event.

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

**Viewing analysis:** Click the toolbar icon on any HTTP/HTTPS page. If the popup shows incomplete data, reload the page first.

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
              Reads hostname-keyed content summary from local storage
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

## Permissions

| Permission | Current role |
|---|---|
| `activeTab` | Retained declaration; the popup queries the active tab. Necessity alongside broad host access awaits the permission audit |
| `storage` | Store display preferences and content scan summaries |
| `webRequest` | Observe HTTP response headers on page load |
| `webNavigation` | Track committed navigations to correlate header evidence to the correct tab/page |
| `scripting` | Retained but unused; popup refresh now sends a message to the existing content script (audit pending) |
| `cookies` | Retained from earlier implementation; not used by the current scanner (audit pending) |
| `http://*/*` `https://*/*` | Required host access for `webRequest` to observe navigations across all sites |
| `browsingActivity` *(optional data-collection permission)* | Enables the HIBP breach lookup; requested at runtime via Firefox consent prompt |

---

## Development

### Requirements
- **Firefox** desktop (no tested minimum version established yet)
- **Node.js 24** for tests and tooling
- **PowerShell 5.1+** (Windows) or **PowerShell 7** for packaging

No dependencies to install. No bundler or transpilation step.

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

- **D09 — Content record migration**: Bind content-script observations (connection, forms, privacy counts) to the background per-tab record store, removing same-hostname tab sharing in legacy storage
- **D10 — Legacy storage cleanup**: Remove obsolete hostname-keyed scan rows after migration; preserve preferences; verify retry and private-session behaviour
- **D13 — Site exclusions**: One exclusion policy across scanning, headers, password UI, breach lookup and popup readers, with cancellation and stale-result rejection
- **D01–D15 — Native Firefox acceptance**: Outstanding screen-reader, theme, zoom, restart, consent-flow and integration checks
- **D16–D20 — Release preparation**: Manifest and permission compatibility review (including the unused `cookies` and `scripting` permissions), release documentation, a Firefox acceptance matrix, regression repairs and Mozilla Add-ons submission preparation

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

- Does not function on internal browser pages (`about:`, `moz-extension:`, `chrome:`)
- Headers are captured only on full page loads — reload the tab after installing the extension to get header data; a popup-triggered refresh does not recapture headers
- Cookie counts use `document.cookie` and exclude HttpOnly cookies
- Third-party script detection is hostname comparison only — no tracker classification is implemented
- Form inspection covers only accessible top-level document markup; JavaScript-controlled submissions, shadow DOM trees, and cross-origin frames are outside coverage
- Same-hostname tab sharing remains in content summaries until D09 migration is complete; legacy storage rows from earlier versions may contain full URLs or earlier private observations. Targeted cleanup remains pending
- Breach errors and empty responses do not confirm a domain has never been breached; the extension checks the domain, not individual email addresses or passwords
- Private browsing tabs produce incomplete popup results; breach lookup is unavailable in private contexts
- `cookies` and `scripting` permissions are declared but not used by the current scanner (permission audit pending)

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

GNU General Public License v3.0 — see [LICENSE](LICENSE) for details.

---

## Support

- **Bug reports**: [GitHub Issues](https://github.com/ujjwalk1/PrivacyMonitor/issues) — include Firefox version, steps to reproduce, and expected vs actual behaviour. Use synthetic examples and remove any page secrets from logs or screenshots.
- **Contact**: nee103kn3@mozmail.com

---

**🔒 Stay secure, stay private.**
