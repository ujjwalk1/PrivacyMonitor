// Browser-only synthetic fixture. Loaded by popup-preview.mjs, never the extension.
const previewCase = new URL(location.href).searchParams.get('case');
const headerNames = ['CSP', 'HSTS', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'];
const previewData = {
  'security_data_fixture.example': { protocol: 'https:', httpsOnly: true, cookies: 0, scripts: 2, thirdPartyScripts: 1 },
  'headers_fixture.example': { present: Object.fromEntries(headerNames.map(name => [name, 'fixture'])), missing: [] },
  'forms_fixture.example': { insecureForms: 0, insecurePasswordForms: 0 },
};
if (previewCase === 'partial') {
  previewData['headers_fixture.example'] = { present: { CSP: 'fixture' }, missing: ['HSTS'] };
  previewData['forms_fixture.example'] = {};
  delete previewData['security_data_fixture.example'].cookies;
}
if (previewCase === 'warnings') {
  previewData['security_data_fixture.example'].protocol = 'http:';
  previewData['security_data_fixture.example'].httpsOnly = false;
  previewData['headers_fixture.example'] = { present: {}, missing: headerNames };
  previewData['forms_fixture.example'] = { insecureForms: 1, insecurePasswordForms: 1 };
}
// Consent controls are synthetic too: no real browser permission prompt is opened.
let previewConsent = !['consent-off', 'consent-denied', 'consent-unsupported'].includes(previewCase);
const previewPermissionEvents = { added: [], removed: [] };
window.browser = {
  runtime: { sendMessage: async message => ({ channel: message.channel, version: 1, ok: true, kind: 'record',
    record: { schemaVersion: 1, tabId: message.tabId, page: { hostname: 'fixture.example', protocol: 'https:' },
      observations: { headers: previewCase === 'incomplete' ? { kind: 'not-observed', data: null } :
        { kind: 'observed', data: Object.fromEntries(PrivacyMonitorPopupState.local({headerData: previewData['headers_fixture.example']}).headers.map(({name,kind}) => [name,kind])) } } } }),
    getBackgroundPage: async () => {
    if (previewCase === 'breach-cached') await window.PrivacyMonitorBreachService.lookup('fixture.example', { incognito: false });
    return window;
  } },
  permissions: {
    getAll: async () => previewCase === 'consent-unsupported' ? {} : { data_collection: previewConsent ? ['browsingActivity'] : [] },
    request: async () => {
      if (previewCase === 'consent-denied') return false;
      previewConsent = true;
      previewPermissionEvents.added.forEach(fn => fn({ data_collection: ['browsingActivity'] }));
      return true;
    },
    remove: async () => {
      previewConsent = false;
      previewPermissionEvents.removed.forEach(fn => fn({ data_collection: ['browsingActivity'] }));
      return true;
    },
    onAdded: { addListener: fn => previewPermissionEvents.added.push(fn) },
    onRemoved: { addListener: fn => previewPermissionEvents.removed.push(fn) },
  },
  tabs: { sendMessage: async () => { throw new Error('Synthetic restricted-page failure'); }, query: async () => previewCase === 'loading' ? new Promise(() => {})
    : [{ id: 1, incognito: false, url: previewCase === 'unsupported' ? 'about:config' : 'https://fixture.example/' }] },
  storage: { local: { get: async () => {
    if (previewCase === 'unavailable') throw new Error('Synthetic storage failure');
    return previewCase === 'incomplete' ? {} : previewData;
  } } },
};
window.fetch = async (_url, { signal } = {}) => {
  if (previewCase === 'breach-timeout') {
    return new Promise((_resolve, reject) => signal.addEventListener('abort',
      () => reject(new DOMException('Synthetic timeout abort', 'AbortError')), { once: true }));
  }
  if (previewCase === 'breach-network-error') throw new TypeError('Synthetic network failure');
  if (previewCase === 'breach-unavailable' || previewCase === 'breach-http-error') {
    return new Response(null, { status: 503 });
  }
  if (previewCase === 'breach-rate-limited') return new Response(null, { status: 429, headers: { 'Retry-After': '120' } });
  if (previewCase === 'breach-malformed') return new Response('{invalid JSON');
  const records = previewCase === 'breach-results'
    ? [{ Name: 'Historical fixture', BreachDate: '2000-01-01', PwnCount: 1000, DataClasses: ['Email addresses'] }]
    : [];
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};
