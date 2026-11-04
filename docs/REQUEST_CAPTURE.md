# Bounded request metadata capture

D23 adds [lib/request-capture.js](../lib/request-capture.js), an explicitly
attached, memory-only collector. **It is not loaded by the manifest or included
in the extension ZIP.** The popup, score, permissions and existing background
records are unchanged. This is a partial implementation with automated tests;
native Firefox acceptance and production integration remain open.

## Scope and compatibility decision

The collector observes HTTP(S) `webRequest.onBeforeRequest` events from the
top frame **after** a corresponding top-level navigation has committed. It
requires the request's browser-supplied document UUID to match that commit.
It never assigns requests to a page merely because a tab ID or hostname matches.

Mozilla documents request document IDs, event timing and frame IDs in
[onBeforeRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest)
and document identity in
[onCommitted](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onCommitted).
The [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/webRequest.json)
records request document-ID support beginning in Firefox **153**; the
[webNavigation compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/webNavigation.json)
records commit document-ID support from the same version. These sources were
checked on 2026-11-04; native behavior was not tested in this session.

The current manifest minimum is **142**. It is unchanged. Missing IDs produce
unavailable, without a weaker URL/hostname fallback. Whether to retain this
feature limitation on 142 or revise the supported baseline is an integration
decision still to be made and tested.

Coverage deliberately excludes initial page requests, pre-commit resources,
subframe navigations and resources, workers with no top-frame identity, and
non-HTTP(S) requests (including WebSockets). Cached or browser-protected traffic
may not generate accessible events. Same-document history/fragment changes do
not create a new document; this slice does not reset on those events.
It cannot reconstruct activity that happened before attachment or commit.

## API and lifecycle

Load the local tldts bundle, [site-domains.js](../lib/site-domains.js), then
`lib/request-capture.js` in a trusted background context. The module does
nothing automatically. Call `PrivacyMonitorRequests.attach(browser)` once;
it returns `get(tabId, expectedDocumentId?)` and `stop()`.

- `onBeforeNavigate` for the top frame immediately clears previous evidence
  and starts a pending record. Older navigation events are ignored.
- A paired `onCommitted` resets the aggregates and records the new UUID and
  commit time. Missing identity or unsupported page input yields unavailable.
  Duplicate commits do not clear findings; an unpaired later commit resets them.
- Only post-commit, top-frame events with the matching UUID and explicit
  `incognito: false` can contribute. Old-document events are ignored. Missing
  identity, a failed helper, or private/unknown context makes that record
  unavailable and clears its observations until another navigation.
- Navigation errors, removed/replaced tabs, oldest-navigation eviction,
  `stop()` and background destruction discard records. Reads and requests
  do not prolong eviction priority. There is no persistence or time-based expiry.
- `stop()` clears records and removes listeners; guarded callbacks stay inert
  even if removal fails. Partial registration failure rolls back registration
  and returns unavailable. The host must stop the collector when its analysis
  policy or required access changes; production policy wiring remains pending.

This collector maintains an isolated map, not a second published analysis API.
It has no content-script message listener. Future integration must connect the
UUID to the current D07 analysis identity and enforce settings/access policy
before making observations available to a consumer.

## Data and bounds

Each retained aggregate is only
`{ hostname, type, events }`. Hostnames use D21 canonicalization, including
IDNs and IPs. Resource types use a fixed set; unrecognized values become
`other`. URLs are parsed transiently and discarded. Credentials and invalid
or oversized URLs are rejected using the D21 input rules.

No request bodies, cookie values, headers, request IDs, initiator/document URLs,
methods, paths, ports, queries or fragments are read into retained records.
The collector never copies an event object. A hostname can itself identify
sensitive browsing, so even these reduced observations must remain subject to
future context and access controls.

| Bound | Limit and behavior |
| --- | --- |
| Navigation records per collector | 64; creating a newer record evicts the oldest begun navigation |
| Hostname/type pairs per navigation | 256; additional distinct pairs are dropped and truncated becomes true |
| Total retained aggregates per collector | At most 16,384, plus fixed-size record/index overhead |
| Event count per pair | 65,535; further events saturate the count and set counterSaturated |
| Canonical hostname length | At most 253 characters under D21 validation |
| Document identifier | One 36-character UUID per committed record |
| URL input | D21 caps input at 8,192 characters; none is retained |

