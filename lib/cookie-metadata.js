// D27 read-only cookie metadata foundation; excluded from the shipping manifest.
globalThis.PrivacyMonitorCookieMetadata = (() => {
  'use strict';
  const MAX_COOKIES = 256;
  const unavailable = reason => ({ kind: 'unavailable', reason });
  const id = n => Number.isSafeInteger(n) && n >= 0;
  const token = s => typeof s === 'string' && s.length > 0 && s.length <= 128;
  const sameSites = new Set(['no_restriction', 'lax', 'strict', 'unspecified']);
  const cookiePermission = () => ({ permissions: ['cookies'] });
  function create({ api, store } = {}) {
    let epoch = 0, disposed = false, ready = false, reading = false, requesting = false;
    const subscriptions = [];
    const invalidate = () => { epoch++; };
    function listen(event, fn) {
      if (typeof event?.addListener !== 'function' || typeof event?.removeListener !== 'function') throw Error();
      subscriptions.push([event, fn]); event.addListener(fn);
    }
    function dispose() {
      disposed = true; ready = false; invalidate();
      for (const [event, fn] of subscriptions.splice(0)) { try { event.removeListener(fn); } catch { /* Inert callbacks. */ } }
    }
    try {
      const manifest = api.runtime.getManifest();
      if (!manifest.optional_permissions?.includes('cookies') || manifest.permissions?.includes('cookies') ||
          typeof api.permissions.request !== 'function' || typeof api.permissions.contains !== 'function' ||
          typeof store?.get !== 'function' || typeof globalThis.PrivacyMonitorSites?.fromURL !== 'function') throw Error();
      listen(api.permissions.onRemoved, change => {
        if (!disposed && (change?.origins?.length || change?.permissions?.includes('cookies'))) invalidate();
      });
      listen(api.webNavigation.onBeforeNavigate, d => { if (!disposed && d.frameId === 0) invalidate(); });
      for (const event of [api.tabs.onActivated, api.tabs.onRemoved, api.tabs.onReplaced, api.windows.onFocusChanged]) {
        listen(event, () => { if (!disposed) invalidate(); });
      }
      ready = true;
    } catch { dispose(); }

    // Invoke directly from a trusted extension button. No asynchronous work precedes the prompt.
    function requestFromGesture() {
      if (!ready || disposed) return Promise.resolve(unavailable('integration-required'));
      if (requesting) return Promise.resolve(unavailable('busy'));
      requesting = true;
      const own = epoch;
      let request;
      try { request = api.permissions.request(cookiePermission()); }
      catch { requesting = false; return Promise.resolve(unavailable('permission-error')); }
      return Promise.resolve(request).then(async granted => {
        if (disposed || own !== epoch) return unavailable('context-changed');
        if (granted !== true) return unavailable(granted === false ? 'permission-denied' : 'permission-error');
        const confirmed = await api.permissions.contains(cookiePermission());
        return !disposed && own === epoch && confirmed === true ? { kind: 'granted' } : unavailable('permission-unavailable');
      }).catch(() => unavailable('permission-error')).finally(() => { requesting = false; });
    }
    function scope(tab) {
      if (!tab || !id(tab.id) || !id(tab.windowId) || tab.active !== true || tab.incognito !== false ||
          !token(tab.cookieStoreId)) throw Error();
      const host = PrivacyMonitorSites.fromURL(tab.url);
      if (!['domain', 'ip', 'local'].includes(host.kind) || !host.siteKey) throw Error();
      const url = new URL(tab.url);
      url.search = ''; url.hash = ''; // Path is used transiently for browser cookie matching only.
      const current = store.get(tab.id);
      const record = current?.ok && current.kind === 'record' && current.record;
      if (!record || record.tabId !== tab.id || !token(record.navigationId) || !token(record.documentId) ||
          record.context?.incognito !== false || record.context.cookieStoreId !== tab.cookieStoreId ||
          record.page?.hostname !== host.hostname || record.page.protocol !== url.protocol) throw Error();
      return { tabId: tab.id, windowId: tab.windowId, storeId: tab.cookieStoreId,
        navigationId: record.navigationId, documentId: record.documentId, hostname: host.hostname,
        queryURL: url.href, originPattern: url.protocol + '//' + url.hostname + '/*',
        topLevelSite: url.protocol + '//' + host.siteKey };
    }
    function project(rows, selected, partition) {
      if (!Array.isArray(rows) || rows.length > MAX_COOKIES) throw Error();
      return rows.map(cookie => {
        // Deliberately do not destructure/spread/copy cookies: name, value and path may be sensitive.
        if (!cookie || cookie.storeId !== selected.storeId || cookie.firstPartyDomain !== '' ||
            typeof cookie.domain !== 'string' || cookie.domain.length > 254 ||
            typeof cookie.hostOnly !== 'boolean') throw Error();
        const domain = PrivacyMonitorSites.fromHostname(cookie.domain.replace(/^\./, ''));
        if (!domain.hostname || !['domain', 'ip', 'local'].includes(domain.kind) ||
            !(selected.hostname === domain.hostname || (!cookie.hostOnly && domain.kind === 'domain' &&
              selected.hostname.endsWith('.' + domain.hostname)))) throw Error();
        const key = cookie.partitionKey;
        if (partition === null ? key != null : !key || key.topLevelSite !== partition ||
            Object.keys(key).some(k => k !== 'topLevelSite')) throw Error();
        if (typeof cookie.session !== 'boolean' || typeof cookie.secure !== 'boolean' ||
            typeof cookie.httpOnly !== 'boolean') throw Error();
        let expirationDate = null;
        if (!cookie.session && cookie.expirationDate !== undefined) {
          if (!Number.isFinite(cookie.expirationDate) || cookie.expirationDate < 0 ||
              cookie.expirationDate > 8640000000000) throw Error();
          expirationDate = cookie.expirationDate;
        }
        return { domain: domain.hostname, hostOnly: cookie.hostOnly, session: cookie.session,
          expirationDate, secure: cookie.secure, httpOnly: cookie.httpOnly,
          sameSite: sameSites.has(cookie.sameSite) ? cookie.sameSite : null,
          partition: partition === null ? { kind: 'unpartitioned' } : { kind: 'top-level-site', topLevelSite: partition },
          purpose: null };
      });
    }
    async function readActive() {
      if (!ready || disposed) return unavailable('integration-required');
      if (reading) return unavailable('busy');
      reading = true;
      const own = epoch;
      const valid = () => !disposed && ready && own === epoch;
      try {
        if (await api.permissions.contains(cookiePermission()) !== true || !valid()) return unavailable('permission-unavailable');
        const tabs = await api.tabs.query({ active: true, currentWindow: true });
        if (!valid()) return unavailable('context-changed');
        if (!Array.isArray(tabs) || tabs.length !== 1) return unavailable('tab-unavailable');
        const selected = scope(tabs[0]);
        const access = { permissions: ['cookies'], origins: [selected.originPattern] };
        if (await api.permissions.contains(access) !== true || !valid()) return unavailable('permission-unavailable');
        let metadata = [];
        for (const partition of [null, selected.topLevelSite]) {
          const query = { url: selected.queryURL, storeId: selected.storeId, firstPartyDomain: '' };
          if (partition !== null) query.partitionKey = { topLevelSite: partition };
          // Project on resolution, before any further await; raw cookie objects are never retained in state.
          const projected = await api.cookies.getAll(query).then(rows => {
            if (!valid()) throw Error();
            return project(rows, selected, partition);
          });
          if (!valid() || metadata.length + projected.length > MAX_COOKIES) return unavailable('context-or-capacity');
          metadata.push(...projected);
        }
        // Revalidate permission and current tab/record after the asynchronous cookie APIs.
        if (await api.permissions.contains(access) !== true || !valid()) return unavailable('permission-unavailable');
        const currentTabs = await api.tabs.query({ active: true, currentWindow: true });
        if (!valid() || !Array.isArray(currentTabs) || currentTabs.length !== 1) return unavailable('context-changed');
        const current = scope(currentTabs[0]);
        if (Object.keys(selected).some(k => current[k] !== selected[k])) return unavailable('context-changed');
        return { kind: 'observed', tabId: selected.tabId, navigationId: selected.navigationId,
          documentId: selected.documentId, storeId: selected.storeId, hostname: selected.hostname,
          coverage: 'current-url-unpartitioned-and-top-level-site-non-fpi',
          cookies: metadata };
      } catch { return unavailable('cookie-metadata-unavailable'); }
      finally { reading = false; }
    }
    return Object.freeze({ requestFromGesture, readActive, invalidate, dispose });
  }
  return Object.freeze({ create, MAX_COOKIES });
})();
