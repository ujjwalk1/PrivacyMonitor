# Popup observation and breach states (D03–D04)

[Repository overview](../README.md) · [Development guide](DEVELOPING.md)

Source, command, and local checkpoint paths below are relative to the repository root.

`popup-state.js` maps the existing stored records into display states without
accessing tabs, storage, or the network. `popup.js` owns loading and rendering.

| Overall state | Trigger | Display |
| --- | --- | --- |
| Loading | Initial open or refresh/read in progress | Empty neutral score, loading text/spinner, disabled refresh, previous sections hidden/cleared |
| Incomplete | Read succeeded, but some required local observations are missing, malformed, or contradictory | Available observations remain visible; unknown values are neutral; no numeric score |
| Unavailable | No readable tab URL, tab/storage failure, or rejected refresh injection | Explicit failure message, neutral score, old results hidden, retry available |
| Unsupported | A readable URL uses a scheme other than HTTP/HTTPS | Explanation, neutral score, disabled refresh; no storage read, injection, or breach request |
| Ready | All local sections have usable observations and the D02 score is available | Numeric score plus “Local observations loaded”; a separate breach result does not control local readiness |

HTTP/HTTPS support is a URL classification, not a guarantee that Firefox permits
access. Restricted HTTPS pages with no scan stay incomplete; if refresh injection
is denied they become unavailable. Browser-internal, local-file, extension, data,
and FTP URLs are unsupported. Missing tab URL/access is unavailable, not evidence
of an unsupported URL scheme. Only the hostname is displayed.

## Evidence and wording

- No record or field means **Not observed**; invalid values mean **Unavailable**.
  Neither is displayed as zero, absent, or successful.
- Headers explicitly recorded in `missing` display **Absent**. Headers in neither
  set display **Not observed**; contradictory or invalid entries are unavailable.
  “Present” describes header presence only, not the effectiveness of its value.
- Forms require both nonnegative integer counts, with password forms no greater
  than total insecure forms. An empty object is not a clean scan. Valid zero
  counts say **No HTTP forms observed in this scan**, not “all forms are secure.”
- Connection wording is **HTTPS observed** or **HTTP observed**, not a site-safety
  verdict. Counts remain neutral regardless of size; third-party activity alone
  does not establish tracking.
- The unchanged D02 calculator can produce a number from its required inputs;
  the popup withholds it while any displayed local observation is incomplete,
  including cookie/script counts. This is a presentation gate, not new weights.
- Breach UI is reset on each load and result. Successful empty arrays say **No
  breach records returned for this domain**. No page scan means the lookup is
  **not run**. Failed/malformed responses display **unavailable**, not a clean result.

## Breach lookup outcomes (D04)

`fetchBreaches()` in `popup.js` returns a tagged result. The renderer exposes its
`kind` on `#breach-section` and clears the previous spinner, messages, and records
before displaying it. Failures never show the successful-empty message.

| Result kind | Trigger | Display |
| --- | --- | --- |
| `empty` | Successful HTTP response with a valid empty array | No breach records returned for this domain |
| `results` | Successful HTTP response with a valid nonempty array | Up to three most recent historical records and the remaining count |
| `http-error` | Non-success HTTP status, including 404 or 429 | Service error with the HTTP status; no conclusion |
| `network-error` | Fetch rejection or interrupted response-body read | Could not reach/read the service; no conclusion |
| `malformed` | Invalid JSON or invalid fields in any returned record | Unreadable or unexpected response; no conclusion |
| `timeout` | Request or body read is still pending after eight seconds | Lookup timed out; no conclusion |

Only `results` carries `breaches`; `http-error` carries `status`. A single
eight-second timer covers fetch and body reading. Timeout resolves the result
and aborts the request; the race also settles if an implementation ignores abort.
Every settled lookup clears its timer. Late completion/rejection cannot replace
the timeout, and D03's generation check still ignores superseded loads.

The display guard in `popup-state.js` requires nonempty names and real calendar
dates in `YYYY-MM-DD` format. Optional account counts must be nonnegative safe
integers, and optional data classes must be arrays of strings. Missing/null
optional fields remain unknown; any malformed entry rejects the entire list.
Names and classes are escaped before HTML insertion. The local score and page
readiness do not depend on any breach outcome.

This replaces D03's temporary array-or-null fetch contract; no compatibility
path remains. No automatic retry, cache, backoff, or consent control was added.
The existing analyzed-page hostname lookup remains automatic. Consent is D05;
caching and rate-limit backoff are D06.

## Boundaries

A popup-local generation counter ignores responses from superseded loads. It
does not solve stale stored records, navigation identity, or same-host tab
isolation (D07–D10). The existing injected refresh scanner and its 600 ms delay
remain; D09 must replace that duplicated path and address warning removal.

## Verification and next browser check

Run `node --test tests/*.test.mjs` and the package command in [DEVELOPING.md](DEVELOPING.md).
The D03 tests cover state mapping, invalid/partial data, unsupported URLs,
tab/storage errors, refresh failure, stale async completions, and breach display
guards. [D04 tests](../tests/breach-results.test.mjs) cover every outcome above,
timer cleanup, abort, stalled body reads, late responses, recovery after timeout,
and score independence. Tests use synthetic observations and no external requests.

For visual fixtures, run `node tests/popup-preview.mjs`, then open
`http://127.0.0.1:4179/`. The gallery uses the real popup HTML/scripts, mock browser
APIs, and a mocked breach response. Only the loopback interface is bound. Stop
with Ctrl+C; restart after editing files to refresh the served snapshot. Preview
files are excluded from the extension package.

D04 preview cases are `ready` (successful empty lookup), `breach-results`,
`breach-http-error`, `breach-network-error`, `breach-malformed`, and
`breach-timeout`. Open the gallery or `/popup.html?case=CASE`; the timeout case
uses the real eight-second timer with a synthetic request. On 2026-10-08 all six
outcomes were reviewed in the in-app browser. The timeout changed from spinner to
its message, all cases retained score 100 and enabled Refresh, and captured
console warnings/errors were empty. Timeout and longer network-error text were
visually checked for wrapping. This is mocked preview verification, not an
installed-Firefox or live-service result.

On 2026-09-29 the in-app browser preview was manually inspected for wording and
layout: loading, incomplete, partial, unavailable, unsupported, ready, warnings,
and breach-unavailable text was reviewed. Screenshots covered loading/incomplete,
partial/unavailable, ready, and unsupported. Keyboard activation of Refresh in
the ready fixture showed unavailable and removed the old score. A saved local
example is `checkpoints/d03-unavailable-preview.png`.

This was not an installed Firefox test. The preview runner also logged one
MutationObserver error without a source location (the popup files do not use that
API); do not treat its console as a clean Firefox result. Next, temporarily load
the current `manifest.json` in a disposable Firefox profile using [DEVELOPING.md](DEVELOPING.md).
Check an ordinary page, `about:config`, a page without scan records, and a denied
refresh. Confirm no stale success, readable scrolling, and no popup-console
errors. Record exact results in [PROGRESS.md](../PROGRESS.md); D01/D02 Firefox checks remain open.
For D04, also open the six synthetic preview cases in Firefox and verify the
eight-second timeout, message wrapping, and unchanged local score. Then check the
installed popup's response/abort behavior and console on a disposable test page;
keep simulated and live-service results separate.
