# Monitoring access policy

D26 adds [monitoring-access.js](../lib/monitoring-access.js), a permission and
lifecycle controller for the [request collector](REQUEST_CAPTURE.md).
**This is an isolated, unshipped foundation. D26 is partial.** The current
extension still uses required broad website access, static content scripts and
continuous header listeners. No on-demand product mode is advertised or enabled.

## Why production integration is deferred

The live manifest requests HTTP/HTTPS access at installation and has no
`activeTab` or optional host permissions. Its content and header paths do not
share a lifecycle owner. D09 record migration, D10 cleanup and D13 exclusions
remain unfinished, as do D21-D25 production integration and native acceptance.
Changing only a preference or removing host strings would not safely stop and
clear all existing analysis.

The controller therefore refuses the current manifest with
`access: integration-required`. A compatible **test/integration manifest**
must use MV2, require activeTab/webRequest/webNavigation, declare HTTP/HTTPS
patterns in optional_permissions, have no required host patterns and no static
content-script entries. This guard catches known incompatible configurations;
it is not an audit of arbitrary background code.

The main README, manifest, runtime package and consent controls are unchanged.
No cookie API or D27 work is included.

## Permission model

The intended on-demand path uses a user action and temporary tab access to
inspect current accessible page content. That scan/injection path, its private
context policy, and the product controls are **not implemented in this slice**.
Here, on-demand means this controller has no active request collector.

On-demand scans cannot reconstruct earlier requests or response headers.
The module exposes that explanation in every status snapshot. It returns
unavailable when collection is inactive, never an apparently clean zero result.
It does not seed a new collector from old observations or reload websites.

Continuous capture requires explicit access to HTTP and HTTPS sites. It starts
only after an explicit grant and a successful permission confirmation. Each
activation attaches a fresh D23 collector; its post-commit/top-frame and document
identity limitations still apply. Already granted access alone does not start
monitoring after a new controller instance is created.

Mozilla requires optional permissions to be declared in the manifest and
requested from a user action. The caller must invoke `enableFromGesture()`
directly inside a trusted extension click handler; it calls the browser request
API before any await. A method name is not proof of a gesture: Firefox must
validate the actual UI call path. [permissions.request](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request)

Temporary activeTab access is scoped to a user interaction; it is not a grant
to every third-party host. This design uses explicit optional website access
for continuous capture. [Manifest permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions)

Request visibility depends on API and host access, including page and resource
hosts. Granting access cannot recover events that already happened.
[webRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest)

These API sources were checked on 2026-11-08. No native grant/revoke result
was obtained in this session.

## API and behavior

Load the local tldts bundle, site-domains.js, request-capture.js, then this module
in one trusted extension owner. Create with
`PrivacyMonitorMonitoringAccess.create({ api: browser })`.

| Method | Behavior |
| --- | --- |
| status() | Copies mode, access state and coverage explanation; no browsing data |
| enableFromGesture() | Synchronously requests exactly HTTP/HTTPS origins, verifies access, then attaches capture |
| useOnDemand() | Immediately detaches/clears capture, invalidates pending activation, then removes optional origins |
| get(tabId, documentId) | D23-compatible read facade, unavailable when inactive |
| dispose() | Stops capture and removes the permission listener; terminal for this instance |

States distinguish not-requested, requesting, granted, denied, revoked,
revoking, released, retained, unavailable and integration-required. Mode is
continuous only while a collector is attached. Failed removal leaves capture
off and reports retained/unavailable; it does not claim Firefox access vanished.

Any origin removal or removal of webRequest/webNavigation stops capture
immediately. Revocation is conservative even for an unrelated origin. Separate
breach-service data-collection consent is unaffected. There is no automatic
restart after a later permission-added event; another explicit enable is needed.

Generation checks invalidate delayed grants and permission checks. Switching
to on-demand waits for an outstanding prompt to settle before removing origins,
so a late successful grant is also removed. Repeated enable actions during
a pending operation do not create duplicate prompts or queue future activation.

Disposal stops monitoring but **does not revoke browser grants**, including
grants from an outstanding prompt. The owner should await useOnDemand() before
normal teardown when removal is intended. A closed/restarted owner starts
inactive and never silently restores capture from grants. A browser permission
prompt cannot be cancelled by this module; it remains pending until answered.

There is no settings persistence, message listener, network call, logging,
header reader or DOM scan. The get facade can be passed as a collector to D24,
but live D25 integration is not performed. Production integration must also
clear already displayed details on mode changes, not just deny future reads.

## Tests and pending acceptance

[Tests](../tests/monitoring-access.test.mjs) use the actual D23 collector and
D21 domain parser with simulated browser permissions/events. They cover exact
request scope and synchronous invocation, denied/error/malformed grants,
confirmation failures, revocation, cancelled late grants, failed removal,
duplicate actions, fresh capture after re-enable, disposal and attachment failure.
They also verify that the current shipping manifest is rejected. Test outcomes
are not native permission-dialog acceptance.

```text
node --test tests/monitoring-access.test.mjs
node --test tests/*.test.mjs
node --check lib/monitoring-access.js
node tools/lint.mjs
node tools/check-docs.mjs
```

### Next exact action

Create a disposable MV2 acceptance harness, outside the shipping package, with
the compatible permissions above and no legacy background/content scripts.
Load the four local modules in one persistent owner; expose real extension
buttons for enable and on-demand, calling enableFromGesture synchronously from
the enable handler. Keep the owner alive while testing; do not create a second
collector from D23's older manual procedure.

Using a disposable Firefox profile and the existing
`node tests/acceptance-server.mjs` local pages, verify:

1. Fresh launch has no request collector or automatic permission prompt.
2. Denying Enable keeps capture unavailable. Granting it attaches fresh capture,
   but produces no history for the already loaded page.
3. Navigate the local test page after enabling and trigger a local fetch.
   Verify only accessible post-commit activity with actual document IDs.
4. Revoke website access in Firefox. Capture clears; further events and reads
   cannot restore it. Re-granting access alone must not restart monitoring.
5. Switch to on-demand while the prompt is pending, then grant it. Confirm
   optional access is removed and capture stays off.
6. Check missing/failed removal, page navigation, private/container context,
   owner shutdown/restart and minimum/current Firefox compatibility.
7. Separately implement and verify the on-demand DOM scan and absent-header/
   request-history wording. Keep inaccessible data unavailable.

Record versions and actual observations in [VERIFICATION](development/VERIFICATION.md).
D23's documented document-ID compatibility gap remains unresolved. Before
production activation, migrate all content/header observation paths to the same
access policy, wire controls and current-tab identity safely, clear UI/records
on mode changes, and review update behavior and packaging. No D27 is started.
