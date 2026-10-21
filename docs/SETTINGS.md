# On-page settings (D13, partial)

This is a bounded portion of D13: a compact settings page and persistent controls
for password-strength feedback and HTTP password-form warnings. **D13 is not
complete.** Site exclusions and their stop-all-analysis acceptance are not
implemented, and native Firefox restart/UI checks remain pending.

## Implemented behavior

Open **On-page settings** from the popup, or use Privacy Monitor's preferences in
Firefox's add-ons page. Both hints default to enabled on an installation with no
saved preferences. Save applies changes to open content scripts through storage
events. Disabling removes the corresponding injected UI immediately; enabling
reuses the bounded content scan to restore appropriate hints. Disabling password
feedback also cancels its pending timer and prevents password-value reads by that
feature. Disabled hints stay off after content-script initialization/reload.

These are display controls, not analysis exclusions. Form/page observations,
header capture, popup findings, and scores continue. Hiding HTTP warnings does not
turn an HTTP password-form observation into a clean result. Optional breach lookup
continues to use the existing popup/Firefox consent control. This page neither
requests permission nor starts a lookup. Host permissions are unchanged.

`settings.js` validates one versioned `storage.local` key:

```json
{
  "privacy_monitor_display_settings_v1": {
    "version": 1,
    "passwordFeedback": true,
    "formWarnings": true
  }
}
```

The settings page writes only this key. It contains no sites, URLs, values, or scan
records. Unrelated preferences, consent, and observations are preserved. Private
content scripts may read these global display choices but never write them or scan
results; changing a preference through the settings page is an explicit user action.

A missing key means defaults. Invalid/unknown-version data or failed reads leave
hints off; observations still run. The page reports read errors and disables Save
until preferences are verified. **Restore defaults** explicitly replaces only the
owned display key and can repair malformed data. Writes are awaited; a failed save
is not reported as success. A new storage event wins over a late startup read, and
unchanged settings do not cause repeated scans. Deleting the key restores defaults.
Reload a content page or save valid settings to recover after a failed initial read.
If multiple settings pages are open, the last successful save wins.

The manifest now loads `settings.js` before the content script and registers
`options.html` as a tab-based options page. Packaging includes these three new
runtime files: `settings.js`, `options.html`, and `options.js`. The package has 13
files; local lint checks options-page script references as well as popup references.

References checked 2026-10-21: Mozilla's [options_ui](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_ui),
[runtime.openOptionsPage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/openOptionsPage),
and [storage.onChanged](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged).

## Why exclusions remain unfinished

The current implementation has three separate analysis paths: hostname-keyed
content scans, D08's per-tab header coordinator, and the consented breach service.
The popup can also read old hostname rows. A content-only exclusion would remove
banners while leaving other analysis or requests active. D09's remaining migration
and D10's historical cleanup are still open. Implementing exclusions safely across
all these paths, pending operations, and popup state is beyond this focused slice.
No exclusion control or excluded-site promise is exposed to users.

Next implementation action, still D13: define one validated, persisted exclusion
policy with explicit exact-host/subdomain behavior. Gate content startup, dynamic
scans, refresh, password reads/UI, header capture, and breach cache/requests using
that same policy. On changes, cancel pending work, clear transient results/UI, and
reject late results. Make the popup show an explicit excluded state without reading
old same-host observations or displaying a score. Coordinate this with D09's
remaining record migration; keep D10 cleanup scoped to obsolete scan rows. Verify
restart, live enable/disable, two tabs, redirects, private contexts, storage errors,
and late scan/header/network results. Do not expand into host-permission redesign.

## Verification and native checks pending

`tests/settings.test.mjs` covers strict defaults/validation, saving only the owned
key, restoring saved settings in a new context, error/duplicate-save handling,
explicit default recovery, late startup reads, immediate UI removal during a slow
scan write, independent toggles, re-enabling, private no-write behavior, and popup
options opening/failure. These use modeled browser APIs and DOMs. They do not prove
Firefox disk persistence across a real restart or native event delivery.

Next browser action: reload root `manifest.json` in a disposable Firefox profile,
keep breach lookup off, and reload a controlled page so the new settings script is
loaded. Open **On-page settings** from the popup and check:

1. Keyboard access, labels, narrow layout, saved/error status, and Restore defaults.
2. On `http://127.0.0.1:4179/dynamic-forms.html` served by
   `node tests/popup-preview.mjs`, add a password field and select an HTTP action.
   Turn each hint off independently and save: its UI disappears in the open page;
   form counts/score evidence remain unchanged. Re-enable: one warning/indicator
   returns where appropriate, with no duplicated listeners or stale feedback.
3. Reload pages and restart Firefox, then reopen settings. Choices must persist.
   Temporary add-ons are removed at restart. Use a persistent development
   installation for full restart acceptance; reloading a temporary add-on alone
   does not establish persistence across an ordinary installed-extension restart.
4. Repeat UI toggles in private pages; verify no scan writes or breach requests.
   Preferences must affect open normal pages as well. Verify disabling a hint during
   pending feedback/scan work cannot recreate it.
5. Inspect options/content/popup consoles and stored data for unexpected values.
   Recheck missing/invalid preferences and write-failure messaging with test tools.

Record Firefox version and exact outcomes in PROGRESS.md. Stop the fixture server.
Carry D01–D12 native checks forward. Site-exclusion acceptance remains outstanding
regardless of these display-setting results. Stop before D14.
