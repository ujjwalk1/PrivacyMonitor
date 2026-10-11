// D06: shared only by privileged MV2 pages; no persistent storage or scheduled retries.
var PrivacyMonitorBreachService = (() => {
  const TTL = 10 * 60 * 1000;
  const MAX_ENTRIES = 32;
  const MAX_ENTRY_CHARS = 32768; // At most 64 KiB of retained UTF-16 JSON per hostname.
  const MAX_PENDING = 4;
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const cache = new Map();
  const pending = new Map();
  let generation = 0;
  let retryAt = 0;
  let rateLimits = 0;

  function clear() {
    generation++;
    cache.clear();
    for (const operation of pending.values()) operation.cancel();
    pending.clear();
    // Revoking/regranting consent must not bypass the service's cooldown.
  }

  api.permissions?.onRemoved?.addListener(change => {
    if (change.data_collection?.includes('browsingActivity')) clear();
  });

  function retryDelay(value, now) {
    const fallback = Math.min(60000 * 2 ** Math.min(rateLimits - 1, 4), 900000);
    if (typeof value !== 'string') return fallback;
    value = value.trim();
    if (/^\d+$/.test(value)) {
      return Math.max(1000, Math.min(Number(value) * 1000, Number.MAX_SAFE_INTEGER - now));
    }
    // Do not let Date.parse interpret malformed numeric strings as dates.
    if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return fallback;
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(1000, date - now) : fallback;
  }

  async function lookup(hostname) {
    // Accept only a hostname, never a full URL or arbitrary service URL.
    if (typeof hostname !== 'string' || !hostname || hostname.length > 253) return { kind: 'unavailable' };
    try {
      if (new URL(`https://${hostname}/`).hostname !== hostname) return { kind: 'unavailable' };
    } catch { return { kind: 'unavailable' }; }
    const revision = generation;
    let permissions;
    try { permissions = await api.permissions?.getAll(); }
    catch { clear(); return { kind: 'consent-error' }; }
    if (revision !== generation) return { kind: 'cancelled' };
    if (!Array.isArray(permissions?.data_collection) || !permissions.data_collection.includes('browsingActivity')) {
      clear();
      return { kind: 'disabled' };
    }
    const now = Date.now();
    for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key);
    const hit = cache.get(hostname);
    if (hit) {
      cache.delete(hostname); cache.set(hostname, hit); // Bounded least-recently-used eviction.
      return { ...JSON.parse(hit.json), cached: true, checkedAt: hit.checkedAt };
    }
    if (now < retryAt) return { kind: 'rate-limited', retryAt };
    if (pending.has(hostname)) return pending.get(hostname).promise;
    if (pending.size >= MAX_PENDING) return { kind: 'busy' };

    const controller = new AbortController();
    let cancel, timer;
    const cancellation = new Promise(resolve => {
      cancel = () => { resolve({ kind: 'cancelled' }); controller.abort(); };
    });
    const deadline = new Promise(resolve => {
      timer = setTimeout(() => { resolve({ kind: 'timeout' }); controller.abort(); }, 8000);
    });
    async function request() {
      try {
        const response = await fetch(
          `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(hostname)}`,
          { headers: { 'User-Agent': 'PrivacyMonitorExtension/1.1' }, signal: controller.signal,
            credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
        if (response.status === 429) return { kind: 'rate-limited', retryAfter: response.headers?.get('Retry-After') };
        if (!response.ok) return { kind: 'http-error', status: response.status };
        let breaches;
        try { breaches = await response.json(); }
        catch (error) { return { kind: error?.name === 'SyntaxError' ? 'malformed' : 'network-error' }; }
        const kind = PrivacyMonitorPopupState.breaches(breaches);
        if (kind === 'unavailable') return { kind: 'malformed' };
        // Keep only the fields the popup displays, never API descriptions or arbitrary extra fields.
        return kind === 'empty' ? { kind } : { kind, breaches: breaches.map(item => ({
          Name: item.Name, BreachDate: item.BreachDate, PwnCount: item.PwnCount, DataClasses: item.DataClasses,
        })) };
      } catch { return { kind: 'network-error' }; }
    }
    const operation = { cancel };
    operation.promise = (async () => {
      try {
        const result = await Promise.race([request(), deadline, cancellation]);
        if (revision !== generation) return { kind: 'cancelled' };
        const settledAt = Date.now();
        if (result.kind === 'rate-limited') {
          rateLimits = Math.min(rateLimits + 1, 5);
          retryAt = Math.max(retryAt, settledAt + retryDelay(result.retryAfter, settledAt));
          return { kind: 'rate-limited', retryAt };
        }
        if (result.kind === 'empty' || result.kind === 'results') {
          // A concurrent success must not clear another request's active cooldown.
          if (settledAt >= retryAt) rateLimits = 0;
          const json = JSON.stringify(result);
          if (json.length <= MAX_ENTRY_CHARS) {
            cache.delete(hostname);
            cache.set(hostname, { json, checkedAt: settledAt, expiresAt: settledAt + TTL });
            while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
          }
          return { ...result, cached: false, checkedAt: settledAt };
        }
        return result;
      } finally {
        clearTimeout(timer);
        if (pending.get(hostname) === operation) pending.delete(hostname);
      }
    })();
    pending.set(hostname, operation);
    return operation.promise;
  }
  return Object.freeze({ lookup, clear });
})();
