# Privacy Monitor local development

D01 preserved the five v1.1 extension files in place; D02 adds the local scoring
module documented in [SCORING.md](SCORING.md). D03's popup states, D04's breach
outcomes/timeout, and local preview fixtures are documented in [POPUP_STATES.md](POPUP_STATES.md).
D05 consent and its Firefox checklist are in [BREACH_CONSENT.md](BREACH_CONSENT.md). D06 caching/backoff and browser checks are in [BREACH_CACHE.md](BREACH_CACHE.md). D07's record/message foundation is in [ANALYSIS_RECORDS.md](ANALYSIS_RECORDS.md).
D08's navigation/header correlation and native acceptance checklist are in [HEADER_LIFECYCLE.md](HEADER_LIFECYCLE.md). Partial D09's shared scan/refresh and remaining migration are in [SCAN_REFRESH.md](SCAN_REFRESH.md). Partial D10 safeguards and cleanup prerequisites are in [PRIVATE_HANDLING.md](PRIVATE_HANDLING.md). There is no framework,
bundling step, or runtime dependency. The original local working folder is not a
Git checkout; its updates use the GitHub connection. A fresh clone has normal
Git history. See the [repository overview](../README.md) for the layout.

Partial D13 adds the on-page settings page and persistent display controls; see
[SETTINGS.md](SETTINGS.md). Site exclusions and native settings/restart acceptance
remain pending. The package now includes 13 runtime files, including the settings
schema and options page/scripts.

## Recoverable baseline

`checkpoints/pre-d01-2026-09-29.zip` contains every original top-level file,
including the plan, progress log, and unrelated image. The adjacent
`pre-d01-2026-09-29.sha256.json` records each original file's SHA-256.
To recover, extract the archive into a **new empty directory** and compare the
extracted files with the hashes. Copy back only the files you intend to restore;
do not extract over ongoing work. Keep these checkpoints when starting Git later.
These archives and hashes are local recovery files, excluded from GitHub.
For repository users, the unchanged extension baseline is recoverable from
[commit 8c3b240](https://github.com/ujjwalk1/PrivacyMonitor/tree/8c3b240cfa46a57e373a5ece8325a84b4fc66486).

## Local commands (Windows PowerShell)

Prerequisites: Node.js 24 LTS on PATH and Windows PowerShell 5.1+ (or PowerShell 7).
Verified here with Node 24.19.0. No npm install or network access is required.
Run from the repository root (all command/file paths below are relative to it):

```powershell
node --test tests/*.test.mjs
node tools/lint.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
```

The tests exercise mocked background header events, content-script initialization,
popup boot registration, scoring, popup state transitions, breach outcomes/timeouts,
score/breach separation, and per-tab header isolation across navigation, redirects,
delayed events, errors, and tab closure. They
do not simulate a full browser or validate the breach API or all existing
behaviors. Local lint checks JavaScript syntax,
the MV2 manifest basics, and that manifest/popup file references are packaged.
It is **not** Mozilla add-on validation; `web-ext lint` and compatibility/policy
validation remain outstanding for the assigned later manifest/release days.

Packaging writes `dist/privacy-monitor-1.1.zip` (replaced on repeat runs). It
includes only the 13 paths in `tools/extension-files.json`, then verifies each
archive entry against the source SHA-256. Development files, checkpoints, and the
unrelated image are excluded. Add future extension assets to that list when needed.
The ZIP is a local unsigned development artifact, not a submission-ready release.

## Load and check in Firefox

Firefox 156.0.1 is installed on this machine; no tested minimum version has been
selected. These steps follow [Mozilla temporary installation instructions](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

1. Use a disposable Firefox test profile. Open `about:debugging`, select
   **This Firefox**, then **Load Temporary Add-on** and select this folder's
   `manifest.json` (or the built ZIP).
2. Check that Privacy & Security Monitor appears without installation errors.
   Open its **Inspect** console and check for startup errors.
3. After loading the add-on, visit/reload an ordinary HTTPS page. Open the extension
   through the toolbar extensions menu. Confirm the domain, connection, header,
   form, and privacy sections render, and record any console errors.
4. On a disposable HTTP password-form fixture, type only dummy text and confirm the
   password feedback and HTTP form warning appear. Do not submit the form. Check
   the popup's Refresh Analysis button and record the outcome.
5. Record Firefox version, pages/fixtures, and exact pass/fail results in
   [PROGRESS.md](../PROGRESS.md). Reload the temporary add-on after source edits, then reload the
   page. Temporary installation ends when Firefox restarts.

Current development behavior: breach lookup is off until Firefox consent is granted.
Once enabled, opening/refreshing an analyzed page's popup reuses a fresh result or
sends a normal tab’s hostname to Have I Been Pwned when retry timing permits. Private/unknown contexts are blocked. D05's consent checklist is linked above. New scan summaries omit URLs; older stored data still awaits D10 cleanup after D09 migration. Use non-sensitive test pages
and a disposable profile.

Browser acceptance is still pending. Passing mocked tests and byte-identical
packaging does not establish that the extension loads or works in Firefox.
For D08, reload the add-on with its new `webNavigation` permission and run the
[header lifecycle checklist](HEADER_LIFECYCLE.md#native-firefox-acceptance-pending).
Mozilla's [web-ext reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
documents optional future browser/lint tooling; D01 requires no global tool install.
