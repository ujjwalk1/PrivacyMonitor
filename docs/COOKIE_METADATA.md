# Cookie metadata collection

D27 adds [cookie-metadata.js](../lib/cookie-metadata.js), a read-only, on-demand
collector using Firefox's cookie API. **This is an isolated implementation,
outside the live manifest and ZIP. D27 remains partial.** No cookie inspector
UI, cookie modification, scoring or D28 work is included. The live popup still
uses its existing page-visible cookie count.

## Prerequisites and permission boundary

The current manifest does not declare cookies access. The collector refuses to
initialize unless `cookies` appears in optional_permissions and not in required
permissions. It also needs the D21 site helper, a trusted current D07 store, and
permission/tab/window/navigation lifecycle events.

`requestFromGesture()` requests **only cookies permission** synchronously.
It must be called directly from a trusted extension button handler. It neither
requests broad website access nor starts a scan. Website access remains a
separate prerequisite; readActive() checks both cookies and the exact page host
before querying cookies. A denied or failed grant returns unavailable.
Browser enforcement of the actual gesture path remains to be tested.

The uncommitted D26 controller and its pending integration are preserved. D26
and D27 must eventually share a product access/lifecycle policy, but this slice
does not change the manifest or existing monitoring/consent behavior.

Firefox requires cookies permission and relevant host access for getAll().
Store and partition filters control which cookies can be returned.
[Mozilla cookies.getAll reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies/getAll)

## Exact query scope

readActive() selects exactly one active tab in the current window. It rejects
private/unknown contexts, unsupported or credential-bearing URLs, missing store
identity, unknown site boundaries and missing/mismatching D07 records. The
record must include navigation and document identity and match the browser's
normal-context tab, hostname, scheme and cookieStoreId. There is no fallback
to the extension's default cookie store.

Two sequential queries use the tab's store and current HTTP(S) URL:

- Unpartitioned storage: partitionKey is omitted.
- The selected top-level-site partition: partitionKey.topLevelSite is explicitly
  set to the scheme plus D21 siteKey, including private suffix boundaries.

The top-level site is derived from the top-frame tab URL and bundled PSL.
Its native equivalence to Firefox's partition key must be verified; unknown
boundaries fail closed instead of guessing. No query uses an empty partitionKey
or an omitted storeId. Third-party frame domains are not enumerated.

Both queries explicitly set firstPartyDomain to the empty string. **Legacy
first-party-isolation cookies are excluded**, not merged with normal cookies.
The result's coverage is
`current-url-unpartitioned-and-top-level-site-non-fpi`.
It is a snapshot of these selected buckets, not all cookies belonging to a
website or proof that a cookie was sent, read, needed or used for tracking.
Even an empty successful result must retain this scope explanation.

Firefox describes schemeful storage partition keys separately from legacy
first-party isolation. The empty firstPartyDomain selects the non-FPI bucket;
the code never uses null to search across first-party isolation contexts.
[Mozilla cookie isolation guidance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies)

The URL path is used transiently for browser cookie matching. Query and fragment
are removed before the cookie API call. URL paths, ports and full URLs are not
copied into results. Cookies for other paths, schemes, hosts, partitions, stores
or legacy FPI contexts may therefore be absent.

## Reduced metadata and limits

Every returned row contains only:

- Canonical domain and hostOnly.
- Session flag and expirationDate in epoch seconds, or null when absent.
- Secure and HttpOnly flags.
- SameSite status, or null for missing/unrecognized values.
- Explicit unpartitioned or top-level-site partition metadata.
- Purpose null: no classification is inferred.

[Mozilla Cookie type reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies/Cookie)

Cookie names, values and paths are never read or copied by the projector.
Raw browser responses necessarily contain values; they are projected immediately
on promise resolution before the next await, and are not stored in module state,
logged, persisted or exposed to consumers. JavaScript cannot promise physical
memory zeroization of browser-created objects. Hostnames and store/partition
metadata are still browsing data and require protected UI access.

