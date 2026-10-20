import assert from 'node:assert/strict';
import test from 'node:test';
import { background, nav, req } from './helpers/background.mjs';
import { popup, deferred } from './helpers/popup.mjs';

const values = [{ name: 'Content-Security-Policy', value: 'private-value' }];
const record = view => view.store.get(1).record;
const headers = view => record(view)?.observations.headers;
function load(view, { tabId = 1, base = 10, url = 'https://fixture.example/', requestId = 'r1',
  responseHeaders = values, statusCode = 200, incognito = false, cookieStoreId = 'firefox-default' } = {}) {
  const request = more => req({ tabId, url, requestId, incognito, cookieStoreId, ...more });
  view.events['navigation.onBeforeNavigate'](nav(tabId, base, url));
  view.events['request.onBeforeRequest'](request({ timeStamp: base + 1 }));
  view.events['request.onHeadersReceived'](request({ timeStamp: base + 2, statusCode, responseHeaders }));
  view.events['navigation.onCommitted']({ ...nav(tabId, base + 3, url), documentId: `doc-${tabId}-${base}` });
  view.events['request.onCompleted'](request({ timeStamp: base + 4 }));
}

test('same-host tabs retain separate committed headers/context without disk writes or raw values', async () => {
  const view = background(); load(view, { incognito: true, cookieStoreId: 'firefox-private' });
  load(view, { tabId: 2, requestId: 'r2', responseHeaders: [], cookieStoreId: 'firefox-container-1' });
  await view.settle();
  assert.equal(headers(view).data.CSP, 'present');
  assert.equal(view.store.get(2).record.observations.headers.data.CSP, 'absent');
  assert.equal(record(view).context.incognito, true);
  assert.equal(view.store.get(2).record.context.cookieStoreId, 'firefox-container-1');
  assert.equal(record(view).documentId, 'doc-1-10');
  assert.doesNotMatch(JSON.stringify(record(view)), /private-value/);
  assert.deepEqual(view.writes, []); assert.deepEqual(view.errors, []);
});

test('headers require both committed URL identity and a completed request', async () => {
  const view = background();
  view.events['navigation.onBeforeNavigate'](nav()); view.events['request.onBeforeRequest'](req());
  view.events['request.onHeadersReceived'](req({ timeStamp: 12, statusCode: 200, responseHeaders: values }));
  await view.settle(); assert.equal(record(view), null);
  view.events['navigation.onCommitted'](nav(1, 13)); await view.settle();
  assert.equal(headers(view).kind, 'not-observed');
  view.events['request.onCompleted'](req({ timeStamp: 14 })); await view.settle();
  assert.equal(headers(view).kind, 'observed');
});

test('same-host and cross-host redirects reuse requestId but never carry earlier response headers', async () => {
  for (const target of ['https://fixture.example/end?secret=two', 'https://other.example/end?secret=two']) {
  const view = background(); const first = 'https://fixture.example/start?secret=one';
  view.events['navigation.onBeforeNavigate'](nav(1, 10, first));
  view.events['request.onBeforeRequest'](req({ url: first }));
  view.events['request.onHeadersReceived'](req({ url: first, timeStamp: 12, statusCode: 302, responseHeaders: values }));
  view.events['request.onBeforeRedirect'](req({ url: first, timeStamp: 13, redirectUrl: target }));
  view.events['request.onBeforeRequest'](req({ url: target, timeStamp: 14 }));
  // Late events from the old hop, even with the same requestId.
  view.events['request.onHeadersReceived'](req({ url: first, timeStamp: 12, statusCode: 200, responseHeaders: values }));
  view.events['request.onHeadersReceived'](req({ url: target, timeStamp: 15, statusCode: 200, responseHeaders: [] }));
  view.events['navigation.onCommitted'](nav(1, 16, target));
  view.events['request.onCompleted'](req({ url: target, timeStamp: 17 })); await view.settle();
  assert.equal(headers(view).data.CSP, 'absent');
  assert.equal(record(view).page.hostname, new URL(target).hostname);
  assert.doesNotMatch(JSON.stringify(record(view)), /secret|start|end/);
  }
});

