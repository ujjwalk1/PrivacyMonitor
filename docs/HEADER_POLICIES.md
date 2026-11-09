# Header policy value analysis

Status: **D29 partial, isolated and unshipped.** The evaluator has no browser,
network or storage dependency. It is not loaded by the manifest or included in
the package. The current popup and score still use the older presence-only
header record; this work does **not** fix that live limitation yet.

## Interface and evidence boundary

Load [lib/header-policies.js](../lib/header-policies.js) and call
`PrivacyMonitorHeaderPolicies.evaluate(input)` with a trusted final main-frame
response:

~~~js
const result = PrivacyMonitorHeaderPolicies.evaluate({
  kind: 'observed',
  type: 'main_frame',
  statusCode: 200,
  url: 'https://fixture.example/',
  responseHeaders: [
    { name: 'Strict-Transport-Security', value: 'max-age=60' },
    { name: 'X-Content-Type-Options', value: 'nosniff' },
    { name: 'Referrer-Policy', value: 'no-referrer' },
  ],
});
~~~

An observed result contains `data.hsts`, `data.nosniff` and
`data.referrerPolicy`. Each finding has a `state`, a fixed `reason` code, and
only the applicable normalized fields described below. No raw header text,
hostname, full URL, unknown directive value or exception text is returned.
The input URL is used transiently for HSTS applicability. Unrelated header
values, including Set-Cookie and CSP, are never accessed.

`{kind: 'not-observed'}` returns not-observed with null data.
Unavailable/malformed input returns unavailable with null data and a fixed
reason. An observed empty header list produces absent findings (except HSTS
over HTTP/IP, where it is not applicable). An absent header is not evidence
of absent browser protection.

| Finding state | Meaning |
| --- | --- |
| `configured` | Recognized configuration within the supported subset; not proof of browser enforcement or website safety. |
| `disabled` | HSTS lifetime explicitly zero. |
| `invalid` | No usable recognized value under the supported parsing rules. |
| `permissive` | Recognized referrer policy allows a URL across origins or referrer information on downgrade. |
| `absent` | This header was not in the supplied complete response list. |
| `not-applicable` | HSTS is being assessed on HTTP or an IP address. |
| `unavailable` | A field could not be interpreted reliably within the input bounds. |

There is no numeric score, color, boolean "safe" flag, policy-history cache,
permission request or mutation. Consumers must handle every state explicitly;
presence alone is never a positive evaluator result.

## Supported rules and limitations

### HSTS

