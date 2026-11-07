import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const settle = () => new Promise(resolve => setImmediate(resolve));
const documentId = '00000000-0000-4000-8000-000000000001';
function cookie(extra = {}) {
  const c = { domain: '.example.com', hostOnly: false, storeId: 'firefox-container-2',
    firstPartyDomain: '', session: false, expirationDate: 2000000000,
    secure: true, httpOnly: true, sameSite: 'lax', ...extra };
  for (const name of ['value', 'name', 'path']) Object.defineProperty(c, name, {
    get() { assert.fail('Sensitive cookie property accessed: ' + name); },
  });
  return c;
}
function setup() {
  const controls = { manifest: { permissions: ['webNavigation'], optional_permissions: ['cookies'] },
    permission: () => true, request: () => true,
    tab: { id: 1, windowId: 7, active: true, incognito: false, cookieStoreId: 'firefox-container-2',
      url: 'https://www.example.com/account?token=secret#private' },
    rows: query => query.partitionKey ? [cookie({ partitionKey: { ...query.partitionKey } })] : [cookie()],
  };
  const events = {}, calls = [];
  const event = name => {
    const listeners = new Set(); events[name] = (...args) => [...listeners].forEach(fn => fn(...args));
    return { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), listeners };
  };
  const api = {
    runtime: { getManifest: () => controls.manifest },
    permissions: { contains: async p => { calls.push(['contains', plain(p)]); return controls.permission(p); },
      request: p => { calls.push(['request', plain(p)]); return controls.request(p); }, onRemoved: event('permission') },
    tabs: { query: async p => { calls.push(['tabs', plain(p)]); return controls.tab ? [{ ...controls.tab }] : []; },
      onActivated: event('activated'), onRemoved: event('closed'), onReplaced: event('replaced') },
    windows: { onFocusChanged: event('focus') },
    webNavigation: { onBeforeNavigate: event('navigate') },
    cookies: { getAll: async query => { calls.push(['cookies', plain(query)]); return controls.rows(query); },
      set() { assert.fail('No cookie writes'); }, remove() { assert.fail('No cookie deletion'); } },
    get storage() { assert.fail('No persistent cookie data'); },
  };
  const context = vm.createContext({ URL, crypto: { randomUUID: () => 'cookie-tests' },
    fetch() { assert.fail('No network'); }, console: { log() { assert.fail('No logging'); } } });
  for (const file of ['vendor/tldts/index.umd.min.js', 'lib/site-domains.js', 'analysis-records.js', 'lib/cookie-metadata.js']) {
    vm.runInContext(read(file), context);
  }
  const store = context.PrivacyMonitorAnalysis.createStore({ now: () => 100 });
  const begin = () => store.begin(controls.tab, { documentId });
  begin();
  const reader = context.PrivacyMonitorCookieMetadata.create({ api, store });
  return { api, context, controls, calls, events, reader, store, begin };
}
test('explicit cookie grant is requested synchronously and never scans automatically', async () => {
  const v = setup(); assert.deepEqual(v.calls, []);
  const granting = v.reader.requestFromGesture();
  assert.deepEqual(v.calls, [['request', { permissions: ['cookies'] }]]);
  assert.equal((await granting).kind, 'granted');
  assert.equal(v.calls.some(c => c[0] === 'cookies'), false); v.reader.dispose();
});
test('denied, rejected and revoked grants stay unavailable; required/missing cookie declarations fail closed', async () => {
  for (const request of [() => false, () => { throw Error(); }, () => Promise.reject(Error()), () => 'yes']) {
    const v = setup(); v.controls.request = request;
    assert.equal((await v.reader.requestFromGesture()).kind, 'unavailable'); v.reader.dispose();
  }
  for (const manifest of [JSON.parse(read('manifest.json')), { permissions: ['cookies'], optional_permissions: ['cookies'] }]) {
    const v = setup(); v.reader.dispose(); v.controls.manifest = manifest;
    const reader = v.context.PrivacyMonitorCookieMetadata.create({ api: v.api, store: v.store });
    assert.equal((await reader.requestFromGesture()).reason, 'integration-required');
    assert.equal((await reader.readActive()).kind, 'unavailable'); assert.deepEqual(v.calls, []);
  }
  const v = setup(), grant = deferred(); v.controls.request = () => grant.promise;
  const pending = v.reader.requestFromGesture(); v.events.permission({ permissions: ['cookies'] });
  grant.resolve(true); assert.equal((await pending).kind, 'unavailable'); v.reader.dispose();
});
test('active tab, exact store and separate explicit partitions are used; raw cookie secrets are never read', async () => {
  const v = setup(), result = plain(await v.reader.readActive());
  assert.equal(result.kind, 'observed'); assert.equal(result.cookies.length, 2);
  assert.deepEqual(v.calls.filter(c => c[0] === 'cookies').map(c => c[1]), [
    { url: 'https://www.example.com/account', storeId: 'firefox-container-2', firstPartyDomain: '' },
    { url: 'https://www.example.com/account', storeId: 'firefox-container-2', firstPartyDomain: '',
      partitionKey: { topLevelSite: 'https://example.com' } },
  ]);
  assert.deepEqual(result.cookies[0], { domain: 'example.com', hostOnly: false, session: false,
    expirationDate: 2000000000, secure: true, httpOnly: true, sameSite: 'lax',
    partition: { kind: 'unpartitioned' }, purpose: null });
  assert.equal(result.cookies[1].partition.topLevelSite, 'https://example.com');
  assert.doesNotMatch(JSON.stringify(result), /secret|account|token|private|"name"|"value"|"path"/);
  assert.ok(v.calls.filter(c => c[0] === 'tabs').every(c => c[1].active && c[1].currentWindow));
  v.reader.dispose();
});
test('session/unknown metadata stays explicit and duplicate metadata rows are not merged into a false cookie count', async () => {
  const v = setup(); v.controls.rows = q => q.partitionKey ? [] :
    [cookie({ session: true, sameSite: 'future' }), cookie({ session: true, sameSite: 'future' })];
  const result = await v.reader.readActive(); assert.equal(result.cookies.length, 2);
  assert.equal(result.cookies[0].expirationDate, null); assert.equal(result.cookies[0].sameSite, null);
  assert.equal(result.cookies[0].purpose, null); v.reader.dispose();
});
test('permission and host denial prevent cookie API access; confirmed empty differs from unavailable', async () => {
  for (const predicate of [() => false, p => !p.origins, () => Promise.reject(Error())]) {
    const v = setup(); v.controls.permission = predicate;
    assert.equal((await v.reader.readActive()).kind, 'unavailable');
    assert.ok(!v.calls.some(c => c[0] === 'cookies')); v.reader.dispose();
  }
  const v = setup(); v.controls.rows = () => [];
  const result = await v.reader.readActive(); assert.equal(result.kind, 'observed');
  assert.equal(result.cookies.length, 0); assert.match(result.coverage, /non-fpi/); v.reader.dispose();
});
test('private, unknown context, missing stores/records and unsupported pages cannot query cookies', async () => {
  for (const change of [
    v => { v.controls.tab.incognito = true; }, v => { delete v.controls.tab.incognito; },
    v => { delete v.controls.tab.cookieStoreId; }, v => { v.controls.tab.active = false; },
    v => { v.controls.tab.url = 'about:config'; }, v => { v.controls.tab.url = 'https://user:secret@example.com'; },
    v => { v.store.remove(1); }, v => { v.controls.tab.cookieStoreId = 'firefox-default'; },
    v => { v.controls.tab = null; },
  ]) {
    const v = setup(); change(v);
    assert.equal((await v.reader.readActive()).kind, 'unavailable');
    assert.ok(!v.calls.some(c => c[0] === 'cookies')); v.reader.dispose();
  }
});
test('schemeful PSL boundaries include private suffixes, local addresses and exact selected host access', async () => {
  for (const [url, site] of [
    ['https://a.example.co.uk/', 'https://example.co.uk'],
    ['http://tenant.github.io/', 'http://tenant.github.io'],
    ['http://localhost:4180/page-a', 'http://localhost'],
    ['http://127.0.0.1:4180/page-a', 'http://127.0.0.1'],
    ['http://[::1]:4180/', 'http://[::1]'],
    ['https://bücher.de/', 'https://xn--bcher-kva.de'],
  ]) {
    const v = setup(); v.controls.tab.url = url; v.begin(); v.controls.rows = () => [];
    assert.equal((await v.reader.readActive()).kind, 'observed');
    assert.equal(v.calls.filter(c => c[0] === 'cookies')[1][1].partitionKey.topLevelSite, site);
    v.reader.dispose();
  }
  const v = setup(); v.controls.tab.url = 'https://site.unknownsuffix/'; v.begin();
  assert.equal((await v.reader.readActive()).kind, 'unavailable'); v.reader.dispose();
});
test('wrong store, domain, partition, first-party isolation or malformed rows invalidate the whole result', async () => {
  for (const row of [
    cookie({ storeId: 'firefox-default' }), cookie({ domain: 'other.com' }),
    cookie({ domain: 'example.com', hostOnly: true }), cookie({ firstPartyDomain: 'other.com' }),
    cookie({ firstPartyDomain: undefined }), cookie({ partitionKey: { topLevelSite: 'https://other.com' } }),
    cookie({ domain: '<img src=x>' }), cookie({ secure: 'true' }), cookie({ expirationDate: Infinity }),
  ]) {
    const v = setup(); v.controls.rows = () => [row];
    const result = await v.reader.readActive(); assert.equal(result.kind, 'unavailable');
    assert.equal(result.cookies, undefined); v.reader.dispose();
  }
  const v = setup(); v.controls.rows = () => [cookie()]; // Unpartitioned row must not enter partitioned query.
  assert.equal((await v.reader.readActive()).kind, 'unavailable'); v.reader.dispose();
});
test('API failures and oversized aggregate results never become successful zero or partial cookies', async () => {
  for (const rows of [() => Promise.reject(Error('secret')), () => ({}),
    () => Array.from({ length: 257 }, () => cookie()),
    q => Array.from({ length: 129 }, () => cookie(q.partitionKey ? { partitionKey: q.partitionKey } : {}))]) {
    const v = setup(); v.controls.rows = rows;
    const result = await v.reader.readActive(); assert.equal(result.kind, 'unavailable');
    assert.equal(result.cookies, undefined); assert.doesNotMatch(JSON.stringify(result), /secret/); v.reader.dispose();
  }
});
test('revocation, navigation, tab/window changes, closure and disposal reject pending raw responses', async () => {
  for (const invalidate of [
    v => v.events.permission({ permissions: ['cookies'] }), v => v.events.permission({ origins: ['https://*/*'] }),
    v => v.events.navigate({ frameId: 0 }), v => v.events.activated({ tabId: 2 }),
    v => v.events.closed(1), v => v.events.replaced(2, 1), v => v.events.focus(9),
    v => v.reader.invalidate(), v => v.reader.dispose(),
  ]) {
    const v = setup(), response = deferred(); v.controls.rows = () => response.promise;
    const pending = v.reader.readActive(); await settle(); invalidate(v);
    const hostile = { get storeId() { assert.fail('Stale response must not be projected'); } };
    response.resolve([hostile]);
    assert.equal((await pending).kind, 'unavailable'); v.reader.dispose();
  }
});
test('final current-tab and record checks reject same-URL navigation and store/context changes without relying on events', async () => {
  for (const change of [
    v => v.begin(), v => { v.controls.tab.id = 2; v.begin(); },
    v => { v.controls.tab.cookieStoreId = 'firefox-default'; v.begin(); },
    v => { v.controls.tab.url = 'https://www.example.com/different'; },
    v => { v.controls.tab.incognito = true; },
  ]) {
    const v = setup(); let reads = 0;
    v.controls.rows = () => { if (++reads === 2) change(v); return []; };
    assert.equal((await v.reader.readActive()).kind, 'unavailable'); v.reader.dispose();
  }
});
test('final permission check detects silent revocation and concurrent reads are bounded to one', async () => {
  const v = setup(), response = deferred(); v.controls.rows = () => response.promise;
  const pending = v.reader.readActive(); await settle();
  assert.equal((await v.reader.readActive()).reason, 'busy');
  v.controls.permission = () => false; response.resolve([]);
  assert.equal((await pending).kind, 'unavailable'); v.reader.dispose();
});
test('no retained cache or result mutation crosses reads; cookie consent does not grant host access', async () => {
  const v = setup(); const first = await v.reader.readActive(); first.cookies[0].domain = 'tampered';
  const second = await v.reader.readActive(); assert.equal(second.cookies[0].domain, 'example.com');
  const hostChecks = v.calls.filter(c => c[0] === 'contains' && c[1].origins);
  assert.ok(hostChecks.every(c => c[1].origins[0] === 'https://www.example.com/*'));
  assert.ok(v.calls.every(c => c[0] !== 'request')); v.reader.dispose();
});
test('D27 remains outside the manifest and package; partial listener registration rolls back', async () => {
  const v = setup(); v.reader.dispose();
  v.api.tabs.onActivated.addListener = () => { throw Error(); };
  const reader = v.context.PrivacyMonitorCookieMetadata.create({ api: v.api, store: v.store });
  assert.equal((await reader.readActive()).kind, 'unavailable');
  assert.equal(v.api.permissions.onRemoved.listeners.size, 0);
  assert.doesNotMatch(read('manifest.json'), /cookie-metadata|"cookies"/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).includes('lib/cookie-metadata.js'));
});
