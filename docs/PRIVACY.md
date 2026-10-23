# Privacy and permissions

This describes the current implementation, including the manifest permission and compatibility review. It is not an independent security audit or a claim of completed release acceptance.

## Local processing

Password feedback reads the current field synchronously and derives heuristic suggestions. Values are not stored, logged or included in breach requests. This does not prevent the website itself from reading its own inputs.

The content script counts cookies exposed to page JavaScript, script elements, other-hostname script sources and HTTP form destinations. Only summary fields and timestamps are written by new normal-context scans. Full form destinations are resolved transiently, not saved. Header records retain presence states, not policy values; matching uses a transient URL digest.

## Remaining storage limitations

Normal-context content summaries persist under hostname keys without an implemented retention limit. They can be stale or overwritten by another tab on the same hostname. Headers have migrated to transient per-tab records; content has not.

Older versions wrote full page URLs and raw header values. Those existing rows are not removed by the current implementation. Earlier private observations may also remain. D10 cleanup depends on completing D09's migration; do not claim that updating erases history.

New scans skip persistent writes when the context is private or unknown. Such popups skip shared legacy content reads and all breach service/cache access, leaving some observations incomplete. Local warnings still operate. Private extension access itself depends on Firefox's settings; native acceptance is pending.

## Optional external lookup

Breach lookup defaults off and requires Firefox's optional browsing-activity consent. Enabling it permits a normal tab's hostname to be sent to Have I Been Pwned when the popup has local page observations and needs a result. The service also sees the connection IP address. No password, email address, cookie value, page path/query, form contents or score is included.

Requests use omitted credentials, no referrer and no browser cache. Successful displayed data is cached in memory for ten minutes, at most 32 hosts and 32,768 JSON characters per entry. No more than four requests are pending. Restarting/reloading the background clears memory. Disabling consent clears cached results and cancels pending work; it cannot retract a request already received by the service. The service cooldown survives consent toggling within that background session.

An eight-second deadline bounds requests and body reads. HTTP 429 results impose shared backoff. Reopening/refreshing after the delay can retry; there is no automatic scheduled retry. A valid empty response means no records were returned for this lookup, not proof of no historical breach.

Without the consent API, lookup stays off. Native Firefox consent/revocation and external-service success still require verification. See [BREACH_CONSENT.md](BREACH_CONSENT.md) and [BREACH_CACHE.md](BREACH_CACHE.md).

## Declared permissions

| Permission or declaration | Actual role / limitation |
| --- | --- |
| HTTP/HTTPS host access and matching content scripts | Enables automatic page observations, tab URL access and main-frame response-header monitoring on permitted HTTP/HTTPS pages, even with the popup closed; Firefox can restrict particular pages. |
| `webRequest` | Observes main-frame response-header presence. Does not block requests. |
| `webNavigation` | Resets and correlates results with navigation. |
| `storage` | Display settings and legacy content summaries. |
| Optional `browsingActivity` data collection | Firefox-owned consent used for the external hostname lookup; required collection is declared `none`. |

The manifest omits unused `cookies`, `scripting` and redundant `activeTab` permissions, restricts content-script matches to HTTP/HTTPS, and declares Firefox desktop 142+ for built-in consent. The existing add-on ID is retained. The website-access prompt remains broad because monitoring is continuous. Settings are display controls, not site exclusions or host-access controls. See the [manifest audit](MANIFEST.md) for evidence and pending native checks.
