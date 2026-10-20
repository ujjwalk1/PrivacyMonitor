# Header navigation lifecycle (D08)

[Record contract](ANALYSIS_RECORDS.md) · [Development guide](DEVELOPING.md)

D08 moves header capture into the D07 transient per-tab store. It adds
`webNavigation` permission to distinguish page navigation from hostname equality.
The extension remains plain JavaScript, MV2, version 1.1, without new dependencies.
Automated checks pass; native Firefox acceptance remains pending.

## Correlation and resets

`background.js` coordinates only main-frame events with a valid tab ID and timestamp.

1. `webNavigation.onBeforeNavigate` removes all previous observations, including
   for same-URL reloads and unsupported destinations.
2. A subsequent `webRequest.onBeforeRequest` captures the request ID and browser
   context. Each redirect hop replaces that request's pending evidence.
3. `onHeadersReceived` reduces six allowlisted names to presence/absence.
   Raw values are never copied into records. Missing or malformed header arrays
   and 3xx responses are unavailable. In particular, a 304's partial header list
   cannot establish absence.
4. `webNavigation.onCommitted` creates a new generation for an HTTP(S) page.
   It copies optional document identity from the committed event, and private/
   container metadata from the matching request; missing metadata stays null.
5. Headers publish only when the request completes and the request, response,
   and committed resource digests agree. Path/query differences matter; fragments
   do not. Request ID, navigation generation, event timestamps, and object identity
   checks prevent superseded asynchronous digest work from updating another page.
6. Navigation errors clear the record; request errors discard pending response
   evidence and mark headers unavailable if a record exists. Tab closure/replacement
   removes records and pending correlation state.

The coordinator is bounded to 256 tabs, matching the record store's bound.
It retains timestamps, request/context identity, and SHA-256 resource digests only
in background memory. The URL is parsed transiently for matching, with its fragment
removed; the record exposes only hostname/protocol. Digests are internal comparison
keys, not anonymized history: they are neither persisted nor sent in messages.
Reloading the extension clears this state.

## Conservative cases and migration boundary

There is no guaranteed ordering between the webRequest and webNavigation APIs.
If request start arrives before the observed navigation boundary, it is ignored.
Missing events, mismatched resources, missed requests at installation, and history
restoration without a captured response leave headers not observed. A completed
request may arrive before or after commitment. Same-document fragment/history
changes retain the current document's headers; a new document must establish its
own evidence. Firefox's actual redirect/cache/event sequences still need testing.

The popup reads only headers through the v1 analysis message. It checks tab,
hostname, protocol, schema, and observation shape before projecting presence states
into the existing scorer/renderer. Missing evidence remains not observed; transport
or malformed replies show unavailable. Neither outcome falls back to legacy
`headers_<hostname>` storage.

Partial D09 unifies content scanning and refresh, but connection/form/privacy
results still use legacy hostname storage; see [SCAN_REFRESH.md](SCAN_REFRESH.md).
The aggregate popup can therefore still contain stale content-scan data.
Existing persistent header rows are ignored and left for D10 cleanup; preferences
are untouched. D08 does not complete private-session enforcement, header-value
evaluation, minimum-browser selection, or whole-popup navigation isolation.

## Verification

`tests/header-navigation.test.mjs` exercises actual manifest background scripts with
synthetic browser events: two same-host tabs and contexts, same-/cross-host redirects,
same-URL reload, path/query/fragment matching, stale events and delayed digest work,
completion/commit ordering, errors, unsupported destinations, cache restoration,
304/malformed headers, bounded state, tab removal/replacement, and popup rejection
of stale or invalid replies. These fixtures make no external requests and assert
that header capture performs no storage writes. They do not establish browser
event ordering or real permission compatibility.

Mozilla references checked 2026-10-20:
[webNavigation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation),
[onBeforeRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest),
[onHeadersReceived](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived),
[onBeforeRedirect](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRedirect),
and [onCommitted](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onCommitted).
Request-event document metadata describes the requesting document; it is not used
as the destination document identity.

## Native Firefox acceptance (pending)

Use a disposable profile and controlled, non-sensitive HTTP(S) fixtures. Keep
breach lookup disabled. Reload root `manifest.json` with `webNavigation` permission,
then reload fixture pages. Inspect `PrivacyMonitorAnalysisStore.get(tabId)` in
the background debugger and the popup's header section. Record Firefox version,
fixture responses, event sequence, console errors, and pass/fail in PROGRESS.md.

1. Open two tabs on one hostname, one response with CSP and one without. Confirm
   separate header observations and navigation IDs, including container/private
   context where available. Confirm no new `headers_` storage writes.
2. Navigate through same-host paths/queries and a cross-host redirect, giving the
   redirect and final response different headers. Only the final response may
   populate the committed page. Test same-URL reload with changed response headers.
3. Start a slow response, navigate away before it completes, then allow it to
   finish. Previous-page headers must never populate the new page. Check a failed
   navigation and an unsupported destination; old success must be cleared.
4. Exercise cached responses, 304 revalidation, back/forward restoration, and a
   page already open at extension installation. Missing capture must stay neutral,
   never become a complete successful score or reuse another document's headers.
5. Close tabs during loading and after completion. Records must disappear and late
   work must not restore them. Reload the extension and verify the store is empty
   until new navigation. Check popup/background consoles for errors.
6. Carry forward D01–D07's outstanding native checks, including message sender
   authorization. Fix any reproduced D08 failures and rerun affected checks before
   marking D08 complete. Do not start D09 in this session.
