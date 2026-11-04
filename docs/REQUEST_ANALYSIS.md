# Observed request classification

D24 adds [lib/request-analysis.js](../lib/request-analysis.js), a synchronous
projection joining a trusted current [analysis record](ANALYSIS_RECORDS.md) to
[D23 capture](REQUEST_CAPTURE.md), [D21 site matching](SITE_DOMAINS.md) and the
[D22 tracker-list adapter](TRACKER_CLASSIFICATION.md).

**This module is not loaded by the manifest or included in the current ZIP.**
The live popup and score are unchanged. Production setup, access policy and
native Firefox acceptance remain open; D24 is partial.

## Input and identity

Load the local tldts bundle, site-domains.js, tracker-classifier.js,
request-capture.js and request-analysis.js in a trusted background context.
Create one analyzer using an already attached collector and parsed local data:

```js
const analyzer = PrivacyMonitorRequestAnalysis.create({ collector, dataset });
const current = PrivacyMonitorAnalysisStore.get(tabId);
const result = current.ok && current.kind === 'record'
  ? analyzer.analyze(current.record)
  : { kind: 'not-observed' };
```

The caller must supply a **current, trusted D07 record**, not a page-authored
object. This is not a content-script message API or a replacement for sender
validation. The analyzer checks record schema/tab/navigation identity, requires
explicit normal context and a document UUID, validates the HTTP(S) page hostname,
then reads `collector.get(record.tabId, record.documentId)`.
It independently rejects a mismatching returned UUID. Private/unknown context
or missing identity is rejected before any capture read.

This connects the existing modules without modifying their contracts. It does
not write findings into D07 records or register a production consumer.
Any later asynchronous consumer must recheck tab/navigation/document identity
before displaying a result. The analyzer itself is synchronous and has no
history or result cache.

## Finding semantics

A result with `kind: observed` includes one finding per canonical observed
hostname, along with tab/navigation/document identity, canonical page hostname,
D23 coverage, truncation and counter-saturation flags. Each finding keeps two
independent facts:

- `party`: first-party, third-party or unknown, based on D21's schemeless
  hostname/registrable-domain comparison. Private suffix boundaries are included.
  This is not company ownership, same-origin status or a safety judgment.
- `tracker`: listed with source evidence; unknown with not-listed or
  unsupported-host reason; or unavailable if the adapter/data cannot classify.

The derived `classification` follows this table:

| Condition | Classification |
| --- | --- |
| D22 reports an included rule match, for any party relationship | known-tracker |
| Tracker adapter/data unavailable | unavailable; party can still be known |
| No list match, same host/site under D21 semantics | first-party |
| No list match, known different site | unclassified-third-party |
| No list match, relationship boundary unknown | unknown |

Here **known-tracker means a tracker-list match**, not demonstrated tracking by
that request. In particular, a listed first-party host retains both
`party: first-party` and `classification: known-tracker`. A listed host can
also have unknown party status. List evidence is never suppressed because of
the site's relationship.

Listed evidence preserves D22's rule, source line, dataset ID, pinned revision,
retrieval date, source hash and exact/subdomain match type. **Owner and category
are always null**, because this dataset does not establish them. No company
relationship is guessed: for example, two different registrable domains remain
third-party under this model even if a company operates both.

No network request is sent to classify a hostname. The module has no storage,
logging, browser API or permission operations. Reduced hostnames can still be
sensitive, so production access and private-context policy remain necessary.

## Deduplication and limits

Input is a single D23 **cumulative snapshot**, not a stream of incremental rows.
Hostname aliases are canonicalized through D21. Observations are grouped by
canonical hostname, with a sorted list of resource types and their event counts.
Repeated rows for the same canonical hostname/type keep the **maximum** count;
they are never summed. This avoids inflating counts if a cumulative row is
duplicated or replayed. Distinct subdomains remain separate findings even when
D21 calls them the same site.

Re-analyzing the same snapshot produces the same result without accumulating
state. Hostnames and types use deterministic lexical order. Returned arrays and
evidence are independent copies; changing them cannot change later results.

The accepted snapshot has at most **256 rows**, each with a positive integer
event count no greater than **65,535**, matching D23's limits. Output therefore
has at most 256 host findings and 256 hostname/type entries. Resource types must
be bounded lowercase/underscore tokens. D21 bounds and validates hostnames.
Oversized or malformed snapshots fail as a whole instead of silently producing
apparently complete partial findings.