The first field is parsed. Names are case-insensitive; max-age must be decimal
digits after optional quoted-string unescaping. Duplicate directives, malformed
syntax and a valued includeSubDomains are invalid. Well-formed unknown
directives are ignored. Zero disables the advertised policy; a positive safe
integer yields `maxAgeSeconds` and `includeSubDomains`. HTTP/IP contexts are
not applicable. See [RFC 6797, sections 6 and 8](https://www.rfc-editor.org/rfc/rfc6797).

A positive result describes configuration only. It does not establish valid
TLS, preload membership, browser-cached or inherited HSTS, or a minimum
recommended lifetime. Very large integers produce unavailable rather than a
rounded lifetime. HTTPS with certificate exceptions and browser-specific
behavior require native testing. Missing/disabled headers do not prove that
the browser will permit HTTP.

### X-Content-Type-Options

The first comma-separated token across ordered fields must equal `nosniff`,
case-insensitively. Quoted tokens and parameters are not accepted.
A later `nosniff` cannot rescue an invalid first token. This reports the
response's configuration, not actual resource blocking. Fetch's blocking
decision also depends on request destination and MIME type, particularly for
scripts/styles. The document header does not establish every subresource's
configuration. See [Fetch, section 3.6](https://fetch.spec.whatwg.org/#x-content-type-options-header).

### Referrer-Policy

The last recognized, case-sensitive policy token across ordered comma-separated
fields wins; unknown tokens are ignored. Quoted text is not a recognized
policy. All eight policy values are represented. See
[Referrer Policy, sections 3 and 8.1](https://w3c.github.io/webappsec-referrer-policy/).

The evaluator exposes `policy`, `sameOrigin`, `crossOrigin` (without downgrade)
and `downgrade` (HTTPS to HTTP) as `none`, `origin` or `url`. Here `url` means
referrer URL information with credentials/fragment stripped, not a raw page
URL. Four policies are labeled permissive: origin, origin-when-cross-origin,
no-referrer-when-downgrade and unsafe-url. This is a local privacy-analysis
classification, not a standards validity error. It highlights cross-origin
URL disclosure or disclosure on downgrade. Other policies are configured,
not blanket safety guarantees.

Missing/invalid headers do not establish the final request policy: browser
defaults, preferences, HTML metadata, per-element policies, inheritance and
redirects can affect it. Actual outgoing Referer headers are not observed here.

Sources above were checked on 2026-11-09. The fixtures express this bounded
implementation's expectations; they are not a Firefox conformance certification.

## Bounds and failure behavior

- At most 256 header entries, 256 characters per name, 4,096 per selected
  value, 16,384 total accepted selected-value characters, and 8,192 URL characters.
- Only ASCII values plus horizontal tabs are interpreted. Non-ASCII, control
  characters, binary-only/missing selected values and per-value overflow make
  that header unavailable; other findings can remain observed.
- Unreadable properties, malformed names, an oversized list, total-value
  overflow or invalid context make the whole observation unavailable.
- A later unreadable/unsupported duplicate conservatively makes that header
  unavailable, even for first-field rules. No truncated tail becomes success.
- Only main-frame HTTP(S) responses with integer status 200–599, excluding
  300–399, are eligible. In particular, 304 headers cannot establish absence.
  Redirect responses can affect browser policies, but their accumulated effects
  are outside this final-response evaluator.
- Quoted delimiters are preserved during splitting. Unsupported syntax never
  becomes a green verdict by merely containing a policy word.
- Outputs are fresh objects. There is no retained input or result history.

## Verification and remaining integration

Run:

~~~powershell
node --test tests/header-policies.test.mjs
node --test tests/*.test.mjs
node --check lib/header-policies.js
node tools/lint.mjs
node tools/check-docs.mjs
~~~

[Fixtures](../tests/fixtures/header-policies.json) cover positive/negative values,
duplicates, ordering, quoting, zero/short/oversized lifetimes, IP/HTTP applicability
and all referrer policies. [Focused tests](../tests/header-policies.test.mjs)
also cover missing versus unavailable, response eligibility, bounds, mutation,
throwing getters, no external side effects and exclusion of sensitive data.

**Next exact action:** extend the strict header record contract in
[analysis-records.js](../analysis-records.js) and its validation tests to carry
these bounded findings, then wire evaluation into the current-response path in
[background.js](../background.js), before raw values are discarded. Preserve
D08 navigation/request correlation and clear-on-error behavior. Coordinate the
message version, [popup-state.js](../popup-state.js), [popup.js](../popup.js)
and [scoring.js](../scoring.js) so they consume findings without falling back to
presence-only success. Define score handling for unavailable/not-applicable
findings and update score documentation/tests. Only then add the evaluator to
manifest load order and the package allowlist.

Native Firefox acceptance remains pending:

1. In a disposable profile with external lookups disabled, load the integrated
   test copy and record Firefox version, extension revision and console errors.
2. Serve controlled main-frame response headers. For HSTS use a test hostname
   over trusted HTTPS; an HTTP localhost test only verifies ignored applicability.
   Do not disable TLS validation and then claim HSTS enforcement.
3. Compare positive, zero, malformed, repeated and missing HSTS values; valid,
   wrong-first and missing nosniff values; restrictive, permissive, fallback and
   missing referrer values against the network inspector. The popup/score must
   not reward ineffective or unavailable values as if valid.
4. Verify reload/cache/304, redirects, navigation, same-host tabs, container and
   private-context isolation, error clearing and delayed events using D08's
   lifecycle checks. Compare native duplicate-field ordering with the fixtures.
5. Inspect request-level referrer behavior separately if making any enforcement
   claim; verify resource-level MIME blocking separately from document findings.
6. Record pass/fail and limits in [PROGRESS](development/PROGRESS.md). Package
   only after references, tests and acceptance are verified.

This session adds no CSP/framing evaluation (D30), no release and no publication.
