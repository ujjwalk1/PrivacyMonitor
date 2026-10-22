# Local development

The extension uses plain JavaScript and Firefox MV2. Runtime files remain at the repository root. No framework, bundling or runtime dependency installation is required.

## Commands

Use Node.js 24 and Windows PowerShell 5.1+ or PowerShell 7. Node 24.19.0 was used for the presentation verification.

~~~powershell
node --test tests/*.test.mjs
node tools/lint.mjs
node tools/check-docs.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
~~~

Tests exercise mocked browser, DOM and service behavior. Local lint checks syntax, MV2 basics and manifest/popup/options/image references against the package allowlist. It is not Mozilla add-on validation. The documentation checker validates local inline Markdown links and heading anchors; it does not fetch external sites.

Packaging writes `dist/privacy-monitor-1.1.zip`, replacing that generated archive on repeated runs. It includes the 16 paths in [extension-files.json](../tools/extension-files.json) and compares archive-entry SHA-256 values with the source. Tests, documentation, presentation notes, checkpoints and unrelated files are excluded. The artifact is unsigned.

## Load and check in Firefox

No tested minimum Firefox version has been selected. Use a disposable desktop Firefox profile and record the actual version. Follow [Mozilla's temporary-installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/):

1. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select the root `manifest.json` or generated ZIP.
2. Confirm installation, inspect the background console and record startup errors.
3. Reload an ordinary HTTP/HTTPS page after loading. Open the popup and inspect observations. Missing captures may be incomplete.
4. Keep breach lookup off for local fixtures. Use only dummy passwords. Check warnings, dynamic updates and refresh.
5. Record native results and Firefox/OS versions in [the verification record](development/VERIFICATION.md), then update [progress](development/PROGRESS.md).

Temporary installation ends at browser restart. Reload the add-on after source changes, then reload the page. Temporary installation is not equivalent to signed-install/restart testing.

## Controlled pages and preview

~~~powershell
node tests/popup-preview.mjs
~~~

Open `http://127.0.0.1:4179/` for synthetic popup states, `/presentation.html` for theme/reflow previews, `/form-destinations.html` for destination cases, or `/dynamic-forms.html` for dynamic form controls. Use the complete URL with the same host/port for each route. Stop with Ctrl+C.

The popup preview substitutes browser APIs and breach data; the form fixture pages are ordinary local pages on which a separately installed extension can run. Neither server startup nor preview rendering proves installed Firefox behavior. See the [demo runbook](presentation/DEMO.md).

## Architecture and unfinished work

See [ARCHITECTURE.md](ARCHITECTURE.md). Headers use transient tab/navigation records; content summaries still use hostname storage. D09 must finish migration before D10 removes obsolete rows. D13 display preferences exist, but site exclusions do not. Native acceptance remains pending. Current [verification](development/VERIFICATION.md) separates actual checks from prior mock-preview evidence.

## Recovery and history

The reviewed baseline is [8c3b240](https://github.com/ujjwalk1/PrivacyMonitor/tree/8c3b240cfa46a57e373a5ece8325a84b4fc66486). Inspect an old commit in a separate checkout rather than overwriting active files.

The original local `priv-mon-new` folder contains recovery archives ignored by Git; a fresh clone does not require them. The presentation reorganization was performed in the separate `PrivacyMonitor-presentation` checkout. License and runtime files were preserved. See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution expectations.
