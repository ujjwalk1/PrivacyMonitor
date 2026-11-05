# Request details view

D25 adds a separate details page for [observed request classification](REQUEST_ANALYSIS.md).
**This is an isolated implementation, not a feature enabled in the current beta.**
The page, source adapter and D21–D24 dependencies remain outside the manifest
and shipping ZIP. The popup and score are unchanged. D25 acceptance is partial.

## Components and access

- [requests.html](../details/requests.html) and [requests.css](../details/requests.css)
  provide a responsive page with native refresh and evidence-disclosure controls.
- [requests-view.js](../details/requests-view.js) validates and renders the
  bounded result using text nodes. It adds no links to observed domains.
- [requests-page.js](../details/requests-page.js) requires exactly one explicit
  nonnegative safe-integer `?tab=N` target. It never guesses the active tab.
- [request-details-source.js](../lib/request-details-source.js) constructs the
  actual D24 analyzer over the existing store, collector and bundled dataset.
  Its synchronous `read(tabId)` obtains the current D07 record and returns
  `{ analysis, dataset }`. It does not write observations or settings.

An explicitly installed background instance named
`PrivacyMonitorRequestDetailsSource` supplies the view through the MV2
`runtime.getBackgroundPage()` API. Missing setup fails visibly; there is no
synthetic fallback in the real page and no content-script message API.
This is trusted extension-page access, not authorization for arbitrary web pages.
Production entry points, sender/context policy and package loading still need
review before enabling it.

## What the view shows

Every observed domain has its own card with resource types and observed event
counts, a classification label, a separate site relationship, and the dataset
snapshot retrieval date when classification data is usable. The date is not
the time of the request or a promise that the list is current.

Evidence disclosures show the dataset revision. Listed hosts additionally show
the matched rule, source file/line, exact or subdomain match, and source SHA-256.
Owner and category are explicitly **Unknown**, reflecting the dataset's null
fields. Unlisted hosts explain that this limited dataset did not match them;
unavailable classification never receives a fabricated date or clean verdict.

A tracker-list match is evidence of list membership, not proof of tracking.
First-party membership is not a safety judgment. Event counts do not establish
unique requests, successful loads or blocking. Capture coverage is always
visible: top-frame requests after commit only. Truncation and saturation are
prominent; saturated counts are labeled as lower bounds.

The renderer rejects malformed, duplicate, oversized or inconsistent output,
including mismatched list evidence. Bounds remain 256 domains/type entries and
65,535 events per pair. Data is inserted as text, not HTML.

## Lifecycle and privacy

Refresh replaces the current snapshot without reloading the target website.
Navigation invalidates displayed results; tab closure/replacement clears them.
Permission removal and hiding the details page also clear visible findings.
A hidden page does not read results; becoming visible refreshes the snapshot.
Generation checks prevent an earlier asynchronous read from restoring cleared
results. Page exit disposes listeners. A closed target cannot be refreshed.

Loading, no observations, unavailable, invalid target, changed page and closed
tab are separate states. None implies zero trackers. D24 rejects private or
unknown-context records before reading capture. No additional network lookup,
persistent history, telemetry, permissions or score calculation is introduced.
Native lifecycle ordering and production context/access integration remain
pending; automated lifecycle events are not Firefox acceptance evidence.

## Local visual preview

From the checkout, run:

```text
node tests/request-details-preview.mjs
```

Open `http://127.0.0.1:4181/?tab=1&case=mixed`. The preview is explicitly
labeled **synthetic observations; not a live scan** and listens only on
127.0.0.1. It uses the real view/controller with synthetic browser APIs and
D24 results over a fixture capture snapshot. It does not browse tracker hosts.

Other `case` values are `empty`, `unavailable`, `limits`, `long` and
`loading`. Stop the preview with Ctrl+C. The preview server and test helpers
are excluded from the extension package.

## Pending Firefox procedure

Use a disposable profile with breach lookup off. Load the checkout manifest
temporarily, start `node tests/acceptance-server.mjs`, and follow the
[D23 setup](REQUEST_CAPTURE.md#pending-firefox-procedure) and
[D24 continuation](REQUEST_ANALYSIS.md#pending-firefox-continuation).
Keep the actual D23 collector `d23` attached. D23's documented document-ID
compatibility gap must be resolved or recorded; missing IDs must remain
unavailable, never bypassed with synthetic IDs.

In the trusted extension background console, load the D25 adapter and bundled
data (the D24 continuation must already have loaded its dependencies):

```js
await new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('lib/request-details-source.js');
  script.onload = resolve;
  script.onerror = () => reject(new Error('Local source failed to load'));
  document.head.appendChild(script);
});
const detailsResponse = await fetch(browser.runtime.getURL('data/trackers/domains.json'));
if (!detailsResponse.ok) throw new Error('Bundled dataset unavailable');
globalThis.PrivacyMonitorRequestDetailsSource = PrivacyMonitorRequestDetails.createSource({
  store: PrivacyMonitorAnalysisStore,
  collector: d23,
  dataset: await detailsResponse.json()
});
```

Identify the actual normal page-B tab ID from the local acceptance setup.
Check its current D07 record and capture before opening the page; substitute
that ID for `targetTabId` below:

```js
await browser.tabs.create({
  url: browser.runtime.getURL('details/requests.html') + '?tab=' + targetTabId
});
```

After a captured same-origin local fetch, expect a first-party 127.0.0.1 card,
resource type/event count, no supported list match, and the bundled snapshot
date. Trigger another local fetch and refresh: its count should increase once;
repeated refresh alone must not increase it. The D24 distinct-local-host
procedure can supply a third-party observation without contacting a tracker.

Check target navigation, two tabs, tab close/replacement, private context,
missing IDs/data, stopped capture, hide/show and stale reads. Confirm refresh
and disclosures with keyboard, visible focus, narrow layout, light/dark themes,
zoom and a screen reader. Verify no previous domains survive invalidation.
Known-list matches are automated fixtures unless separately observed in a
native session; do not describe them as live tracking evidence.

Record actual Firefox versions and results in [VERIFICATION](development/VERIFICATION.md).
Stop `d23`, reload the temporary extension to remove manual globals/listeners,
and close the disposable profile afterward. These steps remain pending.

## Verification commands and remaining work

```text
node --test tests/request-details.test.mjs
node --test tests/*.test.mjs
node --check lib/request-details-source.js
node --check details/requests-view.js
node --check details/requests-page.js
node tools/lint.mjs
node tools/check-docs.mjs
```

Before shipping, resolve the existing beta record/settings prerequisites and
D23 compatibility, integrate trusted entry/access/loading and package notices,
and complete native Firefox acceptance. Do not interpret the preview as
completion of those checks or begin D26 as part of this slice.