test('new navigation and same-URL reload reset observations and ignore older request IDs/events', async () => {
  const view = background(); load(view); await view.settle(); const old = record(view).navigationId;
  view.events['navigation.onBeforeNavigate'](nav(1, 30)); assert.equal(record(view), null);
  view.events['request.onBeforeRequest'](req({ timeStamp: 31, requestId: 'r2' }));
  view.events['request.onHeadersReceived'](req({ timeStamp: 32, statusCode: 200, responseHeaders: values }));
  view.events['request.onBeforeRedirect'](req({ timeStamp: 33 }));
  view.events['request.onCompleted'](req({ timeStamp: 34 }));
  view.events['navigation.onCommitted'](nav(1, 35)); await view.settle();
  assert.notEqual(record(view).navigationId, old); assert.equal(headers(view).kind, 'not-observed');
  view.events['request.onHeadersReceived'](req({ timeStamp: 36, requestId: 'r2', statusCode: 200, responseHeaders: [] }));
  view.events['request.onCompleted'](req({ timeStamp: 37, requestId: 'r2' })); await view.settle();
  assert.equal(headers(view).data.CSP, 'absent');
  view.events['navigation.onBeforeNavigate'](nav(1, 10));
  view.events['navigation.onCommitted'](nav(1, 13));
  assert.equal(headers(view).data.CSP, 'absent');
});

test('different path/query on the same host cannot satisfy resource correlation; fragments are ignored', async () => {
  for (const [committed, expected] of [
    ['https://fixture.example/other', 'not-observed'],
    ['https://fixture.example/?query=other', 'not-observed'],
    ['https://fixture.example/#section', 'observed'],
  ]) {
    const view = background();
    view.events['navigation.onBeforeNavigate'](nav()); view.events['request.onBeforeRequest'](req());
    view.events['request.onHeadersReceived'](req({ timeStamp: 12, statusCode: 200, responseHeaders: values }));
    view.events['navigation.onCommitted'](nav(1, 13, committed));
    view.events['request.onCompleted'](req({ timeStamp: 14 })); await view.settle();
    assert.equal(headers(view).kind, expected);
  }
});

test('unsupported navigation, cache restoration without a request, and unpaired commits never reuse success', async () => {
  const view = background(); load(view); await view.settle();
  view.events['navigation.onBeforeNavigate'](nav(1, 20, 'about:config'));
  view.events['navigation.onCommitted'](nav(1, 21, 'about:config')); await view.settle();
  assert.equal(record(view), null);
  view.events['navigation.onBeforeNavigate'](nav(1, 30)); view.events['navigation.onCommitted'](nav(1, 31));
  await view.settle(); assert.equal(headers(view).kind, 'not-observed');
  load(view, { base: 40, requestId: 'r3' }); await view.settle(); assert.equal(headers(view).kind, 'observed');
  view.events['navigation.onCommitted'](nav(1, 50)); await view.settle();
  assert.equal(headers(view).kind, 'not-observed');
});

test('reordered or missed navigation start is conservative; network completion may precede commit', async () => {
  const view = background(); view.events['request.onBeforeRequest'](req());
  view.events['navigation.onBeforeNavigate'](nav());
  view.events['request.onHeadersReceived'](req({ timeStamp: 12, statusCode: 200, responseHeaders: values }));
  view.events['navigation.onCommitted'](nav(1, 13));
  view.events['request.onCompleted'](req({ timeStamp: 14 })); await view.settle();
  assert.equal(headers(view).kind, 'not-observed');
  view.events['navigation.onBeforeNavigate'](nav(1, 20));
  view.events['request.onBeforeRequest'](req({ timeStamp: 21 }));
  view.events['request.onHeadersReceived'](req({ timeStamp: 22, statusCode: 200, responseHeaders: [] }));
  view.events['request.onCompleted'](req({ timeStamp: 23 }));
  view.events['navigation.onCommitted'](nav(1, 24)); await view.settle();
  assert.equal(headers(view).kind, 'observed');
});

test('malformed/missing/304 headers are unavailable; valid names are case-insensitive and allowlisted', async () => {
  for (const options of [{ responseHeaders: null }, { responseHeaders: [null] }, { statusCode: 304 }]) {
    const view = background(); load(view, options); await view.settle(); assert.equal(headers(view).kind, 'unavailable');
  }
  const view = background(); load(view, { responseHeaders: [
    { name: 'CONTENT-SECURITY-POLICY', binaryValue: [] }, { name: '__proto__' }, { name: 'constructor' },
  ] });
  await view.settle(); assert.equal(headers(view).data.CSP, 'present');
});

