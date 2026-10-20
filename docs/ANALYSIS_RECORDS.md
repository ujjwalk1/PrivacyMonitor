# Per-tab analysis record and messages (D07)

[Repository overview](../README.md) · [Development guide](DEVELOPING.md)

D07 introduces the in-memory record model and a read-only runtime message listener.
It does **not** migrate the live producers or popup. On an ordinary installation,
the new store is empty until a trusted background producer calls `begin()`.
Headers move in D08; content scans, refresh, and the popup reader move in D09.
Do not describe the existing popup as tab-isolated yet.

## Ownership and record shape

`analysis-records.js` exports `PrivacyMonitorAnalysis.createStore()` and
`createMessageHandler()`. `analysis-background.js` creates the background-owned
`PrivacyMonitorAnalysisStore` and registers one listener. The manifest loads both
before the existing background scripts, with no new permissions or dependencies.

One record is keyed by numeric **tab ID**, never hostname. A snapshot contains:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Record schema version, currently `1` |
| `tabId` | Nonnegative browser tab ID; not a hostname or caller-selected content-script identity |
| `navigationId` | Background session UUID plus increasing generation; generated on every explicit `begin()` |
| `documentId` | Optional browser-supplied document identity, or `null` when unavailable |
| `context.cookieStoreId` | Browser container/cookie-store identity, or `null` when unavailable |
| `context.incognito` | Browser private-context flag: `true`, `false`, or `null` for unknown |
| `page` | Only canonical `hostname` and HTTP/HTTPS `protocol`; no full URL, credentials, path, query, fragment, or title |
| `createdAt`, `updatedAt` | Background-generated millisecond timestamps |
| `observations` | Separate `connection`, `headers`, `forms`, and `privacy` sections |

Each observation starts as `{kind: 'not-observed', data: null, observedAt: null}`.
A validated observation becomes `{kind: 'observed', data, observedAt}`; failure is
`{kind: 'unavailable', data: null, observedAt}`. Known zero counts remain observed,
not missing. The record does not infer an overall successful score or readiness.

Allowed observed data is deliberately small and rejects unexpected fields:

| Section | Data |
| --- | --- |
| `connection` | `protocol`, `httpsOnly`; consistent with each other and the record's protocol |
| `headers` | Exactly CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; each is `present`, `absent`, `not-observed`, or `unavailable` |
| `forms` | Nonnegative integer `insecureForms`, `insecurePasswordForms`; password count cannot exceed total |
| `privacy` | Nonnegative integer `cookies`, `scripts`, `thirdPartyScripts`; third-party count cannot exceed total |

No raw header values, passwords, cookie values, request bodies, or arbitrary scan
payloads belong here. Header-value evaluation in later days will need an explicit
schema extension. Input data and returned snapshots are copied to prevent mutation
of a different tab's record or the store through a returned object.

## Internal producer API and navigation identity

These methods are for **trusted background code**, not runtime write messages:

```js
const started = PrivacyMonitorAnalysisStore.begin(browserTab, { documentId: null });
const { tabId, navigationId } = started.record;
PrivacyMonitorAnalysisStore.update({ tabId, navigationId }, 'forms', {
  kind: 'observed', data: { insecureForms: 0, insecurePasswordForms: 0 }
});
PrivacyMonitorAnalysisStore.get(tabId, navigationId);
PrivacyMonitorAnalysisStore.remove(tabId);
```

Check `ok` before using a result. `begin()` returns `{ok: true, record}` and replaces
all evidence for that tab with unknown sections; even a same-URL reload needs a
new identity. `update()` requires the exact current `{tabId, navigationId}` and
returns the updated snapshot. Missing records, stale identities, and malformed
inputs return an error without changing evidence. An unsupported/invalid `begin()`
also leaves the store unchanged; D08 must invalidate the old record at the correct
navigation boundary before attempting to initialize another supported page.

`documentId` is optional metadata, not a substitute for `navigationId`. The new
generation survives neither background restart nor extension reload; a new session
UUID prevents old work matching records created after restart. `clear()` and
`remove()` do not reset the generation counter. Delayed producers must carry the
identity captured when work began, not look up the latest token when it finishes.

