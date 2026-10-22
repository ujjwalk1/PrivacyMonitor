# Privacy Monitor

Privacy Monitor is a Firefox extension that brings page connection details, security-header observations, form warnings and local password feedback into one place.

**Development beta · Firefox Manifest V2 · GPL-3.0.** The manifest version is 1.1. This repository provides source and an unsigned development package for temporary installation. Native Firefox acceptance is still pending; this is not a signed, published or independently audited release.

## What you can do

- Inspect HTTP/HTTPS connection status and the presence of six security headers.
- See a technical observation score based on HTTPS, observed headers and HTTP password-form findings. Missing evidence leaves the score incomplete.
- Receive local feedback on password length, character variety and common patterns.
- See warnings on password forms with possible HTTP destinations, including supported submit-button overrides and dynamic form changes.
- View counts of accessible cookies, script elements and scripts from other hostnames.
- Refresh page observations and choose whether password feedback and form banners appear.
- Optionally enable a hostname-based Have I Been Pwned lookup through Firefox consent. Historical breaches appear separately from the score.

The popup includes light/dark styles, keyboard controls and text descriptions of status. These are implemented; native Firefox theme, zoom and screen-reader checks remain open. See [verification and known gaps](docs/development/VERIFICATION.md).

## Install for evaluation

You need Firefox desktop. No tested minimum Firefox version is established yet. Node.js and PowerShell are needed only for development checks and ZIP packaging, not for loading the source.

1. Clone this repository, or download and extract its source ZIP.
2. In a disposable Firefox profile, open `about:debugging`.
3. Choose **This Firefox → Load Temporary Add-on**, then select the root `manifest.json`.
4. Reload an ordinary HTTP/HTTPS page after loading the extension so it can observe the navigation.
5. Open **Privacy Monitor** through Firefox's extensions menu. Firefox lists the add-on as **Privacy & Security Monitor**.

Temporary installation ends when Firefox restarts. Reload the add-on and page after code changes. This workflow follows [Mozilla's temporary-installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/); it does not establish signed-installation or restart acceptance.

## Use Privacy Monitor

Open the popup to inspect the current page. **Refresh Analysis** asks the existing content script to scan again; it does not reload the page or recapture its response headers. Reload the page if headers were not observed.

On a password form, focus a field and type to see local feedback. A warning means the form *can* submit over HTTP according to its markup. It does not mean a submission was observed or blocked.

Open **Settings** to control password feedback and form-warning banners. These switches change visible hints; analysis continues. Site exclusions are not available yet.

Breach lookup starts off. Read the popup disclosure before enabling it. Disable it from the popup or Firefox's add-on permissions. If Firefox's consent API is unavailable, the feature stays off.

## Permissions and privacy

Local observations do not require the breach service. Password values are read transiently for feedback; the extension does not persist or send them. New normal-tab scan summaries omit full URLs, cookie values and form contents.

With consent, a normal tab's hostname is sent to Have I Been Pwned, which also receives the connection IP address. The request omits credentials and referrer information. Successful results are cached in background memory for ten minutes; disabling lookup clears cached results and cancels pending work. Private or unknown contexts cannot use this lookup or cache.

The manifest requests broad HTTP/HTTPS access, `activeTab`, `storage`, `cookies`, `scripting`, `webRequest` and `webNavigation`. Page access supports scanning; storage holds preferences and current legacy summaries; request/navigation events support header observations. The `cookies` and `scripting` permissions are retained from the earlier implementation and are not used by the current scanner. A permission audit is pending.

**Storage migration is unfinished.** Normal-tab content summaries are still keyed by hostname and can be shared or stale across tabs. Older records may contain full URLs or earlier private data; targeted cleanup has not shipped. Current private/unknown-context scans avoid persistent writes, and their popups do not read shared content summaries. Headers use separate transient tab/navigation records. See the [privacy and storage details](docs/PRIVACY.md).

## Limits to understand

- The score is a technical summary, not a guarantee that a site is safe. Header presence does not establish effective policy values.
- Cookie counts use `document.cookie`, so they exclude HttpOnly cookies. Third-party script counts are hostname comparisons, not tracker classifications.
- Form checks inspect accessible document markup. JavaScript-controlled submissions, shadow trees and unscanned frames are outside coverage.
- Unsupported/restricted pages and missing captures can produce unavailable or incomplete results. Private popups currently lack complete content observations.
- Breach errors or an empty response do not establish that a domain has never been breached. The extension does not check whether your email address or password was exposed.
- D09 content-record migration, D10 legacy cleanup and D13 site exclusions remain unfinished. Browser acceptance remains pending across the milestone.

## Develop and package

Use Node.js 24 and Windows PowerShell 5.1+ (or PowerShell 7). There is no dependency installation or bundling step.

~~~powershell
git clone https://github.com/ujjwalk1/PrivacyMonitor.git
cd PrivacyMonitor
node --test tests/*.test.mjs
node tools/lint.mjs
node tools/check-docs.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
~~~

Packaging produces `dist/privacy-monitor-1.1.zip` from an explicit 16-file allowlist and verifies every file against its source hash. Documentation, tests and presentation materials are excluded. Local lint is not Mozilla add-on validation.

For controlled form pages and synthetic popup previews, run `node tests/popup-preview.mjs` and open `http://127.0.0.1:4179/`. Preview popup APIs and breach responses are mocked; previews are not an installed-extension test.

## Project documentation

- [Architecture](docs/ARCHITECTURE.md) — components, messages and the current migration boundary.
- [Contributing](CONTRIBUTING.md) — setup, checks and review expectations.
- [Changelog](CHANGELOG.md) — implemented user-facing changes.
- [Roadmap](docs/ROADMAP.md) — unfinished work and future priorities.
- [Documentation index](docs/README.md) — technical references, development records and presentation material.

Runtime entry points remain at the repository root to keep temporary loading simple. `docs/` contains documentation, `tests/` contains checks and controlled fixtures, and `tools/` contains validation and packaging tools. Internal day plans and handoff notes live in `docs/development/`.

## Support and license

[Report a reproducible issue](https://github.com/ujjwalk1/PrivacyMonitor/issues), including Firefox version, steps and expected/actual behavior. Use synthetic examples and remove page secrets from logs or screenshots. Contact: nee103kn3@mozmail.com.

Privacy Monitor is licensed under the [GNU General Public License v3.0](LICENSE). Existing license text and source attribution are preserved. Historical breach information, when enabled, comes from Have I Been Pwned.