test('request errors and navigation errors do not expose an old successful header result', async () => {
  const view = background(); view.events['navigation.onBeforeNavigate'](nav());
  view.events['request.onBeforeRequest'](req()); view.events['navigation.onCommitted'](nav(1, 12));
  view.events['request.onErrorOccurred'](req({ timeStamp: 13 }));
  view.events['request.onHeadersReceived'](req({ timeStamp: 14, statusCode: 200, responseHeaders: values }));
  await view.settle(); assert.equal(headers(view).kind, 'unavailable');
  view.events['navigation.onErrorOccurred'](nav(1, 15)); assert.equal(record(view), null);
});

test('tab removal/replacement discards records and late digest callbacks cannot resurrect them', async () => {
  for (const event of ['tabRemoved', 'tabReplaced']) {
    const view = background(); const digest = deferred(); view.controls.digest = () => digest.promise;
    load(view);
    if (event === 'tabRemoved') view.events.tabRemoved(1);
    else view.events.tabReplaced(2, 1);
    digest.resolve(new Uint8Array(32).buffer); await view.settle();
    view.events['request.onHeadersReceived'](req({ timeStamp: 50, statusCode: 200, responseHeaders: values }));
    view.events['navigation.onCommitted'](nav(1, 51)); await view.settle();
    assert.equal(record(view), null);
  }
});

test('old asynchronous correlation cannot attach headers to a newer navigation; state is bounded', async () => {
  const view = background(); const digest = deferred(); view.controls.digest = () => digest.promise;
  load(view); view.events['navigation.onBeforeNavigate'](nav(1, 20));
  view.events['navigation.onCommitted'](nav(1, 21));
  digest.resolve(new Uint8Array(32).buffer); await view.settle();
  assert.equal(headers(view).kind, 'not-observed');
  for (let id = 2; id <= 257; id++) view.events['navigation.onBeforeNavigate'](nav(id, 30));
  assert.equal(record(view), null);
  view.events['navigation.onCommitted'](nav(1, 40)); assert.equal(record(view), null);
});

test('frames, non-tab requests, and events without reliable identity are ignored', () => {
  const view = background();
  for (const overrides of [{ frameId: 2 }, { tabId: -1 }, { timeStamp: NaN }]) {
    view.events['navigation.onBeforeNavigate']({ ...nav(), ...overrides });
    view.events['request.onBeforeRequest'](req(overrides));
    view.events['navigation.onCommitted']({ ...nav(1, 13), ...overrides });
  }
  assert.equal(record(view), null);
});

test('popup never falls back to hostname header storage on missing or failed transport', async () => {
  for (const [read, wording] of [
    [async () => ({ channel: 'privacy-monitor.analysis', version: 1, ok: true, kind: 'not-observed' }), 'Not observed'],
    [async () => { throw new Error('Unavailable'); }, 'Unavailable'],
    [async () => ({ ok: true, version: 2 }), 'Unavailable'],
  ]) {
    const view = popup(); view.controls.analysis = read;
    await view.context.loadAllData();
    assert.match(view.nodes['headers-grid'].innerHTML, new RegExp(`CSP: ${wording}`));
    assert.equal(view.nodes['score-text'].textContent, '—');
    assert.equal(view.nodes['cookie-count'].textContent, '0');
  }
});

test('a delayed header reply cannot overwrite a new unsupported popup load', async () => {
  const view = popup(); const pending = deferred(); const reading = deferred();
  view.controls.analysis = () => { reading.resolve(); return pending.promise; };
  const old = view.context.loadAllData(); await reading.promise;
  view.controls.query = async () => [{ id: 1, url: 'about:config' }]; await view.context.loadAllData();
  pending.resolve({ ok: false }); await old;
  assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'unsupported');
  assert.equal(view.nodes['score-text'].textContent, '—');
});

test('popup rejects headers from a different tab, page, schema, or malformed observation', async () => {
  for (const overrides of [
    { tabId: 2 }, { schemaVersion: 2 },
    { page: { hostname: 'other.example', protocol: 'https:' } },
    { page: { hostname: 'fixture.example', protocol: 'http:' } },
    { observations: { headers: { kind: 'observed', data: { CSP: 'present' } } } },
  ]) {
    const view = popup();
    const validRead = view.controls.analysis;
    view.controls.analysis = async message => {
      const reply = await validRead(message);
      return { ...reply, record: { ...reply.record, ...overrides } };
    };
    await view.context.loadAllData();
    assert.match(view.nodes['headers-grid'].innerHTML, /CSP: Unavailable/);
    assert.equal(view.nodes['score-text'].textContent, '—');
  }
});
