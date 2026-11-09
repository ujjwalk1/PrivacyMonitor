# Cookie inspector

D28 adds a read-only inspector over the [D27 collector](COOKIE_METADATA.md).
**It is not enabled in the shipping manifest or ZIP. D28 remains partial pending
production integration and native Firefox acceptance.** The existing popup,
README and permissions are unchanged.

## Components and interaction

- [cookies.html](../details/cookies.html) provides an extension popup with
  separate Allow cookie access and Read cookie metadata buttons, live status
  and visible scope notes.
- [cookies-view.js](../details/cookies-view.js) validates and renders the
  collector's metadata as text.
- [cookies-page.js](../details/cookies-page.js) obtains the trusted background
  D07 store, creates a local D27 reader, and owns UI lifecycle cleanup.
- [cookies.css](../details/cookies.css) uses a 440px content width and reuses
  the existing request-details palette and focus styles.

The permission button invokes D27's request method synchronously from its
click handler. Startup and permission grant do not read cookies. A separate
read action checks cookies and website access through D27. There are no cookie
editing or deletion controls.

Use the real inspector as an **extension popup**. Opening it as a regular
extension tab makes that page the active tab; it cannot inspect the previously
active website. There is no arbitrary-tab fallback. The synthetic local preview
below is designed to run in a normal browser tab.

## Display and scope

Each numbered card shows domain, host-only/domain scope, session or persistent
status, known expiry in UTC, Secure, HttpOnly, SameSite and partition.
Persistent cookies without expiry show unknown; missing SameSite shows Unknown.
SameSite no_restriction is labeled None, while unspecified is labeled as the
browser default. Purpose is always **Unknown**. Attributes do not establish
safety or tracking behavior.

Cookie names and values are absent. Identical metadata rows remain separate:
the inspector does not invent identifiers or merge distinct cookies.
The page hostname, exact store ID and snapshot wording accompany the result.

Coverage stays explicit: current URL and store, unpartitioned storage plus the
selected top-level-site partition. Other frame domains and legacy first-party
isolation cookies are excluded. An empty successful result states that other
cookies may exist outside this scope. Denied, unavailable, integration-required,
loading and changed-context states never become a successful zero count.

The renderer accepts at most 256 records. Unexpected fields, malformed values,
session/expiry inconsistencies, invalid partition origins and oversized results
invalidate the whole result. DOM nodes use textContent, not HTML or domain links.
Expiry timestamps use UTC rather than an implicit local timezone.

## Lifecycle and privacy

A read replaces previous metadata. Cookie/origin revocation, top-level
navigation, tab activation/closure/replacement and window focus changes clear
the view and invalidate pending work. Generation checks prevent delayed results
from restoring cleared data. Invalidation is conservative, including changes
in unrelated tabs.

Hiding the inspector clears its data. Showing it again does not automatically
read. Page exit disposes the reader and listeners. Hidden, busy or disposed
controls do not begin operations. There is no persistence, history, external
service, cookie-value access or mutation API.

D26 mode-change integration remains pending. A production owner must dispose
or close this UI when its policy changes; merely invalidating a collector
cannot remove a snapshot already displayed by its consumer. Native permission,
document/store and partition behavior remains unverified.

## Synthetic preview

Run from the checkout:

```text
node tests/cookie-inspector-preview.mjs
```

Open `http://127.0.0.1:4182/?case=mixed&theme=light`.
The banner explicitly says **Preview - synthetic metadata; not browser cookies**.
The server listens only on loopback. Its metadata comes through actual
D27/D07/D21 code with simulated cookies; its UI permission/browser APIs are mocks.
It never reads real browser cookies or grants Firefox access.

Cases are mixed, empty, unavailable, denied and long. Themes are light and dark.
Read cookie metadata displays the selected case; denied applies to the Allow
button. Stop the server with Ctrl+C. Preview assets are not packaged.

## Verification and pending Firefox procedure

```text
node --test tests/cookie-inspector.test.mjs
node --test tests/*.test.mjs
node --check details/cookies-view.js
node --check details/cookies-page.js
node tools/lint.mjs
node tools/check-docs.mjs
```

Tests use the real collector-to-renderer pipeline with mocked browser APIs,
including throwing cookie-secret getters. They cover fields/unknowns, bounded
validation, injection rejection, duplicate rows, separate grant/read actions,
no automatic read, cleared displays, delayed results, hidden/busy behavior,
listener rollback and delayed bootstrap teardown.

**Next exact action:** make a disposable copy of the checkout for a temporary
Firefox test. In that copy only, add cookies to optional_permissions and set
browser_action.default_popup to `details/cookies.html`. Keep the existing
background D07 store and website permissions for this isolated test; this does
not implement D26's production permission migration. Include checkout helper
paths because the shipping ZIP excludes them. Keep breach lookup off.

Start `node tests/acceptance-server.mjs` and use the
[D27 synthetic-cookie procedure](COOKIE_METADATA.md#verification-and-next-exact-action)
in a disposable Firefox profile. Navigate a normal local page so the current
D07 record has document/store identity before opening the inspector.

Verify no read at startup or grant, denial/unavailable wording, then compare an
explicit read of synthetic cookies against Firefox's storage inspector. Check
session/UTC expiry, Secure/HttpOnly/SameSite, partition/store, unknown purpose
and a valid empty scope. Do not use account cookies.

Test containers, private context, live revocation, navigation/tab changes,
popup closing/reopening and permission-prompt dismissal. A native prompt may
close the popup: reopening must neither reuse data nor automatically read.
Check keyboard focus, light/dark theme, zoom/overflow and screen-reader status.
Record actual Firefox versions/results in
[VERIFICATION](development/VERIFICATION.md).

All native steps remain pending. Production entry points, shared access policy,
optional permission migration, packaging and earlier acceptance gaps remain
open. No D29 work is included.
