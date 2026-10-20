import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const tab = (id, extra = {}) => ({ id, url: 'https://same.example/private?secret=x#fragment',
  incognito: false, cookieStoreId: 'firefox-default', ...extra });
const identity = record => ({ tabId: record.tabId, navigationId: record.navigationId });
const observed = data => ({ kind: 'observed', data });
const request = (tabId, extra = {}) => ({ channel: 'privacy-monitor.analysis', version: 1, type: 'get', tabId, ...extra });
const sender = { id: 'privacy-monitor@example.com', url: 'moz-extension://fixture/popup.html' };

function fixture(sessionId = 'test-session') {
  const context = vm.createContext({ URL, crypto: webcrypto });
  vm.runInContext(read('analysis-records.js'), context);
  let time = 10;
  const store = context.PrivacyMonitorAnalysis.createStore({ sessionId, now: () => time });
  const handler = context.PrivacyMonitorAnalysis.createMessageHandler({ store,
    extensionId: sender.id, popupUrl: sender.url });
  return { store, handler, tick() { time++; } };
}

test('two tabs on the same hostname keep separate results through the message contract', async () => {
  const { store, handler } = fixture();
  const first = store.begin(tab(1)).record;
  const second = store.begin(tab(2, { cookieStoreId: 'firefox-container-1' })).record;
  assert.notEqual(first.navigationId, second.navigationId);
  assert.equal(first.page.hostname, second.page.hostname);
  store.update(identity(first), 'forms', observed({ insecureForms: 0, insecurePasswordForms: 0 }));
  store.update(identity(second), 'forms', observed({ insecureForms: 2, insecurePasswordForms: 1 }));
  const one = await handler(request(1), sender);
  const two = await handler(request(2), sender);
  assert.equal(one.ok, true); assert.equal(two.ok, true);
  assert.equal(one.record.observations.forms.data.insecureForms, 0);
  assert.equal(two.record.observations.forms.data.insecureForms, 2);
  assert.equal(one.record.context.cookieStoreId, 'firefox-default');
  assert.equal(two.record.context.cookieStoreId, 'firefox-container-1');
});

test('new records are unknown observations, and retain only bounded page/context identity', () => {
  const { store } = fixture();
  const result = store.begin(tab(7, { url: 'https://user:password@same.example/path?token=x#secret',
    title: 'Sensitive title', incognito: true }), { documentId: 'browser-document-id' });
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.record.page), { hostname: 'same.example', protocol: 'https:' });
  assert.equal(result.record.context.incognito, true);
  assert.equal(result.record.documentId, 'browser-document-id');
  for (const section of Object.values(result.record.observations)) {
    assert.deepEqual(plain(section), { kind: 'not-observed', data: null, observedAt: null });
  }
  assert.doesNotMatch(JSON.stringify(result), /password|user|path|token|fragment|secret|Sensitive/);
  const unknown = store.begin({ id: 8, url: 'http://same.example/' }).record;
  assert.equal(unknown.context.incognito, null);
  assert.equal(unknown.context.cookieStoreId, null);
  assert.equal(unknown.documentId, null);
});

test('each explicit navigation replaces evidence and rejects old work even on the same URL', async () => {
  const { store, handler, tick } = fixture();
  const old = store.begin(tab(1)).record;
  store.update(identity(old), 'privacy', observed({ cookies: 1, scripts: 2, thirdPartyScripts: 1 }));
  tick();
  const fresh = store.begin(tab(1)).record;
  assert.notEqual(old.navigationId, fresh.navigationId);
  assert.equal(fresh.createdAt, 11);
  assert.equal(fresh.observations.privacy.kind, 'not-observed');
  assert.equal(store.update(identity(old), 'privacy', observed({ cookies: 9, scripts: 9, thirdPartyScripts: 9 })).error, 'stale-navigation');
  assert.equal((await handler(request(1, { navigationId: old.navigationId }), sender)).error, 'stale-navigation');
  assert.equal(store.get(1).record.navigationId, fresh.navigationId);
});

test('observed zero, unavailable, and not-observed remain distinct; timestamps belong to the store', () => {
  const { store, tick } = fixture(); const record = store.begin(tab(1)).record;
  tick();
  assert.equal(store.update(identity(record), 'forms', observed({ insecureForms: 0, insecurePasswordForms: 0 })).ok, true);
  const read = store.get(1).record;
  assert.equal(read.observations.forms.kind, 'observed'); assert.equal(read.observations.forms.observedAt, 11);
  assert.equal(read.updatedAt, 11); assert.equal(read.observations.headers.kind, 'not-observed');
  store.update(identity(record), 'forms', { kind: 'unavailable', data: null });
  assert.deepEqual(plain(store.get(1).record.observations.forms), { kind: 'unavailable', data: null, observedAt: 11 });
});

test('invalid and sensitive payloads are rejected without changing valid observations', () => {
  const { store } = fixture(); const record = store.begin(tab(1)).record;
  const before = JSON.stringify(store.get(1));
  for (const [section, data] of [
    ['privacy', { cookies: -1, scripts: 0, thirdPartyScripts: 0 }],
    ['privacy', { cookies: 0, scripts: 0, thirdPartyScripts: 1 }],
    ['privacy', { cookies: 0, scripts: 1.5, thirdPartyScripts: 0 }],
    ['forms', { insecureForms: 0, insecurePasswordForms: 1 }],
    ['forms', { insecureForms: 0, insecurePasswordForms: 0, password: 'secret' }],
    ['connection', { protocol: 'https:', httpsOnly: false }],
    ['connection', { protocol: 'http:', httpsOnly: false }],
    ['headers', { CSP: "default-src https://private.example/path" }],
    ['unknown', {}],
  ]) assert.equal(store.update(identity(record), section, observed(data)).error, 'invalid-request');
  assert.equal(store.update(identity(record), 'forms', { kind: 'unavailable', data: {} }).error, 'invalid-request');
  assert.equal(store.update(identity(record), 'forms', { kind: 'not-observed', data: null }).error, 'invalid-request');
  assert.equal(JSON.stringify(store.get(1)), before);
});

