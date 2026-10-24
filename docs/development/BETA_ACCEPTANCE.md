# Beta acceptance matrix

## D18 run — 2026-10-24

**Incomplete: not a beta acceptance pass.** One agent; diagnosis only. Base commit `a9dc1f5700bbcef08ffdb5372fdd198320c045cc` plus the existing uncommitted D17 README/privacy/architecture/popup changes. Those changes were preserved. The original `priv-mon-new` folder was not modified.

### Environment and prerequisite results

- Windows; installed Firefox executable version **158.0.1**. Existing Mozilla web-ext **10.8.0** launched the 16 allowlisted files from an isolated temporary staging directory, using a new temporary profile and automatic reloading disabled. Runner output confirmed **temporary add-on installation succeeded**. This is not proof that background startup or the popup is error-free.
- Desktop window inventory returned **D18 acceptance fixtures — Mozilla Firefox**. The first window-state inspection was rejected by Computer Use: **“browser URL policy enforcement is not yet supported for the current Windows browser.”** No popup, form, private window or permission UI was operated afterward. Do not count page/window creation as an interactive pass.
- Breach consent was not enabled and no real breach lookup was requested. No private-browsing permission, security setting or normal user profile was changed.
- D09 content isolation, D10 legacy cleanup and D13 site exclusions remain unfinished. D16's seven inherited Mozilla rendering warnings and D17 notice-presentation checks remain open. D18 does not repair them or declare earlier acceptance complete.

### Matrix

“Automated pass” means the existing mocked test suite passed; it is not a native Firefox pass. “Pending” means the interactive result was not observed. “Source gap” identifies an absent prerequisite, not a newly reproduced browser failure.

| Case | Procedure / expected result | Actual evidence and status |
| --- | --- | --- |
| Temporary install/startup | Load the current package in a disposable profile; inspect startup console and popup | Runner confirmed installation; target Firefox window exists. Console/popup inspection **pending** after automation policy stop. |
| Multiple tabs, same hostname | Open page A, then B in another tab, then reopen A without refreshing. A should retain score 60 and 0 insecure password forms; B should show 0 and 1 | `header-navigation.test.mjs` verifies separate headers in mocks. Content still uses shared hostname storage: **source gap**. Native reproduction **pending**; score 40 on A would diagnose content from B combined with A's headers, not an observation from this run. |
| Same-host redirect | Visit `/redirect`; inspect final page B. Redirect response headers must not carry over | Fixture returned **302 → /page-b** with headers on the redirect; B returned 200 without scored headers. Redirect mock cases pass. Native popup **pending**. |
| Cross-host redirect | Visit `/cross-host-redirect`; final URL is localhost page B with no scored headers | Fixture returned **302 → http://localhost:4180/page-b**. Host/navigation correlation mock cases pass. Native result **pending**. |
| Failed page load / offline | Visit `/offline`; no prior successful header result should be reused | Fixture socket resets; HTTP client confirmed connection failure. Request/navigation-error mock cases pass. This is a controlled failed connection, not a browser-wide offline-mode test. Native state **pending**. |
| Breach API outcomes | With a controlled mocked service, exercise HTTP failure, malformed JSON, timeout, rate limiting and empty/positive results | `breach-results.test.mjs`, `breach-cache.test.mjs`, `breach-consent.test.mjs` pass. No live service or native grant/revoke test: **pending**. Do not change the production endpoint to make a demo pass. |
| Excluded site | Excluding a host should stop producers, injected UI and external/cache work | **Source gap / blocked by unfinished D13:** no site-exclusion setting or policy. Display toggles are not an exclusion. No native exclusion pass is possible with the current implementation. |
| Restricted pages | Open `about:config` or a local file; no successful scan/score should be invented | Unsupported/missing-URL state tests pass; manifest content matches HTTP/HTTPS only. Native tab access/wording **pending**. |
| Dynamic forms | On `/dynamic-forms.html`, add a password field, toggle action to HTTP, then HTTPS; reopen popup after each change | Fixture route returned 200 with existing dynamic controls. Dynamic DOM/refresh tests pass. Native expected counts **0/0 → 1/1 → 0/0**, banners and refresh preservation **pending**. |
| Private browsing | With Firefox's private-extension access explicitly configured by the tester, load a fixture; no new persistent scan data or external lookup | `private-context.test.mjs` and private settings cases pass. Native private permission/context/storage inspection **pending**. Earlier stored rows are not cleared by this check. |
| Settings/restart | Toggle display controls, confirm live UI changes, restart and recheck preferences | Settings mock tests pass. Native restart/persistence **pending**; temporary add-on removal at restart is expected and differs from signed-release testing. |
| D17 disclosure/attribution | Inspect light/dark layout, 200% zoom, keyboard focus and HIBP/CC BY destinations | Existing popup accessibility tests pass. New notice/link visual and native keyboard checks **pending**. |
| Minimum version / strict validation | Verify minimum 142 as well as current Firefox; resolve strict validator warnings | Minimum-version browser unavailable in this run; **pending**. D16 warning record is historical and was not rerun or suppressed. |

