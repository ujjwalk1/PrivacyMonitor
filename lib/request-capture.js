// Opt-in D23 collector foundation. Not loaded by the production manifest.
// Requires PrivacyMonitorSites; attach only from a trusted background context.
globalThis.PrivacyMonitorRequests = (() => {
  'use strict';
  const LIMITS = Object.freeze({ tabs: 64, pairsPerNavigation: 256, eventsPerPair: 65535 });
  const TYPES = new Set(['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'object',
    'object_subrequest', 'xmlhttprequest', 'xslt', 'ping', 'beacon', 'xml_dtd', 'font',
    'media', 'websocket', 'csp_report', 'imageset', 'web_manifest', 'speculative', 'other']);
  const id = value => Number.isSafeInteger(value) && value >= 0;
  const time = value => Number.isFinite(value) && value >= 0;
  const documentId = value => typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  const topEvent = d => d && id(d.tabId) && d.frameId === 0 && time(d.timeStamp);
  const unavailable = reason => ({ kind: 'unavailable', reason });

  function attach(api) {
    const sites = globalThis.PrivacyMonitorSites;
    const records = new Map(), registrations = [];
    let failure = null, stopped = false;
    const remove = tabId => { records.delete(tabId); };
    function disable(record, reason) {
      record.reason = reason;
      record.pairs.clear();
      record.truncated = false;
      record.counterSaturated = false;
    }
    function before(d) {
      if (!topEvent(d)) return;
      const previous = records.get(d.tabId);
      if (previous && d.timeStamp <= previous.lastNavigationTime) return;
      remove(d.tabId);
      records.set(d.tabId, { startedAt: d.timeStamp, lastNavigationTime: d.timeStamp,
        committedAt: null, documentId: null, reason: 'awaiting-commit',
        pairs: new Map(), truncated: false, counterSaturated: false });
      while (records.size > LIMITS.tabs) remove(records.keys().next().value);
    }
    function committed(d) {
      if (!topEvent(d)) return;
      const record = records.get(d.tabId);
      if (!record || d.timeStamp < record.lastNavigationTime ||
          (record.committedAt !== null && d.timeStamp === record.lastNavigationTime)) return;
      record.lastNavigationTime = d.timeStamp;
      record.committedAt = d.timeStamp;
      record.documentId = documentId(d.documentId) ? d.documentId.toLowerCase() : null;
      disable(record, null); // Includes unpaired later commits; never carry old request evidence.
      if (!record.documentId) { disable(record, 'document-identity-unavailable'); return; }
      let page;
      try { page = sites.fromURL(d.url); } catch { disable(record, 'domain-helper-unavailable'); return; }
      if (page.kind === 'unavailable') disable(record, 'domain-helper-unavailable');
      else if (!page.hostname || page.kind === 'invalid') disable(record, 'unsupported-page');
      // No page URL or hostname is retained; the UUID identifies the committed document.
    }
    function navigationError(d) {
      if (!topEvent(d)) return;
      const record = records.get(d.tabId);
      if (record && d.timeStamp >= record.lastNavigationTime) remove(d.tabId);
    }
    function capture(d) {
      if (!topEvent(d) || d.type === 'main_frame' || d.type === 'sub_frame') return;
      const record = records.get(d.tabId);
      if (!record || record.reason || record.committedAt === null || d.timeStamp < record.committedAt) return;
      if (!documentId(d.documentId)) { disable(record, 'document-identity-unavailable'); return; }
      if (d.documentId.toLowerCase() !== record.documentId) return;
      if (d.incognito !== false) { disable(record, 'private-or-unknown-context'); return; }
      // Read only the URL and resource type after identity/context checks. Never copy the event.
      let host;
      try { host = sites.fromURL(d.url); } catch { disable(record, 'domain-helper-unavailable'); return; }
      if (host.kind === 'unavailable') { disable(record, 'domain-helper-unavailable'); return; }
      if (!host.hostname || host.kind === 'invalid') return;
      const type = TYPES.has(d.type) ? d.type : 'other';
      const key = host.hostname + '|' + type;
      const existing = record.pairs.get(key);
      if (existing) {
        if (existing.events < LIMITS.eventsPerPair) existing.events++;
        else record.counterSaturated = true;
      } else if (record.pairs.size < LIMITS.pairsPerNavigation) {
        record.pairs.set(key, { hostname: host.hostname, type, events: 1 });
      } else record.truncated = true;
      // An observed onBeforeRequest event is not evidence of successful loading or blocking.
    }
    function get(tabId, expectedDocumentId) {
      if (!id(tabId) || (expectedDocumentId !== undefined && !documentId(expectedDocumentId))) {
        return { kind: 'invalid' };
      }
      if (stopped) return unavailable('stopped');
      if (failure) return unavailable(failure);
      const record = records.get(tabId);
      if (!record) return { kind: 'not-observed' };
      if (expectedDocumentId !== undefined && expectedDocumentId.toLowerCase() !== record.documentId) {
        return unavailable('stale-document');
      }
      if (record.reason) return unavailable(record.reason);
      return { kind: record.pairs.size ? 'observed' : 'not-observed',
        documentId: record.documentId, coverage: 'top-frame-after-commit',
        truncated: record.truncated, counterSaturated: record.counterSaturated,
        observations: Array.from(record.pairs.values(), value => ({ ...value })) };
    }
    function detach() {
      // Guarded listeners stay inert even if an API fails to remove one.
      for (const [event, listener] of registrations.splice(0)) {
        try { event.removeListener(listener); } catch { /* No logging of browsing events. */ }
      }
      records.clear();
    }
    function stop() { stopped = true; detach(); }
    function listen(event, listener, ...args) {
      if (typeof event?.addListener !== 'function' || typeof event?.removeListener !== 'function') {
        throw new Error('Unavailable event API');
      }
      const guarded = (...values) => { if (!failure && !stopped) listener(...values); };
      registrations.push([event, guarded]);
      event.addListener(guarded, ...args);
    }
    try {
      if (typeof sites?.fromURL !== 'function') failure = 'domain-helper-unavailable';
      else {
        listen(api.webNavigation.onBeforeNavigate, before);
        listen(api.webNavigation.onCommitted, committed);
        listen(api.webNavigation.onErrorOccurred, navigationError);
        listen(api.tabs.onRemoved, remove);
        listen(api.tabs.onReplaced, (added, removed) => { remove(removed); remove(added); });
        listen(api.webRequest.onBeforeRequest, capture, { urls: ['http://*/*', 'https://*/*'] });
      }
    } catch { failure = 'listener-unavailable'; detach(); }
    return Object.freeze({ get, stop });
  }
  return Object.freeze({ LIMITS, attach });
})();
