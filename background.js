// D08: correlate main-frame response headers with a committed per-tab navigation.
(() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const store = PrivacyMonitorAnalysisStore;
  const headers = {
    'content-security-policy': 'CSP', 'strict-transport-security': 'HSTS',
    'x-frame-options': 'X-Frame-Options', 'x-content-type-options': 'X-Content-Type-Options',
    'referrer-policy': 'Referrer-Policy', 'permissions-policy': 'Permissions-Policy',
  };
  const navigations = new Map();
  const validEvent = d => Number.isSafeInteger(d.tabId) && d.tabId >= 0 && d.frameId === 0 &&
    Number.isFinite(d.timeStamp) && d.timeStamp >= 0;
  const isRequest = d => validEvent(d) && d.type === 'main_frame' &&
    typeof d.requestId === 'string' && d.requestId.length > 0 && d.requestId.length <= 128;
  const filter = { urls: ['<all_urls>'], types: ['main_frame'] };

  // Only a transient digest is retained for full-resource matching, never the URL itself.
  async function fingerprint(raw) {
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      url.hash = '';
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url.href));
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    } catch { return null; }
  }

  function remove(tabId) { navigations.delete(tabId); store.remove(tabId); }
  function current(tabId, nav, request) {
    return navigations.get(tabId) === nav && (!request || nav.request === request);
  }
  function publish(tabId, nav, request) {
    if (!current(tabId, nav, request) || !nav.identity || !nav.key || !request.complete ||
        !request.key || request.key !== nav.key || !request.response ||
        request.response.key !== request.key) return;
    store.update(nav.identity, 'headers', request.response.observation);
  }

  api.webNavigation.onBeforeNavigate.addListener(d => {
    if (!validEvent(d)) return;
    const previous = navigations.get(d.tabId);
    if (previous && d.timeStamp <= previous.lastNavigationTime) return;
    remove(d.tabId); // Including unsupported destinations and same-URL reloads.
    navigations.set(d.tabId, { startedAt: d.timeStamp, lastNavigationTime: d.timeStamp });
    while (navigations.size > 256) remove(navigations.keys().next().value);
  });

  api.webRequest.onBeforeRequest.addListener(d => {
    if (!isRequest(d)) return;
    const nav = navigations.get(d.tabId);
    if (!nav || d.timeStamp < nav.startedAt ||
        (nav.committedAt !== undefined && d.timeStamp > nav.committedAt)) return;
    if (nav.request && d.timeStamp <= nav.request.lastTime) return;
    const request = { id: d.requestId, startedAt: d.timeStamp, lastTime: d.timeStamp,
      incognito: typeof d.incognito === 'boolean' ? d.incognito : null,
      cookieStoreId: typeof d.cookieStoreId === 'string' && d.cookieStoreId.length <= 128 ? d.cookieStoreId : null };
    nav.request = request; // A redirect hop or a different request invalidates pending old digest work.
    void fingerprint(d.url).then(key => {
      if (!current(d.tabId, nav, request)) return;
      request.key = key; publish(d.tabId, nav, request);
    });
  }, filter);

  function matching(d) {
    if (!isRequest(d)) return null;
    const nav = navigations.get(d.tabId), request = nav?.request;
    if (!request || request.id !== d.requestId || d.timeStamp < request.lastTime || request.finished) return null;
    request.lastTime = d.timeStamp;
    return { nav, request };
  }

  api.webRequest.onHeadersReceived.addListener(d => {
    const match = matching(d); if (!match) return;
    const { nav, request } = match;
    const data = Object.fromEntries(Object.values(headers).map(name => [name, 'absent']));
    // A 304 may contain only changed headers: absence is not evidence of missing protection.
    const usable = Number.isInteger(d.statusCode) && d.statusCode >= 200 &&
      !(d.statusCode >= 300 && d.statusCode < 400) && Array.isArray(d.responseHeaders) &&
      d.responseHeaders.every(item => item && typeof item.name === 'string');
    if (usable) for (const item of d.responseHeaders) {
      const key = item.name.toLowerCase();
      if (Object.hasOwn(headers, key)) data[headers[key]] = 'present';
    }
    const response = { observation: usable ? { kind: 'observed', data } : { kind: 'unavailable', data: null } };
    request.response = response;
    void fingerprint(d.url).then(key => {
      if (!current(d.tabId, nav, request) || request.response !== response) return;
      response.key = key; publish(d.tabId, nav, request);
    });
  }, filter, ['responseHeaders']);

  api.webRequest.onBeforeRedirect.addListener(d => {
    const match = matching(d); if (!match) return;
    // Do not carry a redirect response into its target, even when requestId/hostname are reused.
    match.nav.request = { id: d.requestId, lastTime: d.timeStamp, finished: true };
    if (match.nav.identity) store.update(match.nav.identity, 'headers', { kind: 'unavailable', data: null });
  }, filter);

  api.webRequest.onCompleted.addListener(d => {
    const match = matching(d); if (!match) return;
    match.request.complete = true; match.request.finished = true;
    publish(d.tabId, match.nav, match.request);
  }, filter);

  api.webRequest.onErrorOccurred.addListener(d => {
    const match = matching(d); if (!match) return;
    match.request.finished = true;
    match.request.response = null;
    if (match.nav.identity) store.update(match.nav.identity, 'headers', { kind: 'unavailable', data: null });
  }, filter);

  api.webNavigation.onCommitted.addListener(d => {
    if (!validEvent(d)) return;
    const nav = navigations.get(d.tabId);
    if (!nav || d.timeStamp < nav.lastNavigationTime) return;
    if (nav.committedAt !== undefined) nav.request = null; // Never reuse evidence on an unpaired later commit.
    nav.key = null;
    nav.lastNavigationTime = d.timeStamp; nav.committedAt = d.timeStamp;
    store.remove(d.tabId);
    const request = nav.request;
    const started = store.begin({ id: d.tabId, url: d.url,
      incognito: request?.incognito ?? null, cookieStoreId: request?.cookieStoreId ?? null },
    { documentId: typeof d.documentId === 'string' && d.documentId.length <= 128 ? d.documentId : null });
    nav.identity = started.ok ? { tabId: d.tabId, navigationId: started.record.navigationId } : null;
    void fingerprint(d.url).then(key => {
      if (!current(d.tabId, nav) || nav.committedAt !== d.timeStamp) return;
      nav.key = key;
      if (nav.request) publish(d.tabId, nav, nav.request);
    });
  });

  api.webNavigation.onErrorOccurred.addListener(d => {
    if (!validEvent(d)) return;
    const nav = navigations.get(d.tabId);
    if (!nav || d.timeStamp < nav.lastNavigationTime) return;
    remove(d.tabId); // An aborted/failed navigation cannot leave an older successful record.
  });
  api.tabs.onRemoved.addListener(remove);
  api.tabs.onReplaced.addListener((addedTabId, removedTabId) => { remove(removedTabId); remove(addedTabId); });
})();