test('valid section data is copied on input and output; header presence needs no raw values', () => {
  const { store } = fixture(); const record = store.begin(tab(1)).record;
  const headers = Object.fromEntries(['CSP', 'HSTS', 'X-Frame-Options', 'X-Content-Type-Options',
    'Referrer-Policy', 'Permissions-Policy'].map(name => [name, 'present']));
  assert.equal(store.update(identity(record), 'connection', observed({ protocol: 'https:', httpsOnly: true })).ok, true);
  assert.equal(store.update(identity(record), 'headers', observed(headers)).ok, true);
  headers.CSP = 'absent'; record.context.incognito = true;
  const output = store.get(1).record; output.observations.headers.data.CSP = 'unavailable';
  assert.equal(store.get(1).record.observations.headers.data.CSP, 'present');
  assert.equal(store.get(1).record.context.incognito, false);
});

test('invalid tab/context identities fail; unsupported pages are not analyzed', () => {
  const { store } = fixture();
  for (const value of [null, {}, tab(-1), tab(1.5), tab(1, { url: '' }),
    tab(1, { incognito: 'false' }), tab(1, { cookieStoreId: 'x'.repeat(129) })]) {
    assert.equal(store.begin(value).error, 'invalid-request');
  }
  assert.equal(store.begin(tab(1), { documentId: 123 }).error, 'invalid-request');
  for (const url of ['about:config', 'file:///tmp/test', 'moz-extension://fixture/popup.html']) {
    assert.equal(store.begin(tab(1, { url })).error, 'unsupported-page');
  }
  assert.equal(store.get(1).kind, 'not-observed');
});

test('record count is bounded; removing, clearing, and recreating a tab never reuse navigation IDs', () => {
  const { store } = fixture(); const original = store.begin(tab(1)).record;
  for (let id = 2; id <= 257; id++) assert.equal(store.begin(tab(id)).ok, true);
  assert.equal(store.get(1).kind, 'not-observed'); assert.equal(store.get(2).kind, 'record');
  assert.equal(store.remove(2), true); assert.equal(store.get(2).kind, 'not-observed');
  store.clear(); assert.equal(store.get(257).kind, 'not-observed');
  const replaced = store.begin(tab(1)).record;
  assert.notEqual(replaced.navigationId, original.navigationId);
  assert.equal(store.update(identity(original), 'forms', observed({ insecureForms: 0, insecurePasswordForms: 0 })).error, 'stale-navigation');
  assert.notEqual(fixture('new-session').store.begin(tab(1)).record.navigationId, replaced.navigationId);
});

test('message listener leaves unrelated messages alone and enforces versioned, read-only requests', async () => {
  const { handler } = fixture();
  for (const value of [null, [], {}, { channel: 'other' }]) assert.equal(handler(value, sender), undefined);
  assert.equal((await handler(request(1), sender)).kind, 'not-observed');
  assert.equal((await handler(request(1, { version: 2 }), sender)).error, 'unsupported-version');
  for (const message of [request(-1), request('1'), request(1, { type: 'update' }),
    request(1, { url: 'https://sensitive.example' }), request(1, { navigationId: '' })]) {
    assert.equal((await handler(message, sender)).error, 'invalid-request');
  }
});

test('content scripts, frames, foreign extensions, and missing sender metadata cannot read other tabs', async () => {
  const { store, handler } = fixture(); store.begin(tab(1, { incognito: true }));
  for (const source of [undefined, {}, { ...sender, id: 'other@example.com' },
    { ...sender, url: 'https://same.example/', tab: tab(1), frameId: 0 },
    { ...sender, tab: tab(1), frameId: 2 }, { ...sender, url: sender.url + '?fake' }]) {
    const result = await handler(request(1), source);
    assert.equal(result.error, 'forbidden'); assert.equal(result.record, undefined);
  }
  assert.equal((await handler(request(1), sender)).record.context.incognito, true);
});

test('manifest installs one read-only analysis listener without changing legacy storage or fetching', async () => {
  const listeners = []; const headerEvents = []; const writes = [];
  const context = vm.createContext({ URL, crypto: webcrypto, console,
    fetch: () => assert.fail('D07 must not send requests'),
    browser: {
      runtime: { id: sender.id, getURL: path => 'moz-extension://fixture/' + path,
        onMessage: { addListener: fn => listeners.push(fn) } },
      permissions: { onRemoved: { addListener() {} } },
      webRequest: { onHeadersReceived: { addListener: fn => headerEvents.push(fn) } },
      storage: { local: { set: data => writes.push(data), get: () => assert.fail('No legacy hydration') } },
    },
  });
  for (const path of JSON.parse(read('manifest.json')).background.scripts) vm.runInContext(read(path), context, { filename: path });
  assert.equal(listeners.length, 1); assert.equal(writes.length, 0);
  assert.equal((await listeners[0](request(1), sender)).kind, 'not-observed');
  headerEvents[0]({ type: 'main_frame', url: 'https://same.example/', responseHeaders: [] });
  assert.equal(writes.length, 1);
  assert.ok(writes[0]['headers_same.example']);
  assert.equal((await listeners[0](request(1), sender)).kind, 'not-observed', 'D08 migration is not smuggled into D07');
});
