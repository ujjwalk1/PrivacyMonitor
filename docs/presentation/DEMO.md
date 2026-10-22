# Live demonstration and supervisor questions

Target: eight minutes on 2026-10-23. This is a runbook with expected observations, not a record that native Firefox checks passed. Record the rehearsal outcome in [VERIFICATION.md](../development/VERIFICATION.md).

## Prepare before the meeting

1. Open `C:\Users\91851\OneDrive\Desktop\PrivacyMonitor-presentation` in VS Code. Use this checkout for every command and the temporary add-on. Do not reorganize or overwrite `priv-mon-new`.
2. In a terminal at that root, run:

   ~~~powershell
   node --test --test-reporter=dot tests/*.test.mjs
   node tools/lint.mjs
   node tools/check-docs.mjs
   powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
   node tests/popup-preview.mjs
   ~~~

   The last command stays running and serves only `127.0.0.1:4179`. Keep that terminal open. If the port is occupied, stop your earlier preview process; do not terminate unrelated processes.
3. Use a disposable Firefox test profile. Record the actual Firefox/OS version and display scaling. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on** → select this checkout's `manifest.json`. Inspect its background console for startup errors. If installation fails, record the exact error and use the fallback below.
4. Leave breach lookup off. Open `http://127.0.0.1:4179/dynamic-forms.html` **after** loading the extension. Reload the page. Keep only one localhost fixture active while checking the popup, because legacy content rows are shared by hostname.
5. Rehearse the steps below once. Open Settings and restore defaults if necessary. Use only dummy text such as `abc` and `Example-Demo-Only-123!`. These are demonstrations, not password recommendations. Both form fixtures cancel submissions, and their destinations use reserved `example.invalid` names; do not enter real credentials.
6. Bookmark these offline fallback pages:

   - `http://127.0.0.1:4179/popup.html?case=ready`
   - `http://127.0.0.1:4179/popup.html?case=partial`
   - `http://127.0.0.1:4179/popup.html?case=breach-results`
   - `http://127.0.0.1:4179/popup.html?case=breach-http-error`
   - `http://127.0.0.1:4179/popup.html?case=consent-off`
   - `http://127.0.0.1:4179/presentation.html`

   These render production popup files with **synthetic browser APIs and data**. Clearly label them “UI preview with simulated observations.” Do not use their numeric values as evidence about localhost or a real domain. The preview's Refresh is deliberately denied.
7. Keep the [briefing](BRIEFING.md), [source walkthrough](VSCODE_WALKTHROUGH.md), [architecture diagram](../ARCHITECTURE.md) and verification summary available. No current installed-extension screenshot was captured for this review; do not present an old/mock screenshot as current native evidence.

The local fixture server does not provide TLS or security headers. That is intentional for a controlled warning example. It cannot prove a successful HTTPS/header setup. Reloading the page triggers header capture; the popup's Refresh button does not.

## Eight-minute sequence

| Time | Show / say | Expected observation or fallback |
| --- | --- | --- |
| 0:00–0:45 | “Pages expose many signals, but a padlock or single score cannot explain them all. Privacy Monitor collects a limited set and labels uncertainty.” Show the product README. | Describe a development beta, not comprehensive protection. |
| 0:45–1:30 | Show the architecture diagram, then manifest entry points. | Explain page scanner, header background, popup and optional external lookup. Explicitly identify the unfinished content-storage migration. |
| 1:30–2:30 | On `dynamic-forms.html`, click **Add password field**. Focus it and type dummy text. The initial form action is HTTPS. | Local feedback should appear. No HTTP form banner should appear yet even though the hosting fixture is HTTP: destination and page protocol are different facts. |
| 2:30–3:30 | Click **Toggle HTTP/HTTPS action** once. Wait about a second. Open the real extension popup; press **Refresh Analysis**. | One HTTP password-form warning should appear; expected form counts are 1/1. Refresh should retain one banner. HTTP connection is expected. If header capture completed, all six headers are absent and the score is 0; otherwise incomplete is the correct honest state. Do not troubleshoot during the talk. |
| 3:30–4:15 | Close popup, toggle the action back to HTTPS, wait, then reopen/refresh. | Banner disappears and form counts become 0/0. If all local inputs are observed, score becomes 20: no HTTPS-page points, no header points, 20 form points. This is a conditional expected value, not a native pass recorded by this review. |
| 4:15–5:00 | Return action to HTTP, then open **Settings**, turn form warnings off and save. Return to the page; restore defaults afterward. | Banner disappears but popup analysis still reports the HTTP form. Explain that this is a display preference, not an exclusion. If native settings fail, show source and disclose the unverified behavior. |
| 5:00–6:00 | Explain optional breach consent. Keep live lookup off; show the synthetic results and HTTP-error preview tabs. | Label every displayed breach record synthetic. Explain empty/error/timeout differences, ten-minute cache, eight-second timeout and score independence. No external service is needed. |
| 6:00–7:00 | Show `scoring.js` and the concise baseline comparison. Mention tab/navigation header identity and dynamic form handling. | Emphasize corrected maximum, explicit unknowns, shared scanning and less new retention. Show test result summary, not a scroll of all test output. |
| 7:00–8:00 | Show current limitations and roadmap. | Name unfinished D09 migration, D10 cleanup, D13 exclusions and native Firefox acceptance. Stop before D16 implementation. |

If there are two extra minutes, open `http://127.0.0.1:4179/form-destinations.html` and then add `?base=https`. Expected HTTP/password-form counts change from 5/5 to 4/4: only the relative action is changed by the base; missing/empty actions still use the HTTP document URL. Reload before reading each popup and use one fixture tab to avoid same-host stale summaries.

## Fallback plan

**Native add-on cannot load:** show the exact recorded installation failure, then use the synthetic popup previews and source walkthrough. Say: “The automated logic checks pass; this view is a simulated UI preview, and native Firefox acceptance is still open.” Do not imply that the preview proves extension integration.

**Breach service is unavailable:** keep or turn lookup off, show `case=breach-http-error` and `case=breach-results` with the explicit synthetic label. The local score does not require the service. Do not repeatedly enable/retry against a rate limit. Optional real lookup can be rehearsed separately only after understanding its hostname/IP disclosure; it is not part of the reliable core demo.

**Header observations are incomplete:** reload the fixture after installing. If still incomplete, explain the conservative capture boundary and continue with local form feedback and the pure scoring example. Do not relabel unknown as absent.

**Live page behavior differs:** preserve the failure details, move to the controlled preview/source, and avoid ad hoc runtime fixes during the presentation. Stop the preview server with Ctrl+C afterward.

## Ten likely supervisor questions

1. **Does a score of 100 mean the site is safe?**
   No. It means the required observations support HTTPS, all six header-presence checks and no detected HTTP password forms under this formula. Policy effectiveness, malicious content and many other risks are outside the score.

2. **What changed from the original version?**
   The baseline already had the main categories. Later work corrected scoring, represented unknown/error states, added consent and bounded breach handling, isolated header evidence by navigation, unified refresh, improved form resolution/dynamic updates and added settings/accessibility/presentation.

3. **Are all D01–D15 tasks finished?**
   Implementation exists across the milestone, but D09, D10 and D13 are partial. Full native Firefox acceptance is not recorded. Combined commits publish D09/D10, D11/D12 and D13/D14 together; there is no invented one-commit-per-day history.

4. **What leaves the browser?**
   With consent, a normal tab's hostname goes to Have I Been Pwned, which sees the connection IP. No password, email, cookie value, page path/query or form content is included. This statement concerns extension-initiated lookup, not the website's own traffic.

5. **What is stored, and is private browsing supported?**
   Display preferences and normal-tab content summaries remain in local storage. Headers and breach cache are transient. New private/unknown scans do not persist summaries or use breach lookup/cache, but private popup observations are incomplete. Old records are not yet cleaned up.

6. **Why can the same website show stale data?**
   Content summaries still use hostname keys, so same-host tabs can overwrite each other. Headers already use per-tab navigation records. Finishing D09 is the next architectural priority; hiding this limitation would overstate the current design.

7. **How do you detect an unsafe form?**
   Resolve possible markup destinations, including base URLs, missing actions, associated submit buttons and overrides. Any HTTP route counts its form once. It is a warning about possible routes, not proof of an observed request, and JavaScript-controlled submissions are outside scope.

8. **How do you handle modern dynamic pages and performance?**
   Delegated password events and mutation observation cover relevant additions/removals and attributes. Scans are coalesced at 500 ms with a dirty flag rather than queued per mutation. Full DOM scanning still costs work; no production performance benchmark is claimed.

9. **What has actually been tested?**
   The existing 162 tests pass in the isolated checkout. They use mocked browser/DOM/service behavior. Local lint and packaging check file references and archive bytes. Prior notes report mocked visual/keyboard previews. Actual Firefox install, native consent/restart, screen reader, themes and zoom remain pending unless the rehearsal records them.

10. **Can I install it as a regular published add-on? Why these permissions?**
    The documented path is temporary loading of source or an unsigned development ZIP, not a published signed release. Broad access enables monitoring, but retained cookies/scripting declarations are not currently used by the scanner and need the planned D16 audit. Temporary loading ends at Firefox restart; release acceptance and submission are future work.

## Rehearsal record to fill in

- Date/time and Firefox version:
- OS, scaling, theme and installation method:
- Temporary installation/startup errors:
- Dynamic fixture feedback and 0/0 → 1/1 → 0/0:
- Header status and conditional score observations:
- Refresh banner preservation:
- Settings save/live application:
- Keyboard/focus/theme/zoom observations:
- Breach lookup remained off / separately tested with consent:
- Any failure and exact reproduction:
- What will be shown live versus labeled simulated:
