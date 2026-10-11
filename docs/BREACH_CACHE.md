# Transient breach caching and retry timing (D06)

[Repository overview](../README.md) · [Consent](BREACH_CONSENT.md)

The consented popup obtains `PrivacyMonitorBreachService` from the existing MV2
persistent background page. `breach-service.js` owns requests, the eight-second
request/body deadline, cache, and cooldown. The manifest loads `popup-state.js`
first for response validation. Header collection is unchanged. No dependency,
message contract for page analysis, or persistent breach storage was added.

## Cache and lifecycle

- Only validated successful empty/record results are reusable for **10 minutes
  from completion**. Reads do not extend expiry. Reopening and Refresh use the
  same cache; Refresh does not bypass the TTL or cooldown.
- Cache keys are exact canonical hostnames, not URLs or parent-domain matches.
  At most **32 hostnames** are retained, evicting the least recently used.
  Each retained JSON result is at most **32,768 UTF-16 code units** (64 KiB);
  retained result strings therefore total at most 2 MiB plus bounded metadata.
  Only displayed breach fields are retained. Larger valid responses display
  normally but are not cached. This bounds retained cache, not response download
  size or temporary parsing memory.
- Expired entries are unusable and pruned on the next lookup; no cleanup/retry
  timer runs in the background. Closing the popup keeps the bounded cache and
  any active request alive until it finishes or its eight-second deadline.
  Reloading the extension or restarting its background clears all state.
- Up to **four distinct hostnames** may have pending requests. Concurrent calls
  for the same hostname share one request; extra distinct calls return busy.
- Firefox permission is checked before serving cache or starting a request.
  Disable/revocation clears cached results and cancels active work; late results
  cannot repopulate it. Cooldown timing survives consent toggles within the same
  background lifetime, preventing an immediate retry bypass.
- Requests use `cache: 'no-store'`, omit credentials/referrers, and send only the
  hostname. No cache/history is written to extension storage. Existing page-scan
  storage and private-session issues remain D07–D10, as documented in the README.

## Rate limiting and failures

HTTP **429** creates a single cooldown shared across hostnames and popup windows.
Use a valid `Retry-After` delay in integer seconds or an HTTP date. Zero/past hints
wait at least one second. Longer server waits are honored, not capped to the local
fallback. Extremely large numeric hints saturate at JavaScript's safe timestamp
limit and effectively block uncached requests for the remainder of the session.
Absent/invalid hints use 60, 120, 240, 480, then 900 seconds, capped at 15 minutes.
A successful request after the cooldown resets that fallback sequence; a concurrent
success cannot clear an active cooldown. Fresh cached results remain readable.

The popup shows a snapshot of the remaining wait and asks the user to reopen or
refresh afterward. **There is no automatic retry.** A 429 is never cached as an
empty success. HTTP errors (including 404), network/body failures, malformed data,
timeouts, and cancellation also remain failures and are never cached. Expired
success is not used as fallback evidence when a new attempt fails.

References checked 2026-10-11: [HIBP response and rate-limit documentation](https://haveibeenpwned.com/API/v3#RateLimiting)
describes 429 and retry seconds; the extension handles them defensively without
assuming a rate quota for its public breach-list endpoint. [MDN Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)
documents seconds and HTTP dates. [MDN getBackgroundPage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBackgroundPage)
documents privileged popup access and Firefox's null result in private windows;
missing/rejected access displays unavailable while local checks still work. This
does not complete the separate D10 private-session work.

## Verification and pending browser checks

`tests/breach-cache.test.mjs` uses a fake clock and independent popup contexts
sharing one background service. It covers reopening, exact expiry, host/size caps,
eviction, concurrent work, failures, late completion, retry hints/fallback,
consent clearing, and an empty restarted service. Existing D01–D05 checks remain.
All requests in tests and the local preview are synthetic.

Native Firefox acceptance is still pending:

1. Load the root manifest in a disposable profile. Check background/popup startup
   errors, then finish the [D05 consent checks](BREACH_CONSENT.md#verification-and-pending-browser-checks).
2. With consent and a non-sensitive page, inspect the background network log:
   first lookup makes one request; closing/reopening and Refresh within ten minutes
   make none and show the cache note. Repeat for empty and populated responses.
3. At ten-minute expiry, reopening must request again. Reload the extension and
   verify the cache is empty. Test timeout/failure after expiry: no stale empty
   result may appear. Record Firefox version, counts, console output, and results.
4. Use a controlled synthetic 429 fixture in the extension debugger (do not force
   the real service to rate-limit). Check two popup openings/hostnames during the
   wait, no scheduled request at expiry, and a permitted user-triggered retry
   afterward. Test valid seconds/date and missing-header fallback separately.
5. Revoke consent with the popup closed and while a response is pending. Reopen:
   no cached result or new request. Regrant: previous cache remains cleared and
   any unexpired cooldown still applies. Carry D01–D05 browser checks forward.

The local preview adds `breach-cached` and `breach-rate-limited` wording fixtures.
Its service runs in the preview page, not an installed Firefox background, so it
cannot establish real popup-close lifecycle, permission behavior, or network flow.

On 2026-10-11, all **67 tests** and local lint passed. Packaging verified eight
extension files against source hashes. The in-app browser rendered the cached
notice and 120-second rate-limit message with score 100 and enabled Refresh;
screenshots showed wrapping within the popup, and captured warnings/errors were
empty. Initial preview access timed out under the sandbox; restarting the
loopback-only server outside it resolved access. Server and successful preview
tab were stopped afterward. This is mocked UI verification, not Firefox acceptance.