Event counts remain counts of observed events, not unique requests. D23's
`truncated`, `counterSaturated` and `top-frame-after-commit` coverage pass
through unchanged; a consumer must not hide them or infer complete capture.
There are no aggregate tracker totals or safety scores.

## Unknown and failure states

- `not-observed`: no retained in-scope observations. No findings or successful
  zero-tracker result is manufactured.
- `unavailable`: capture missing/failed/stopped, stale document, missing
  identity/helper, unsupported page or private/unknown context. Malformed
  capture also produces unavailable.
- `invalid`: malformed analysis record or page hostname.
- `observed`: capture evidence exists. Individual classifications may still
  be unavailable if the dataset failed, or unknown when boundaries/list coverage
  are insufficient.

Failure reasons from capture are not copied verbatim; bounded internal reasons
avoid exposing arbitrary diagnostic payloads. Sensitive or unrelated record
fields are never copied to output. No URL paths, queries, credentials, fragments,
bodies, cookies, initiators or header values are added.

## Verification and next integration step

[Fixtures](../tests/fixtures/request-analysis.json) cover same-site/multi-part
domains, private tenants, IDNs, canonical IPs, local names, unknown suffixes,
misleading suffixes and a listed first-party host.
[Tests](../tests/request-analysis.test.mjs) additionally cover duplicate
cumulative rows, determinism, missing owner/category, failed/missing data,
private/unknown contexts, stale identity, malformed/bounded input and mutation.
Integration tests use the actual D07 store, D21 parser, D22 adapter/data and D23
collector with simulated browser events. They do not constitute native Firefox
acceptance.

```text
node --test tests/request-analysis.test.mjs
node --test tests/*.test.mjs
node --check lib/request-analysis.js
node tools/lint.mjs
node tools/check-docs.mjs
```

### Pending Firefox continuation

Use a disposable profile with lookup off and follow the
[D23 procedure](REQUEST_CAPTURE.md#pending-firefox-procedure) through local
helper attachment and a same-origin fetch from page B. Leave that collector
(`d23`) running. In the extension background console, load two further local
scripts and the bundled JSON:

```js
for (const file of ['lib/tracker-classifier.js', 'lib/request-analysis.js']) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL(file);
    script.onload = resolve;
    script.onerror = () => reject(new Error('Local module failed to load'));
    document.head.appendChild(script);
  });
}
const response = await fetch(browser.runtime.getURL('data/trackers/domains.json'));
if (!response.ok) throw new Error('Bundled dataset unavailable');
globalThis.d24 = PrivacyMonitorRequestAnalysis.create({
  collector: d23,
  dataset: await response.json()
});
```

Read the actual fixture tab record from `PrivacyMonitorAnalysisStore.get(tabId)`,
check its result, then pass its record to `d24.analyze(record)`. For a captured
same-origin local fetch, expect a first-party 127.0.0.1 finding with
`tracker.kind: unknown`, reason unsupported-host and null owner/category.
Repeated reads should not increase counts. Trigger another fetch to increase
the event count; reload to replace the document and invalidate old-record reads.
Repeat in a second tab/container and check private/stopped/missing-ID states.

To exercise a distinct local hostname, a page-B console request to
`http://localhost:4180/page-a?d24=synthetic` with `mode: no-cors` can produce
an observed attempt: if captured, expect an unclassified-third-party localhost
finding relative to 127.0.0.1. A response or DNS failure does not imply the
request was never attempted; inspect capture before making any claim.
No external tracker needs to be contacted for this local procedure.

**All these Firefox steps are pending.** Known-list matches are verified in
automated fixtures only, not native browsing. The D23 document-ID compatibility
gap on the declared minimum Firefox version remains open. Record actual
versions/results in [VERIFICATION](development/VERIFICATION.md); do not label
synthetic events as live browsing evidence. Stop d23, reload the temporary
extension to clear manual setup and close the disposable profile afterward.

Before shipping, resolve the beta record/settings prerequisites, decide the
compatibility policy, integrate local loading and lifecycle/access cleanup, add
package/license materials, and complete native checks. D25 UI work is outside
this request.