**D08 boundary:** navigation events, redirects/request correlation, browser document
binding, and automatic tab-close cleanup are not wired yet. Do not infer navigation
from equality of hostname or URL, or accept a content-script-provided tab/context.
The later adapter must use browser-supplied tab/frame/document metadata. D09 must
validate top-frame scan messages against that identity before enabling writes.

Storage is transient and capped at **256 records**, evicting the oldest begun
record when full. Reads/updates do not refresh eviction order. Missing/evicted
records return not-observed, not successful evidence. Fixed section fields, bounded
hostname/identity lengths, and integer counts bound each entry. There is no disk
storage, enumeration message, network access, or history. Private/container fields
are recorded explicitly but do not complete D10's private-session enforcement or
cleanup of legacy persistent scan records.

## Runtime message contract v1

Only the exact extension `popup.html` sender, verified by browser-supplied extension
ID and URL with no sender tab, may request a snapshot:

```js
await browser.runtime.sendMessage({
  channel: 'privacy-monitor.analysis',
  version: 1,
  type: 'get',
  tabId: 123,
  // Optional: navigationId captured from an earlier record.
});
```

Replies always carry `channel` and `version`. A successful read is
`{ok: true, kind: 'record', record}`. No initialized record is
`{ok: true, kind: 'not-observed', record: null}`. Failures use
`{ok: false, error}` with `forbidden`, `unsupported-version`, `invalid-request`, or
`stale-navigation`. Internal updates may also return `missing-record`; beginning
a non-HTTP(S) page returns `unsupported-page`.

Content scripts, frames, foreign extensions, and unrecognized extension pages are
rejected. Payloads cannot assert sender identity or change context. No `begin`,
`update`, or `refresh` operation is exposed over messages in D07. Unrelated
channels return `undefined` synchronously so other listeners can respond; only
owned messages return a Promise. Schema/version changes must be coordinated with
the future popup reader; transport errors must not be interpreted as empty success.

Mozilla references checked 2026-10-13: [MessageSender](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender)
documents sender identity, frame/tab metadata, and optional document identity;
[onMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)
documents Promise replies and listener behavior; [tabs.Tab](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab)
documents tab IDs and container/private metadata. Unknown optional fields remain
`null`; this session does not select or verify a minimum Firefox version.

## Compatibility and verification

`background.js` still writes `headers_<hostname>`, content scans still write their
legacy records, and `popup.js` still reads them. D07 neither imports that possibly
shared/stale evidence into a tab record nor deletes it. This parallel foundation is
temporary: D08 migrates header writes, D09 migrates scans/readers, and D10 removes
obsolete persistent records. D06 breach caching and its consent gate are unchanged.

`tests/analysis-records.test.mjs` covers two same-host tabs through the real handler,
context metadata, unknown/zero/error states, stale generation rejection, payload
validation/redaction, snapshot isolation, bounded capacity, removal/restart,
sender authorization, and manifest wiring alongside legacy behavior.

Native Firefox checks remain pending. In a disposable profile:

1. Load root `manifest.json`; inspect background startup and confirm one analysis
   message listener can respond without storage writes or breach requests.
2. Open two non-sensitive pages with the same hostname. In the background debugger,
   pass each browser-provided `tabs.get(id)` result to `begin()` and seed distinct
   synthetic form counts with `update()` as above. Read each through the popup
   debugger using `runtime.sendMessage`; confirm separate counts and tab IDs.
   These are fixture results, not an actual migrated page scan.
3. Begin another generation for one tab; submit an update carrying its old token
   and confirm `stale-navigation`. Inspect container/private fields with separate
   disposable contexts and confirm unavailable metadata remains null.
4. Verify a content-script read is forbidden, legacy popup behavior still works,
   and extension reload empties the new store. Automatic navigation/close behavior
   belongs to D08 and must not be reported as verified here.
5. Record Firefox version, message results, console errors, and exact pass/fail in
   [PROGRESS.md](../PROGRESS.md), carrying outstanding D01–D06 checks forward.
