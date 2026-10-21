# Form destination resolution (D11)

D11's implementation and automated fixtures are present. Native Firefox checks
below remain pending; the day is not marked complete. D09's remaining record
migration and D10's old-record cleanup are still separate prerequisites for full
tab isolation and retention acceptance.

## Resolution rules

The shared content scan inspects the default form route and every enabled,
associated submit button, including `input` submit/image controls and controls
outside the form connected by `form="id"`. Native form ownership also determines
which password fields belong to each form. Disabled submitters, including those
disabled by a fieldset, are skipped. The default route remains a possibility even
when every button overrides it, because a submission can have no submitter.

- A present `formaction` overrides the form's `action`, including an empty value.
  Without that attribute, the submitter inherits the form action.
- Missing or exactly empty actions resolve to the current document URL, ignoring
  `<base>`. Nonempty actions use the URL parser and `document.baseURI`, including
  relative, scheme-relative, query, fragment, and whitespace-only values.
- Classification uses the resolved destination's scheme, not the page's scheme.
  An HTTP page with an explicit HTTPS destination has no HTTP destination finding
  for that route. This does not make the HTTP page trustworthy.
- Effective `method="dialog"`/`formmethod="dialog"` has no network destination.
  A submitter's method override is evaluated independently of its action override.
- Any HTTP route counts its form once. Associated password fields cause a single
  local warning. Wording says **can submit over HTTP**: no submission is observed.
- Invalid URLs and non-HTTP(S) destinations are unsupported. Any unsupported route
  makes the aggregate form observation unavailable and prevents a complete score.
  Known HTTP password warnings still appear on the page. The temporary legacy
  adapter stores `false` for this unavailable aggregate, which the existing popup
  state mapper/scorer already handle. Per-route partial results are not retained.

Only counts, page HTTPS status, and a timestamp are stored for a resolvable scan.
Resolved URLs, credentials, paths, queries, fragments, and field values are not
stored or logged. Private/unknown-context scans retain D10's no-write guard.

Rules checked 2026-10-21 against the [HTML form submission algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm).
The separate control query includes image submitters because
[`HTMLFormElement.elements`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements)
excludes them.

## Limits

This is a snapshot of declarative destinations, not a submission interceptor.
JavaScript can cancel submission, alter attributes, call `fetch`/XHR, or send data
elsewhere. Programmatic submission using disabled controls is not modeled.
Redirects, browser blocking/upgrading, CSP, validation, and server behavior may
change whether or where a request actually happens. An HTTPS destination is not
proof of a trustworthy recipient. Password association is conservative: it does
not claim the field is a successful submitted control or that credentials leaked.

Only the accessible document is scanned; shadow trees and unscanned frames are
outside this observation. D12 now observes relevant attributes, base changes, and
node additions/removals through bounded shared scans; see
[DYNAMIC_MONITORING.md](DYNAMIC_MONITORING.md) for timing and limits. Legacy same-host storage can still
mix normal-tab content observations until the remaining D09 migration is done.

## Checks and native Firefox acceptance (pending)

Automated fixtures in `tests/form-destinations.test.mjs` exercise resolution,
submitter ownership/overrides, image controls, disabled controls, dialog methods,
count deduplication, unavailable handling, and URL omission. Content-refresh tests
also verify that unsupported destinations reach the popup as unavailable with no
score. These use modeled DOM objects, not a Firefox DOM.

Next exact action: use a disposable Firefox profile with breach lookup off, reload
the root `manifest.json` temporary add-on, run `node tests/popup-preview.mjs`, and
open `http://127.0.0.1:4179/form-destinations.html`. Reload the page after extension
installation. The fixture cancels submissions and uses no real credentials.
Inspect banners and popup counts; do not submit real data.

| HTTP fixture URL | Expected HTTP forms / password forms | Expected banners |
| --- | --- | --- |
| No query, or `?base=http` | 5 / 5 | relative, empty, missing, override, external |
| `?base=https` | 4 / 4 | empty, missing, override, external |

The HTTPS-action, disabled-override, and dialog forms should have no warning.
Then inspect these cases using page developer tools and explicit popup Refresh:

1. Set the override button's `formaction` to HTTPS: its warning disappears. Set it
   to the empty string: on this HTTP fixture its warning returns despite HTTPS base.
2. Change the external button to an `input type="image"` with the same form/action
   attributes: its form still warns. Repeated refreshes retain only one banner.
3. Set one destination to `mailto:fixture@example.invalid` or `http://[invalid`:
   the popup shows form observations unavailable and no complete score; other
   known HTTP password forms keep their page warnings.
4. Inspect an equivalent controlled HTTPS page with an HTTP base: relative actions
   warn while missing/empty actions use HTTPS. Automated fixtures cover this case;
   the local preview server does not provide TLS.
5. Check content/popup/background consoles and confirm no destination components
   or values enter persistent records. Repeat in a private test window: local
   warnings remain, while no scan rows are written and the popup stays incomplete.

Stop the local server with Ctrl+C. Record Firefox version and exact outcomes in
PROGRESS.md before marking D11 complete. Carry earlier native checks forward.