### Checks actually performed

- Existing suite: **162 passed, zero failures/skips**. Command: `node --test tests/*.test.mjs`.
- Local runtime syntax/manifest-reference lint: **pass** (16-file allowlist).
- New controlled fixture server serves only on **127.0.0.1:4180**. HTTP checks confirmed page A/B 200, both redirects 302 with the intended Location, dynamic fixture 200 and the offline socket reset. Page A has six scored header names; B has none. No mock result is substituted into the actual extension.
- Native temporary installation: **runner-confirmed**. Interactive inspection: **blocked by tool policy before the first snapshot**. No native score, screenshot, banner, redirect outcome or private-context result is claimed.
- Final link/preservation/cleanup results are in [VERIFICATION.md](VERIFICATION.md).

## Reproduce and continue manually

1. In this separate checkout, run `node tests/acceptance-server.mjs`. Keep breach lookup off; the current implementation does not exclude localhost from enabled lookups.
2. In a disposable Firefox profile, load this checkout's manifest through `about:debugging`. Record Firefox/OS versions and any startup errors. Reload fixture pages after loading the extension.
3. Open `http://127.0.0.1:4180/page-a`; verify the actual popup shows HTTP, six present headers, no HTTP password form and **60**. Use only dummy input; all fixture submissions are canceled.
4. Open `http://127.0.0.1:4180/page-b` in a second tab; expect **0**, absent headers and one insecure password form. Return to A and reopen its popup without refresh. Record the actual score and form count. If A now shows **40** / one insecure password form, capture it as the known content-isolation failure. Refresh A, revisit B and record whether the overwrite reverses. Headers should remain independent.
5. Continue the rows above, keeping expected and observed results separate. Do not claim exclusions passed when no setting exists. Do not use a successful empty breach response as a service-failure fallback.
6. Stop the fixture server with Ctrl+C and close the disposable test profile. Do not change a normal browsing profile or enable transmission for real sensitive pages merely to exercise a test.

## Triage and handoff

Highest-priority existing implementation concern is content provenance across same-host tabs (D09), followed by targeted legacy cleanup (D10) and the missing exclusion policy (D13). These are source-confirmed gaps; this session did not reproduce their effects in native Firefox. The **next exact action** is steps 1–4 above, beginning with page A's initial score and then the two-tab comparison. Record observations here before choosing a bounded repair. D18 remains open; no D19 fix or D20 submission work was started.

## D19 provenance safeguard follow-up — 2026-10-24

The D18 matrix above is historical evidence, not a test of the D19 code. D19
reproduced its highest-priority concern in automated popup fixtures: same-host
foreign forms yielded 80 with the first tab's HTTPS/header evidence. Four of five
new checks failed before the fix. The revised suite passes, including two real
content-script instances sharing mocked storage.

The bounded fix tags summaries with a document marker and rejects mismatched or
unverifiable evidence. It does **not** keep independent content records: another
tab can still overwrite the row. Current expected behavior therefore differs
from D18's full-isolation target. The native steps below supersede D18 step 4 for
this build; they have **not** been performed.

1. Run `node tests/acceptance-server.mjs`. Load/reload the updated manifest in a
   disposable Firefox profile with breach lookup off. Reload fixture pages so
   their content scripts include the new identity handler.
2. Open `http://127.0.0.1:4180/page-a`: expect **60**, six present header names and
   zero insecure password forms. Open `/page-b` in another tab: expect **0**,
   missing headers and one insecure password form.
3. Return to A and reopen the popup without refresh: expect **Incomplete**, with
   content sections unavailable, rather than the old mixed score **40**.
   Refresh Analysis on A: expect **60** and zero insecure password forms.
   Returning to B may now show Incomplete; its refresh should recover **0**.
   Independent scores without refresh remain a D09 migration requirement.
4. Check a same-URL page reload and navigation while loading: old summaries must
   not produce a numeric score for the new document. Verify native HTTP identity
   generation, missing/outdated receivers, and no startup/content/popup errors.
5. Repeat private-context and consent checks under the existing matrix procedures;
   private/unknown contexts must not use persistent summaries or request identity.
   Record actual version, steps, results and failures here; do not treat mocked
   results as Firefox passes. Close the disposable profile and stop the server.

D19 remains open for native confirmation. Full content migration, legacy cleanup,
site exclusions, earlier matrix checks and validator warning review remain
release blockers. No D20 work has started.
