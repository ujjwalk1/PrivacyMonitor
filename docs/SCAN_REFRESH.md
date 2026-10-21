# Shared content scan and refresh (D09, partial)

This is the first safe portion of D09. The full per-tab content-record migration
and native Firefox acceptance are still outstanding. Do not mark D09 complete.

## Implemented

`content-script.js` owns one `analyzePage()` path for startup, dynamic monitoring,
and popup refresh. It collects the existing page/form findings,
maintains password feedback and warnings, and awaits one storage write containing
both legacy records in normal contexts. Partial D10 skips persistence in private/unknown
contexts while keeping warnings local; see [PRIVATE_HANDLING.md](PRIVATE_HANDLING.md). Scans are serialized within that document; a rejected write
does not prevent a later retry. No raw failure details are logged.

Refresh sends `{channel: 'privacy-monitor.scan', version: 1, type: 'refresh'}` to
the selected tab's top frame using `tabs.sendMessage(..., {frameId: 0})`. The content
listener accepts only the extension's exact popup sender, rejects extra request
fields, and leaves other channels unanswered. It replies with the channel/version
and `ok: true` only after the scan write resolves. Errors are `forbidden`,
`invalid-request`, `not-ready`, or `scan-unavailable`. No page data is returned.

The popup waits for that acknowledgement before reading observations. Missing,
failed, or malformed replies show unavailable and clear the old score. Superseded
loads cannot be restored by a delayed reply. The duplicate injected scanner and
600 ms delay are removed. Pages without a content-script receiver require a page
reload after installation; refresh does not inject a second scanner.

Existing form banners are preserved; a removed banner is recreated even if its
marker remains. A banner is removed when the shared scan finds that the form no
longer has an HTTP password destination. D11 now resolves base URLs and submitter
overrides; unsupported routes produce an unavailable aggregate. See
[FORM_DESTINATIONS.md](FORM_DESTINATIONS.md). D12 adds bounded observation of relevant
attributes, base changes, and additions/removals; see [DYNAMIC_MONITORING.md](DYNAMIC_MONITORING.md).

## Remaining D09 work

The temporary adapter still writes `security_data_<hostname>` and
`forms_<hostname>` in normal contexts; the normal-tab popup still reads them.
Partial D10 omits URLs from new writes and blocks private writes/legacy reads, but
older rows may retain full URLs. Serialization is per document and does **not** prevent races between
same-host tabs or documents. Header observations remain on D08's separate record
path. Whole-popup tab/navigation isolation and full private-session acceptance
remain pending. The scan message is a temporary popup-to-content command, not a new write
operation in the D07 background contract. Permissions and dependencies are unchanged.

Next implementation action: bind content scan requests/results to the background's
current tab/navigation/document identity, validate bounded section payloads, and
write connection/forms/privacy to the shared record. Reject delayed old-document
results, including same-URL reloads. Route refresh through that coordinator and
migrate the remaining popup readers together, then remove this legacy write
adapter. Test missing identity, unauthorized frames, same-host tabs, navigation
during scans, failures, and partial observations. Leave existing stored-row cleanup
and final private-session validation to D10 after D09 is accepted. Partial D10
has only applied the independent safeguards documented above.

## Verification and pending browser checks

`tests/content-refresh.test.mjs` covers the real content script and a popup-to-content
fixture, awaited/serialized writes, retry after failure, warning preservation,
recreation/removal, sender/request validation, observer reuse, invalid replies,
and superseded loads. Existing popup tests check loading until the read completes
and unavailable on message failure. Fixtures use no external service or passwords.

Native Firefox checks remain pending. In a disposable profile with breach lookup
off, load root `manifest.json`, reload a controlled HTTP password-form fixture,
then open the popup and press Refresh repeatedly. Confirm the warning remains
single, the button returns from loading, and both observation sections update.
Remove the banner while retaining its marker, then refresh and confirm recreation.
Change the form to HTTPS and refresh; confirm the old warning disappears. Check a
restricted page/missing receiver and navigate away during a scan: no stale success
may replace a newer popup load. Inspect popup/content consoles and record Firefox
version and exact results in PROGRESS.md. Carry D01–D08's browser checks forward.

API references checked 2026-10-21: Mozilla documents frame targeting and rejected
delivery in [tabs.sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage),
and asynchronous replies in [runtime.onMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage).
