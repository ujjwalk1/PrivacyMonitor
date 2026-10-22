# Optional breach lookup (D05)

[Repository overview](../README.md) · [Development guide](DEVELOPING.md)

## Behavior

Fresh installations make no breach request. The popup discloses the recipient
(Have I Been Pwned), the hostname transmission on popup open/refresh after consent,
and the service's visibility of the connection IP address. D06 reuses fresh cached
results and observes retry timing before sending; see [BREACH_CACHE.md](BREACH_CACHE.md). Requests omit credentials
and referrers; page paths, queries, passwords, cookie values, and scores are not
included. Historical domain records do not establish whether a personal account
was breached. Local analysis works independently.

Enable asks Firefox for consent; denial leaves lookup off. Firefox stores the
permission. Disable revokes it and immediately blocks this popup's requests,
aborts pending fetch/body work, and clears results. Revocation in `about:addons`
also cancels pending work. Already transmitted data cannot be recalled. If removal
fails, the popup says so and blocks its own lookups; retry Disable or revoke
Browsing activity in Firefox before reopening. Controls remain visible on
unsupported/unreadable pages.

## Firefox integration

Documentation checked **2026-10-11**:

- The manifest declares `required: ["none"]` and `optional: ["browsingActivity"]`
  under `browser_specific_settings.gecko.data_collection_permissions`. Domains
  are browsing activity; this declaration concerns transmission outside the local
  browser. Sources: [Mozilla consent guide](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
  and [manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings).
- Each lookup checks `permissions.getAll().data_collection`. Missing support or
  failed reads leave lookup off. Mozilla documents native consent from desktop
  Firefox 140 / Android 142; no project minimum version or custom fallback is added.
- Enable calls `permissions.request({data_collection: ["browsingActivity"]})`
  synchronously from the click handler, before awaiting anything. Firefox retains
  granted permission. See [request()](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request).
- Disable uses [remove()](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/remove).
  Permission events invalidate authorization reads and late results. No separate
  local preference overrides Firefox's choice.

MV2, the Gecko ID, and host/API permissions are preserved. The `applications` alias
became `browser_specific_settings`. The full manifest audit remains D16; D06 caching/backoff is documented in [BREACH_CACHE.md](BREACH_CACHE.md).
Storage/navigation/private-session changes remain D07–D10.

## Verification and pending browser checks

The D05 checkpoint passed **53 tests**, including 12 D05 tests for consent, missing/failed APIs,
cancellation, stale reads, revocation, request data, removal failure, and independent
local scoring. No external requests are made by tests.

Run `node tests/popup-preview.mjs` from the repository root. `consent-off`,
`consent-denied`, and `consent-unsupported` simulate permissions; earlier fixtures
simulate an already-consenting profile. On 2026-10-11 the in-app browser verified
off → enable → results → disable, denial, and missing consent support. Score 100
was retained, disclosure wrapped, and captured console errors/warnings were empty.
These fixtures do not test real Firefox prompts or persistence.

Pending in a disposable Firefox profile:

1. Temporarily load the root manifest following [DEVELOPING.md](DEVELOPING.md#load-and-check-in-firefox).
   Check manifest/startup errors and initial Browsing activity permission off.
2. Inspect extension network requests while opening/refreshing a non-sensitive
   page: expect zero HIBP calls and working local observations before consent.
3. Deny Enable's real Firefox prompt and reopen: still zero calls. Then approve:
   verify hostname-only parameters, no cookies/referrer, and remembered permission.
   Confirm the action survives any popup closure caused by the native prompt.
4. Disable, reopen, and refresh: no further calls. Re-enable, then revoke in
   `about:addons` during a slow lookup; check cancellation and no stale result.
5. Check [Mozilla's permission-testing guide](https://extensionworkshop.com/documentation/develop/test-permission-requests/)
   for install/update prompts. Temporary loading silently grants install-time
   permissions but shows runtime prompts; it does not prove the install UI.
   Record version, request counts, console errors, and exact results in
   [PROGRESS.md](development/PROGRESS.md), carrying D01–D04 browser checks forward.

D05 remains open until installed-Firefox acceptance is recorded.
