// D07 foundation. Producers and legacy popup migration are deliberately left to D08/D09.
var PrivacyMonitorAnalysis = (() => {
  const CHANNEL = 'privacy-monitor.analysis';
  const VERSION = 1;
  const MAX_RECORDS = 256;
  const HEADERS = ['CSP', 'HSTS', 'X-Frame-Options', 'X-Content-Type-Options',
    'Referrer-Policy', 'Permissions-Policy'];
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isId = value => Number.isSafeInteger(value) && value >= 0;
  const isCount = isId;
  const isToken = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
  const exactKeys = (value, keys) => isObject(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
  const copy = value => JSON.parse(JSON.stringify(value));
  const error = code => ({ ok: false, error: code });

  function validData(section, data) {
    if (section === 'connection') return exactKeys(data, ['protocol', 'httpsOnly']) &&
      ['http:', 'https:'].includes(data.protocol) && data.httpsOnly === (data.protocol === 'https:');
    if (section === 'privacy') return exactKeys(data, ['cookies', 'scripts', 'thirdPartyScripts']) &&
      [data.cookies, data.scripts, data.thirdPartyScripts].every(isCount) && data.thirdPartyScripts <= data.scripts;
    if (section === 'forms') return exactKeys(data, ['insecureForms', 'insecurePasswordForms']) &&
      [data.insecureForms, data.insecurePasswordForms].every(isCount) && data.insecurePasswordForms <= data.insecureForms;
    if (section === 'headers') return exactKeys(data, HEADERS) && HEADERS.every(name =>
      ['present', 'absent', 'not-observed', 'unavailable'].includes(data[name]));
    return false;
  }

  function createStore({ now = () => Date.now(), sessionId = crypto.randomUUID() } = {}) {
    if (!isToken(sessionId) || sessionId.length > 80) throw new Error('Invalid analysis session ID');
    const records = new Map();
    let generation = 0;

    // Only trusted background producers may begin a navigation, using browser-supplied tab metadata.
    function begin(tab, { documentId = null } = {}) {
      if (!isObject(tab) || !isId(tab.id) || typeof tab.url !== 'string' ||
          (tab.incognito != null && typeof tab.incognito !== 'boolean') ||
          (tab.cookieStoreId != null && !isToken(tab.cookieStoreId)) ||
          (documentId !== null && !isToken(documentId))) return error('invalid-request');
      let page;
      try { page = new URL(tab.url); } catch { return error('invalid-request'); }
      if (!['http:', 'https:'].includes(page.protocol)) return error('unsupported-page');
      if (!page.hostname || page.hostname.length > 253) return error('invalid-request');
      const timestamp = now();
      const record = {
        schemaVersion: VERSION, tabId: tab.id, navigationId: `${sessionId}:${++generation}`,
        documentId, context: { cookieStoreId: tab.cookieStoreId ?? null, incognito: tab.incognito ?? null },
        page: { hostname: page.hostname, protocol: page.protocol },
        createdAt: timestamp, updatedAt: timestamp,
        observations: Object.fromEntries(['connection', 'headers', 'forms', 'privacy'].map(name =>
          [name, { kind: 'not-observed', data: null, observedAt: null }])),
      };
      records.delete(tab.id);
      records.set(tab.id, record);
      while (records.size > MAX_RECORDS) records.delete(records.keys().next().value);
      return { ok: true, record: copy(record) };
    }

    function get(tabId, navigationId) {
      if (!isId(tabId) || (navigationId !== undefined && !isToken(navigationId))) return error('invalid-request');
      const record = records.get(tabId);
      if (!record) return { ok: true, kind: 'not-observed', record: null };
      if (navigationId !== undefined && navigationId !== record.navigationId) return error('stale-navigation');
      return { ok: true, kind: 'record', record: copy(record) };
    }

    function update(identity, section, observation) {
      if (!exactKeys(identity, ['tabId', 'navigationId']) || !isId(identity.tabId) ||
          !isToken(identity.navigationId) || !['connection', 'headers', 'forms', 'privacy'].includes(section) ||
          !exactKeys(observation, ['kind', 'data']) ||
          !['observed', 'unavailable'].includes(observation.kind) ||
          (observation.kind === 'unavailable' ? observation.data !== null : !validData(section, observation.data))) {
        return error('invalid-request');
      }
      const record = records.get(identity.tabId);
      if (!record) return error('missing-record');
      if (record.navigationId !== identity.navigationId) return error('stale-navigation');
      if (section === 'connection' && observation.kind === 'observed' &&
          observation.data.protocol !== record.page.protocol) return error('invalid-request');
      const timestamp = now();
      record.observations[section] = { ...copy(observation), observedAt: timestamp };
      record.updatedAt = timestamp;
      return { ok: true, record: copy(record) };
    }

    function remove(tabId) { return isId(tabId) && records.delete(tabId); }
    function clear() { records.clear(); } // Keep the counter: old identities never become current again.
    return Object.freeze({ begin, get, update, remove, clear });
  }

  // Read-only D07 transport. Content scripts cannot select arbitrary tabs or write records.
  function createMessageHandler({ store, extensionId, popupUrl }) {
    return function onMessage(message, sender) {
      if (!isObject(message) || message.channel !== CHANNEL) return undefined;
      let result;
      if (!extensionId || !popupUrl || sender?.id !== extensionId || sender?.url !== popupUrl || sender?.tab) {
        result = error('forbidden');
      } else if (message.version !== VERSION) {
        result = error('unsupported-version');
      } else if (message.type !== 'get' || !exactKeys(message, message.navigationId === undefined
        ? ['channel', 'version', 'type', 'tabId'] : ['channel', 'version', 'type', 'tabId', 'navigationId'])) {
        result = error('invalid-request');
      } else {
        result = store.get(message.tabId, message.navigationId);
      }
      // Only messages owned by this listener return a Promise, leaving unrelated listeners free to reply.
      return Promise.resolve({ channel: CHANNEL, version: VERSION, ...result });
    };
  }
  return Object.freeze({ createStore, createMessageHandler });
})();
