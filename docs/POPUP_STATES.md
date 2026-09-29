# Popup observation states (D03)

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

## Boundaries

D03 necessarily changes the old HTTP-error-to-empty-array behavior to `null`, and
adds a minimal display-shape guard. D04 is still unfinished: distinct HTTP,
network, malformed-response, and timeout outcomes need a proper result contract
and a bounded request timeout. A hanging request still leaves the breach spinner
running while local observations remain usable. Consent remains D05 work.

A popup-local generation counter ignores responses from superseded loads. It
does not solve stale stored records, navigation identity, or same-host tab
isolation (D07–D10). The existing injected refresh scanner and its 600 ms delay
remain; D09 must replace that duplicated path and address warning removal.

## Verification and next browser check

Run `node --test tests/*.test.mjs` and the package command in [DEVELOPING.md](DEVELOPING.md).
The D03 tests cover state mapping, invalid/partial data, unsupported URLs,
tab/storage errors, refresh failure, stale async completions, and breach display
guards. Tests use synthetic observations and no external requests.

For visual fixtures, run `node tests/popup-preview.mjs`, then open
`http://127.0.0.1:4179/`. The gallery uses the real popup HTML/scripts, mock browser
APIs, and a mocked breach response. Only the loopback interface is bound. Stop
with Ctrl+C; restart after editing files to refresh the served snapshot. Preview
files are excluded from the extension package.

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