These are structural memory bounds, **not a measured browser heap-byte budget**.
The host must own only one collector; callers retaining copies are outside its
internal cap. Counters count observed events, not unique network requests:
redirects/retries/repeated events can increment them. At capacity, existing pairs
can still increment. Truncation/saturation flags reset with the navigation.

## Reading results honestly

| Kind | Meaning |
| --- | --- |
| observed | One or more in-scope events were recorded; not proof of loading, tracking or blocking |
| not-observed | No retained observations, a fresh/evicted record, or a tab not captured; never a zero-tracker or safe verdict |
| unavailable | Pending commit, unsupported page, missing document identity/helper, private/unknown context, failed registration, stopped collector or stale requested document |
| invalid | Invalid tab ID or expected document UUID |

Ready snapshots include document UUID, coverage `top-frame-after-commit`,
truncation/saturation flags and copied observations. Consumers should supply
the expected UUID to avoid reading a newer document by mistake. No result
claims complete capture. There is no tracker classification, first/third-party
decision, request blocking, scoring or UI work in D23.

## Automated verification

[tests/request-capture.test.mjs](../tests/request-capture.test.mjs) attaches
the real collector to event mocks and uses the actual D21 parser. Sixteen tests
cover normalization/privacy, two tabs/containers, same-URL navigation, old UUIDs,
redirect commit boundaries, missing IDs, private/unknown contexts, cleanup,
malformed URLs, all three capacity limits, mutation isolation and dependency/
registration failure. Sensitive event fields have throwing getters to catch
accidental inspection. No external requests or persistent writes are permitted
by the harness.

Commands from the repository root:

```text
node --test tests/request-capture.test.mjs
node --test tests/*.test.mjs
node --check lib/request-capture.js
node tools/lint.mjs
node tools/check-docs.mjs
```

## Pending Firefox procedure

These steps are **instructions, not recorded passes**. Use a disposable Firefox
profile, keep breach lookup off, and load the checkout's manifest as a temporary
add-on. Do not use the old ZIP: it excludes these development assets.

1. Start `node tests/acceptance-server.mjs`. Open the extension's background
   console through about:debugging and Inspect. Confirm the selected execution
   context is the extension background page, not a content script or popup.
2. Load only the local helper files in that console, then explicitly attach:

```js
for (const file of [
  'vendor/tldts/index.umd.min.js',
  'lib/site-domains.js',
  'lib/request-capture.js'
]) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL(file);
    script.onload = resolve;
    script.onerror = () => reject(new Error('Local helper failed to load'));
    document.head.appendChild(script);
  });
}
globalThis.d23 = PrivacyMonitorRequests.attach(browser);
```

3. Open/reload `http://127.0.0.1:4180/page-b` after attaching. In that page's
   developer console, run
   `await fetch('/page-a?d23=synthetic', { cache: 'no-store' })`.
   In the background console, find the fixture tab IDs with
   `(await browser.tabs.query({ url: 'http://127.0.0.1:4180/page-b' })).map(tab => tab.id)`
   and inspect `d23.get(theTabId)`. On a version providing document IDs,
   expect an observation for 127.0.0.1 of type xmlhttprequest; no query/path.
   Incidental requests can add observations, so do not assert an exact total.
4. Repeat in a second fixture tab/container. Fetch from one tab only and compare
   its counts with the other. Reload the same URL: the document UUID must change,
   and reading with the previous UUID must report stale-document. Close a tab
   and confirm its observations disappear. Exercise `/redirect` and a navigation
   to about:blank without carrying old request evidence.
5. Repeat on Firefox 142: missing document IDs should produce unavailable,
   not a successful empty result. Record the actual version and observed API
   fields without logging full request objects. Validate private-context
   rejection only in a disposable profile configured to permit the add-on in
   private windows; never enable breach lookup.
6. Run `d23.stop()`; subsequent reads must be unavailable/stopped. Reload the
   extension to discard manually loaded helpers, close the disposable profile,
   and stop the fixture server.

Record actual version, results and failures in the
[verification log](development/VERIFICATION.md). Before shipping, resolve the
[beta prerequisites](development/PROGRESS.md), choose the compatibility policy,
wire current analysis identity/access lifecycle, package all helper/license
materials and complete Firefox acceptance. Do not begin D24 as part of this slice.
