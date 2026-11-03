# Offline tracker-list classification

D22 adds a small, reproducible data snapshot and
[adapter](../lib/tracker-classifier.js). **Neither is loaded by the manifest or
included in the current extension ZIP.** This is a tested foundation, not a
user-visible tracker monitor. D21 production integration and beta record/policy
acceptance are still open; see [PROGRESS](development/PROGRESS.md).

## Dataset choice and scope

The snapshot uses only EasyPrivacy's general tracking-server file, pinned to an
immutable upstream revision. The GPL option fits this repository's licensing.
Its 542 supported hostname rules are small enough for a local index; original
source and source-line evidence make matches reviewable. See
[attribution, license, provenance and update procedure](../data/trackers/NOTICE.md).

This is not comprehensive tracking detection. Excluded IP, wildcard and
conditional rules remain unsupported; no broadening removes their conditions.
Other EasyPrivacy files and exceptions are absent. Membership does not establish
whether a particular request tracked someone, would be blocked, or loaded
successfully. An unlisted domain can still track. The dataset does not supply
validated owners or per-domain categories, so both remain null.

## Local API

Load `vendor/tldts/index.umd.min.js`, then `lib/site-domains.js`, then
`lib/tracker-classifier.js` in one trusted context. Parse the bundled
`data/trackers/domains.json` as JSON and pass it to
`PrivacyMonitorTrackers.create(dataset)`. The caller supplies local data; the
adapter performs no file, network, browser, storage, logging or timer operations.

The returned object has `classifyHostname(hostname)` and `classifyURL(url)`.
Both use [D21 normalization](SITE_DOMAINS.md): lowercase ASCII/punycode,
canonical hosts and a single terminal dot removed. URL input must be absolute
HTTP(S) without credentials. Paths, queries and fragments never appear in output.

| Result kind | Meaning |
| --- | --- |
| listed | Host matches a supported source rule exactly or on a complete subdomain label |
| unknown / not-listed | Valid registrable domain has no matching rule in this subset; no safety verdict |
| unknown / unsupported-host | IP, local name, bare suffix or unknown suffix boundary is outside this dataset's coverage |
| invalid | Malformed hostname, unsupported URL or credentials; no classification |
| unavailable | Missing/failing domain helper or invalid/missing dataset; never treated as a clean result |

A listed result contains canonical hostname, null owner/category and evidence:
dataset ID, immutable revision, retrieval date, original-source SHA-256, exact
rule, original 1-based line number and exact/subdomain match type. Source links
can be constructed from the pinned provenance in trusted application code.
Returned evidence is copied, so caller mutations cannot alter future results.

The adapter validates the full dataset at construction, including schema,
metadata, duplicate rules, valid source line numbers and canonical domain
boundaries. A corrupt dataset makes the whole classifier unavailable. The index
has a 5,000-entry cap (current snapshot 542); it retains only the fixed rules and
metadata, never a history of classified hosts. Label traversal chooses the most
specific matching rule and stops at the PSL registrable boundary, including
private tenants. Bare suffix rules such as github.io are rejected.

This is domain membership only. It accepts no top-level page context and makes
no first/third-party or ownership inference. D24's observed-request classification
must combine evidence with an actual navigation-scoped observation. D23 capture,
D24 classification integration and D25 presentation are not implemented here.
Existing popup script counts and scores remain unchanged.

## Verification and integration boundary

The [fixtures](../tests/fixtures/tracker-classifier.json) and
[tests](../tests/tracker-classifier.test.mjs) exercise known/unknown domains,
whole-label and most-specific matches, private tenants, IDNs, unsupported hosts,
URL secret omission, malformed data, dependency failure and caller mutation.
Every included domain is checked against its exact upstream source line.
Synthetic extraction cases ensure conditional rules, wildcards, exceptions and
paths are never converted into unconditional domain rules.

Run from the repository root:

```text
node tools/build-tracker-data.mjs --check
node --test tests/tracker-classifier.test.mjs
node --test tests/*.test.mjs
node tools/lint.mjs
node tools/check-docs.mjs
```

Native Firefox loading, minimum/current version normalization and eventual
packaged JSON access are **pending**. Production integration must add script
order, trusted local JSON loading with error handling, package paths and license
materials together, then exercise known, unknown and unavailable states in
Firefox. Do not expose a zero-tracker count while request capture is absent.
Resolve stable record/context and settings prerequisites before connecting
this classifier to browsing activity.
