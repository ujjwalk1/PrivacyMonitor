# Privacy and data handling

Privacy Monitor performs local observations of permitted HTTP/HTTPS pages. Breach lookup is optional and off until Firefox's browsing-activity consent is granted. The current source contains no analytics, telemetry, remote executable code or developer-operated collection endpoint. This statement describes the implementation, not an independent audit or completed Firefox acceptance.

## What is processed locally

Password feedback reads the current input synchronously and derives a heuristic label and suggestions. Privacy Monitor does not persist, log or transmit the password. Feedback is inserted into the page's DOM; it is not isolated from the website, which can already read its own inputs.

The content script reads page-visible cookies to count them, counts script elements and other-hostname script sources, and resolves form destinations from markup. Cookie values and complete form destinations are processed transiently but are not included in saved summaries. The extension does not inspect request bodies or monitor actual form submission payloads. Header listeners inspect received headers and retain presence states, not policy values. Full page URLs are used transiently for navigation matching; the retained SHA-256 matching digest is an identity aid, not an anonymity guarantee.

## What is retained

| Data | Storage and retention | Important limits |
| --- | --- | --- |
| Display preferences | Firefox extension local storage under `privacy_monitor_display_settings_v1`; no automatic expiry | Two display flags and schema version. Restoring defaults replaces these preferences only. |
| Normal-context content summaries | Local storage under `security_data_<hostname>` and `forms_<hostname>`; overwritten by later scans, with no expiry or global row cap | Protocol/HTTPS flags, cookie/script counts, form counts, timestamps and a random 128-bit document marker. The marker is generated locally for each content-script instance, retained with its summaries and never sent to the breach service. Hostname keys reveal scanned hosts and do not separate tabs, HTTP/HTTPS, ports or containers. The popup rejects summaries unless their marker matches the current document; shared rows can still be overwritten. |
| Header/navigation records | Background memory, capped at 256 tab records; navigation/tab lifecycle invalidates evidence, and background restart clears it | Hostname, protocol, tab/navigation/context identifiers, timestamps and header presence. Private-context records may exist in memory; they are not written to local storage. |
| Breach results | Shared background-memory cache keyed by exact hostname, capped at 32 hosts and 32,768 JSON characters per cached result | Successful empty/results responses are reusable for ten minutes after completion. Expired entries are pruned on a later permitted lookup; there is no deletion timer. Entries can remain in memory while idle until pruning, eviction, consent clearing or background restart. Larger valid results can be displayed without caching. |
| Pending requests and rate-limit state | Background memory; at most four distinct-host requests, with an eight-second request/body deadline | Same-host requests share work. Closing the popup does not cancel them or erase the cache. The service cooldown survives consent toggling within that background session. |
| Data from older versions | Existing extension local storage, until separately cleared | May contain full page URLs, raw headers or earlier private observations. Updating, refreshing and restoring display defaults do not remove these rows. Targeted cleanup is not implemented. |

Cached breach records retain only name, breach date, account count and data-class fields, plus cache timing metadata. Counts and cached results are not synchronized through `storage.sync`. The normal-context cache is shared across tabs and containers; it is not a separate cache for each container. Its freshness limit and size cap do not limit the size of a response downloaded and parsed before caching.

## Optional external lookup

The only application-defined service request is an HTTPS request to `https://haveibeenpwned.com/api/v3/breaches?domain=<encoded-hostname>`. Enabling consent can immediately trigger a lookup; subsequent popup opens or Refresh Analysis can reuse a fresh result or make a request when retry timing permits. A known normal tab, an observed connection result from a summary matching the current document, and current Firefox consent are required. Other local sections need not be complete for the lookup to run.

The request includes the exact hostname, encoded as a query parameter, and configures the User-Agent `PrivacyMonitorExtension/1.1`. The service also receives connection metadata such as the IP address used to reach it. The extension includes no password, email address, cookie value, page path/query/fragment, form contents or score. Requests specify omitted credentials, no referrer and no browser cache. These settings do not anonymize the connection or control service-side logging; see [Have I Been Pwned's privacy policy](https://haveibeenpwned.com/Privacy).

There is no parent-domain normalization or exclusion for localhost, IP addresses, internal names or particular sites. Keep lookup off before opening the popup on a host you do not want disclosed. Private and unknown contexts are rejected before cache access or network work. This prevents new extension lookups in those contexts; it does not erase older stored observations or govern the website's own traffic.

There is no scheduled retry. HTTP 429 applies shared backoff; opening or refreshing after the delay can retry. An error, timeout or malformed response is not a clean result. An empty successful response means the lookup returned no records for that hostname, not that the site or an individual account has never been breached.

## Controls and clearing behavior

- **Disable breach lookup** revokes the Firefox-held consent, clears the breach cache and cancels pending work. It cannot retract a request already received by the service. If revocation fails, the popup reports it and blocks its own further lookups; use Firefox's add-on permission controls or disable the extension before reopening. Do not assume the browser permission changed after an error.
- **On-page settings** change password feedback and form banners only. Turning them off does not stop content/header analysis, delete saved summaries or revoke breach consent. No site-exclusion setting is implemented.
- **Refresh Analysis** reruns the content scan. It neither clears historical rows nor bypasses the breach cache/cooldown, and it cannot recapture response headers without a page navigation.
- Reloading the extension or restarting its background clears transient records/cache, not persistent preferences or stored content summaries. There is no in-product clear-history control. Do not assume disabling, updating or closing the popup erases local storage.

Private or unknown-context content scans skip new persistent writes, and their popups skip legacy content reads. Local warnings can still operate where Firefox permits the extension. Native private-access, consent and restart behavior remain pending verification.

## Permissions and access

| Declaration | Current purpose |
| --- | --- |
| HTTP/HTTPS host access and matching content scripts | Automatic page observations, tab URL access and main-frame response-header monitoring, even with the popup closed. Firefox restricts some pages. |
| `webRequest` | Observe main-frame response headers and lifecycle; no request blocking. |
| `webNavigation` | Reset/correlate observations with navigation. |
| `storage` | Display preferences and legacy content summaries. |
| Optional `browsingActivity` data collection; required collection `none` | Firefox-held consent for sending a hostname to the external breach service. This is separate from host access and does not mean the extension stores nothing locally. |

The manifest does not request `cookies`, `scripting` or `activeTab`. Firefox desktop 142+ is the declared minimum, with the existing add-on identity preserved. Broad website access remains necessary for the current continuous-monitoring design. See the [manifest review](MANIFEST.md) for compatibility evidence and outstanding checks.

## Data attribution and evidence

Breach information comes from [Have I Been Pwned](https://haveibeenpwned.com). Its [API license terms](https://haveibeenpwned.com/API/v3#License) identify the breach API data as [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The popup displays selected fields from up to three records sorted by breach date and omits other returned fields. The extension source remains [GPL-3.0](../LICENSE).

The implementation behind this statement is in [content-script.js](../content-script.js), [background.js](../background.js), [analysis-records.js](../analysis-records.js), [breach-service.js](../breach-service.js), [popup.js](../popup.js), [settings.js](../settings.js) and [options.js](../options.js). See [verification](development/VERIFICATION.md) for performed checks and their limits. Questions or corrections can be reported through [Privacy Monitor issues](https://github.com/ujjwalk1/PrivacyMonitor/issues); use synthetic examples and omit secrets or private browsing records.