The collector validates returned store, domain relationship, firstPartyDomain
and partition instead of trusting filters alone. A mismatched or malformed row
invalidates the whole result. Unknown SameSite and missing expiry remain null.
Rows with identical reduced metadata remain separate because different cookies
can have identical attributes; names are not retained to deduplicate them.

At most **256 rows total** are returned, across both queries. Exceeding a bound
returns unavailable, not a successful truncated or zero-cookie result.
Only one read can be pending per instance; a second returns busy.
The browser API has no pagination here, so this bounds retained/output metadata,
not the size of an initial browser allocation. A hung API call keeps that read
slot busy until it settles; no cancellation or timeout is claimed.

## Lifecycle contract

The API is
`PrivacyMonitorCookieMetadata.create({ api: browser, store: PrivacyMonitorAnalysisStore })`:

| Method | Result or responsibility |
| --- | --- |
| requestFromGesture() | Explicit optional-cookie request and confirmation; never scans |
| readActive() | Promise of observed scoped metadata, including a valid empty array, or unavailable without cookies |
| invalidate() | Cancels pending result publication when the host's access policy changes |
| dispose() | Invalidates pending work and removes listeners; terminal for this instance |

Navigation, active-tab changes, window focus changes, tab closure/replacement
and removal of cookie or origin permissions invalidate pending reads.
Invalidation is conservative: unrelated top-level navigation can cancel a read.
Permission and active-tab/current-record checks run again after cookie queries.
A stale response cannot restore an older tab's metadata. Permission removal is
unavailable, never zero cookies.

There is no result cache. Previously returned objects belong to the caller:
production UI must clear them on revocation, navigation, mode change or closure.
The collector cannot erase copies already held by a consumer. Calling dispose()
does not remove a Firefox permission grant; permission ownership remains part
of the pending product integration.

## Verification and next exact action

[Tests](../tests/cookie-metadata.test.mjs) load the actual D07 store and D21 parser
with simulated browser cookies, permissions and lifecycle events. Throwing getters
for cookie name/value/path ensure those properties are never inspected. These
tests do not prove native cookie-query or permission behavior.

```text
node --test tests/cookie-metadata.test.mjs
node --test tests/*.test.mjs
node --check lib/cookie-metadata.js
node tools/lint.mjs
node tools/check-docs.mjs
```

**Next:** prepare a disposable temporary-extension copy for the existing local
acceptance server, with optional cookies permission, the D21/D27 helper loading,
a current D07 store and a real extension button that calls requestFromGesture()
directly. Do not alter the shipping manifest or request permission from a
background-console command and count that as a gesture test.

In a disposable Firefox profile, using synthetic local cookies only:

1. Start `node tests/acceptance-server.mjs`. Load the test copy temporarily.
   Keep breach lookup off. Confirm no cookie query on startup or permission grant.
2. Deny the cookie prompt and verify unavailable. Grant through the button,
   then explicitly read the selected normal local tab with matching host access.
3. Compare matching synthetic session/persistent, Secure/HttpOnly/SameSite
   metadata against Firefox's storage inspector. Verify names/values do not
   appear in outputs, logs or storage.
4. Visit the same local page in default and container stores with different
   synthetic cookies; each read must stay in the selected tab's store.
5. Use a controlled partitioned-cookie fixture and verify exact topLevelSite
   matching plus separate unpartitioned results. Verify the non-FPI limitation;
   unsupported or uncertain isolation must not be described as full coverage.
6. Revoke cookies and website access during a pending read; navigate, switch
   tabs/windows, close a tab and test private context. No stale metadata may
   be delivered. A valid empty subset must differ from revoked/unavailable.
7. Record actual Firefox version and minimum/current compatibility in
   [VERIFICATION](development/VERIFICATION.md). Remove the disposable profile
   and test copy through normal cleanup when finished.

All native steps remain pending. Production permission controls, shared access
policy, protected UI transport, packaging and full isolation acceptance are
outstanding. No D28 inspector is implemented.
