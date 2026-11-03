# Shared site and domain matching

D21 introduces an isolated, offline foundation in
[lib/site-domains.js](../lib/site-domains.js). **It is not loaded by the manifest
or included in the current extension ZIP.** Earlier beta prerequisites remain
open. The existing popup script counts, score, storage keys and breach lookup
are unchanged; no site exclusions or tracker classification are implemented here.

## Dependency and load order

The module uses the maintained [tldts project](https://github.com/remusao/tldts),
pinned to **7.4.19**, with its bundled Public Suffix List. Both ICANN and PRIVATE
rules are used, including wildcard and exception rules. Private rules are
essential to distinguish tenants such as alice.github.io and bob.github.io.

Load these local scripts in order in a shared JavaScript context:

1. `vendor/tldts/index.umd.min.js`
2. `lib/site-domains.js`

The second script exposes the frozen `PrivacyMonitorSites` API. These files can
be exercised now by the Node VM tests; no npm install or runtime fetch is required.
The browser bundle is copied unchanged from the pinned upstream package. Its
complete source map with embedded sources and MIT license are preserved.
See [dependency provenance and update procedure](../vendor/tldts/NOTICE.md).

A library was chosen instead of a hand-maintained suffix table: taking the last
two labels cannot handle co.uk or tenant boundaries, and ad-hoc rules miss PSL
exceptions. Upstream recommends explicitly enabling private domains; the wrapper
does so. The shipped list is a **snapshot**, not an automatically current DNS or
ownership database. Refresh it deliberately when updating the dependency.

## Contract

| Function | Input | Output |
| --- | --- | --- |
| `fromHostname(value)` | A hostname; IPv6 must use brackets; no port, path, credentials or surrounding whitespace | Descriptor with kind domain, ip, local, unknown, invalid or unavailable |
| `fromURL(value)` | Absolute HTTP/HTTPS URL without credentials | The same descriptor; no path/query/fragment is returned |
| `compareHosts(left, right)` | Two hostnames | relation and sameSite |
| `compareURLs(left, right)` | Two HTTP/HTTPS URLs | relation and sameSite |

Valid descriptors contain canonical ASCII hostname, registrable domain (or null),
public suffix (or null), private-rule flag and comparison key. Invalid or
unavailable results contain only a kind. There is no logging, cache, browser API,
network access or persistent storage. Callers must still apply their own
privacy/context policy before persisting or transmitting any returned hostname.

Comparison outcomes:

- **same-host / true:** canonical hostnames match exactly, even when a registrable
  boundary is unknown. This asserts hostname equality only.
- **same-site / true:** distinct hosts share a known PSL registrable domain.
- **cross-site / false:** known comparison keys differ.
- **unknown / null:** invalid input or a missing registrable boundary prevents
  comparison of distinct hosts.
- **unavailable / null:** the required parser is missing or fails.

This comparison is deliberately **schemeless** and ignores ports. HTTP and HTTPS
on the same host therefore match; that does not make them the same origin or
the same schemeful cookie site. Do not use this helper as an authentication,
CORS, cookie-security or permission boundary. Matching domains do not establish
company ownership, trustworthy content or absence of tracking. Different domains
may belong to the same company.

## Normalization and edge cases

- URL parsing canonicalizes case, IDNs to ASCII/punycode and IP spelling; one
  terminal DNS dot is removed. Invalid DNS labels, excessive lengths, credentials,
  embedded path/port syntax and unsupported URL schemes are rejected.
- Localhost, its subdomains and .local names use **exact-host** matching. An
  unknown single-label intranet name also uses an exact key after consulting the
  PSL; a known suffix such as com is not treated as a local intranet name.
- IP addresses use exact canonical address identity. No grouping by subnet, DNS
  resolution or IPv4/IPv6 alias inference occurs.
- Bare public suffixes and multi-label names with unknown TLDs have no site key.
  Two different hosts under an unknown suffix remain unknown instead of being
  grouped using a guessed last-two-label rule.
- Hostname input is capped at 2,048 characters, canonical hostnames at 253, and
  URL input at 8,192. Results retain no sensitive URL components.
- Unicode/punycode equality does not perform visual-confusable detection.

## Verification and pending integration

`node --test tests/site-domains.test.mjs` runs against the actual vendored
library, not a hand-written mock PSL. The
[fixtures](../tests/fixtures/site-domains.json) cover multi-part suffixes,
subdomains, private tenants, wildcard/exception rules, localhost/local names,
IPv4/IPv6, IDNs and unknown boundaries. Additional checks cover malformed inputs,
URL-secret omission, offline execution, dependency failure and vendor/source-map
integrity. The full test command also discovers these cases.

Native Firefox validation and production integration are **pending**. The
minimum/current Firefox behavior of URL normalization and bundled-script loading
has not been observed. No current script count or HIBP domain has been changed.

Next D21 continuation: first resolve/validate the stable beta record and policy
prerequisites described in [PROGRESS](development/PROGRESS.md). Then choose the
specific production consumer, wire local script order and the package allowlist,
include third-party notices/source-review materials, and test its real Firefox
flow. Keep unknown separate from zero-safe/first-party. Do not silently change
existing count semantics or external hostname disclosure. The [D22 dataset and adapter](TRACKER_CLASSIFICATION.md) are now available as a
separate offline foundation, also outside the shipping package.
