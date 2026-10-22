# Architecture

Privacy Monitor is a dependency-free Firefox Manifest V2 extension. Runtime files stay at the root; no transpilation, remote code or application server is needed. The development preview server is a separate Node tool and is not packaged.

## Components

| Component | Responsibility |
| --- | --- |
| `manifest.json` | Declares permissions, persistent background scripts, content scripts, popup, options page and local icons. |
| `analysis-records.js` / `analysis-background.js` | Strict record schema, bounded per-tab store and read-only popup message listener. |
| `background.js` | Correlates main-frame request/response/completion with committed navigation and publishes header presence. |
| `settings.js` / `content-script.js` | Reads display preferences, observes the accessible top-level document, renders local feedback, scans connection/counts/forms. |
| `popup.html` / `popup.js` | Renders observations, obtains current tab context, requests refresh, manages consent and opens settings. |
| `popup-state.js` / `scoring.js` | Pure validation/display-state mapping and local score calculation. |
| `breach-service.js` | Shared privileged background service for optional hostname lookups, caching, cancellation and cooldown. |
| `options.html` / `options.js` | Saves the owned versioned display-settings key and reports success/failure. |

## Current data flow

~~~mermaid
flowchart TD
  Page[Accessible page DOM] --> Content[Content script]
  Content -->|normal context only| Legacy[Local storage: hostname summaries]
  Events[Firefox navigation and request events] --> Headers[Background header correlation]
  Headers --> Records[Transient per-tab records]
  Records -->|validated runtime get message| Popup[Popup]
  Legacy -->|normal tab only| Popup
  Popup -->|top-frame refresh message and acknowledgement| Content
  Popup --> State[State mapper and pure scorer]
  Popup -->|getBackgroundPage; consent and context checks| Breach[Breach service]
  Breach -->|optional hostname request| HIBP[Have I Been Pwned]
  Options[Options page] --> Preferences[Versioned local preferences]
  Preferences -->|storage change event| Content
~~~

This diagram deliberately shows two observation paths. Only headers use the new record store in production. The schema has connection, forms and privacy sections, but those producers/readers remain on the legacy storage adapter. Do not describe all observations as isolated by tab.

## Page scanning and refresh

Startup, dynamic rescans and popup refresh call `analyzePage()`. It awaits settings, performs synchronous DOM observations while its own mutation observer is disconnected, reconnects observation, then awaits a combined storage write in a known normal context. A serialized queue preserves within-document write order. This does not isolate separate normal tabs on the same hostname.

The popup sends `{channel: 'privacy-monitor.scan', version: 1, type: 'refresh'}` through `tabs.sendMessage` to frame 0. The content listener accepts only the extension's popup sender and exact message shape, then acknowledges completed analysis. Failure clears the displayed score. Refresh does not navigate the page or refetch response headers.

Dynamic monitoring observes child changes and relevant form/base attributes. A 500 ms timer, an in-flight flag and a dirty flag coalesce scans; mutation batches above 64 entries schedule one scan without walking every entry. A scan still traverses the document: this is bounded scheduling, not constant-cost scanning. Password events are delegated, with one active-field reference and one feedback timer.

## Header identity and lifecycle

Firefox supplies tab, request and navigation events. The background starts a new generation on committed HTTP/HTTPS navigation; headers publish only after matching completion and resource identity. Redirects, failed navigation, closed/replaced tabs and new navigation invalidate old evidence. A 304 response is unavailable rather than evidence that omitted headers are absent.

The store holds at most 256 tab records, with a session/generation navigation ID, hostname, protocol, context fields and observation timestamps. Returned records are copies. Strict payload validation rejects extra or invalid fields and stale identities. Full resource matching uses a transient SHA-256 digest with the fragment removed; raw URLs and raw header values are not retained in records. A digest is an identity aid, not an anonymity claim.

The popup requests `privacy-monitor.analysis` version 1, type `get`, with the active tab ID. Only the extension popup can use this read-only listener. `legacyHeaders()` adapts record presence states for the existing scorer. See [the record contract](ANALYSIS_RECORDS.md) and [header lifecycle](HEADER_LIFECYCLE.md).

## Storage and external service

| Data | Location / retention | Current boundary |
| --- | --- | --- |
| Display preferences | `storage.local`, `privacy_monitor_display_settings_v1` | Schema version 1; password feedback and form banners default on. Invalid/unreadable settings suppress hints. |
| Content summaries | `security_data_<hostname>` / `forms_<hostname>` in local storage | New summaries contain counts/flags/timestamps, not full URLs. No implemented TTL or global row cap; same-host tab sharing remains. |
| Header records | Background memory | Maximum 256 tabs; navigation/tab lifecycle resets evidence; background restart clears it. |
| Breach success results | Background memory | Ten-minute TTL from settlement; 32 hosts, 32,768 JSON characters per cached result; larger successful results are returned but not cached. |
| Pending breach operations | Background memory | Maximum four; same-host operations share work. Eight-second total request/body deadline. |
| Legacy rows from earlier versions | Local storage | May include full URLs, raw header values or earlier private observations. Targeted cleanup remains pending. |

Breach lookup requires a known normal context and Firefox's optional `browsingActivity` consent on every lookup, before accessing cache/pending work. The popup obtains the service via `runtime.getBackgroundPage()`; it is not exposed to arbitrary content-script messages.

The only application-defined external service is `https://haveibeenpwned.com/api/v3/breaches?domain=<encoded-hostname>`. Requests omit credentials/referrers and browser caching. Results retain only displayed fields. HTTP failures, malformed data, network failure, timeout, empty success and positive results remain distinct. HTTP 429 honors retry timing or exponential fallback; no retry is scheduled automatically. Revoking consent clears results and cancels work but preserves cooldown to prevent bypass.

## Score and boundaries

HTTPS contributes 40 points; header presence contributes up to 40, using weights 10/10/10/5/5/2 normalized by 42; zero detected HTTP password forms contributes 20. The pure scorer returns null for incomplete/invalid scoring inputs. The popup separately validates complete local observations before displaying a numeric score. Breach history and cookie/script counts do not affect it.

Header policy effectiveness, JavaScript submission outcomes, cross-frame/shadow-DOM coverage, tracker classification and a complete cookie inventory are not implemented. See [privacy](PRIVACY.md), [roadmap](ROADMAP.md) and [verification](development/VERIFICATION.md).
