# Private-context safeguards (D10, partial)

D10's cleanup prerequisite is not met: D09 still writes and reads hostname-keyed
content records. Deleting them while their writers/readers remain active would
discard usable observations and let later scans recreate the records. This session
implements independent privacy protections only. D09 and D10 remain incomplete.

## Implemented behavior

- New content scans omit the full page URL from their summaries. URL parsing for
  script-domain counts remains transient. Passwords and cookie values are not
  written; existing cookie/script/form counts are unchanged for normal tabs.
- The content script requires `browser.extension.inIncognitoContext === false`
  before writing either legacy scan record. Private, missing, or malformed context
  skips persistence. Password feedback and form warnings remain on the page, and
  refresh can recreate warnings without storing results.
- The popup requires the browser tab's `incognito` flag to be exactly false before
  reading legacy content records. A private tab cannot display a normal tab's
  stored observations for the same hostname. Private/unknown-context popups show
  an incomplete score and an explanation; D08's transient header reader remains
  available. Complete private-tab content results await the remaining D09 work.
- Breach lookup is blocked for private and unknown-context tabs even after consent
  or refresh. `PrivacyMonitorBreachService.lookup(hostname, {incognito})` now requires
  an explicit normal-context flag from its trusted privileged caller. The service
  checks it before consent, cache access, pending-request sharing, or network work.
  It returns `private-disabled` or `context-unavailable`, never a clean result.
  Private calls do not consume or cancel normal-tab cache/pending work.

The content flag comes from the content script's browser context; the popup flag
comes from `tabs.query`. Background private metadata is not inferred from the
background process, which may be shared. There is no new content-supplied write
contract or permission. No preferences or stored rows are deleted in this slice.

## Remaining work and limitations

Existing stored rows can still contain full URLs or data written by earlier
versions, including private observations. Normal tabs still use hostname-keyed
storage, with D09's known tab/navigation races. This patch does not claim to erase
historical data or complete private-session acceptance. Reload the updated add-on
and test pages so older content-script instances are no longer running.

Next prerequisite: complete D09's background-bound content-record migration and
remaining popup readers using [SCAN_REFRESH.md](SCAN_REFRESH.md). Then finish D10
with a targeted cleanup of `security_data_`, `forms_`, and `headers_` legacy rows,
preserving preferences and unrelated keys. Verify retry behavior on storage errors,
repeat cleanup safely, prove migrated scans do not recreate rows, and repeat the
private-session checks with the final record path. Do not start D11 in this session.

## Checks and native Firefox acceptance (pending)

Automated fixtures verify URL/cookie-value omission, no private or unknown-context
content writes on startup/refresh/observer activity, preserved local warnings,
skipped popup storage reads, service rejection before cache/network, cached and
pending normal/private interactions, consent/refresh behavior, and a delayed normal
reply after switching to a private tab. They do not verify real browser contexts.

In a disposable Firefox profile, reload the add-on and fixture pages. Allow the
add-on in private windows for the test, then:

1. Scan a normal fixture with a synthetic sensitive path/query/fragment and dummy
   cookies. Confirm new storage summaries contain counts but no URL or cookie
   values. Preserve unrelated preference keys.
2. Open the same hostname in a private window and inspect the content script's
   `extension.inIncognitoContext` and popup tab's `incognito` flag. Trigger startup,
   form addition, and Refresh. Confirm no persistent writes, working local warnings,
   an incomplete popup, and no reuse of the normal tab's stored counts/forms.
3. With breach consent enabled, test private popup open, Refresh, and consent
   toggles. Verify no private-hostname request and no cached result displayed.
   Repeat with a fresh normal-tab cache entry and a pending normal lookup.
4. Navigate/close private tabs and inspect background/popup/content consoles.
   Record Firefox version, exact flags, storage/network observations, and pass/fail
   in PROGRESS.md. Carry D01–D09's pending native checks forward.

Mozilla references checked 2026-10-21:
[extension.inIncognitoContext](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extension/inIncognitoContext)
defines the content-script private flag;
[tabs.Tab](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab)
defines tab privacy metadata. No tested minimum Firefox version is claimed.
