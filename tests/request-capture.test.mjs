import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const doc = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const nav = (tabId = 1, timeStamp = 10, more = {}) => ({
  tabId, timeStamp, frameId: 0, url: 'https://example.com/private-page?token=secret#fragment', ...more,
});
const request = (more = {}) => ({ tabId: 1, timeStamp: 13, frameId: 0, documentId: doc(1),
  incognito: false, type: 'script', url: 'https://cdn.example.net/private-script?token=secret#fragment', ...more });

function setup({ helper = true, failEvent = null, removalFails = false } = {}) {
  const events = new Map(), registrations = [];
  const event = name => {
    const listeners = new Set(); events.set(name, listeners);
    return {
      addListener(fn, ...args) {
        listeners.add(fn); registrations.push({ name, args, fn });
        if (name === failEvent) throw Error('registration failed');
      },
      removeListener(fn) { if (removalFails) throw Error('removal failed'); listeners.delete(fn); },
    };
  };
  const api = {
    webNavigation: Object.fromEntries(['onBeforeNavigate', 'onCommitted', 'onErrorOccurred'].map(n => [n, event(n)])),
    webRequest: { onBeforeRequest: event('request') },
    tabs: { onRemoved: event('removed'), onReplaced: event('replaced') },
    get storage() { assert.fail('Request metadata must not be persisted'); },
  };
  const context = vm.createContext({ URL,
    fetch() { assert.fail('Collector must not make external requests'); },
    get browser() { assert.fail('No automatic browser access'); },
    get localStorage() { assert.fail('No storage access'); },
    console: { log() { assert.fail('No browsing logs'); }, error() { assert.fail('No browsing logs'); } },
  });
  if (helper) {
    vm.runInContext(read('vendor/tldts/index.umd.min.js'), context);
    vm.runInContext(read('lib/site-domains.js'), context);
  }
  vm.runInContext(read('lib/request-capture.js'), context);
  const module = context.PrivacyMonitorRequests, collector = module.attach(api);
  const emit = (name, ...args) => [...events.get(name)].map(fn => fn(...args));
  return { api, context, module, collector, events, registrations, emit,
    begin(tabId = 1, number = tabId, at = 10) {
      emit('onBeforeNavigate', nav(tabId, at));
      emit('onCommitted', nav(tabId, at + 2, { documentId: doc(number) }));
    },
  };
}

test('D23 explicitly attaches a non-blocking listener with no body/header requests or automatic startup', () => {
  const v = setup();
  const listener = v.registrations.find(r => r.name === 'request');
  assert.deepEqual(plain(listener.args), [{ urls: ['http://*/*', 'https://*/*'] }]);
  assert.equal(v.registrations.length, 6);
  assert.deepEqual(plain(v.collector.get(1)), { kind: 'not-observed' });
  assert.deepEqual(v.emit('request', request()), [undefined]);
});

test('records only canonical domain/type observations with bounded counts, never event secrets', () => {
  const v = setup(); v.begin();
  const event = request({ url: 'https://CDN.Example.NET.:8443/private-script?token=secret#fragment' });
  for (const name of ['requestBody', 'requestHeaders', 'responseHeaders', 'documentUrl', 'originUrl',
    'frameAncestors', 'method', 'requestId', 'cookieStoreId']) {
    Object.defineProperty(event, name, { get() { assert.fail('Must not inspect ' + name); } });
  }
  v.emit('request', event); v.emit('request', event);
  v.emit('request', request({ type: 'image' }));
  const result = plain(v.collector.get(1, doc(1)));
  assert.equal(result.kind, 'observed');
  assert.deepEqual(result.observations, [
    { hostname: 'cdn.example.net', type: 'script', events: 2 },
    { hostname: 'cdn.example.net', type: 'image', events: 1 },
  ]);
  assert.equal(result.coverage, 'top-frame-after-commit');
  assert.doesNotMatch(JSON.stringify(result), /private-|secret|fragment|8443|token|cookie|requestId|https/);
});

test('same-host tabs and normal containers remain isolated by tab/document, never hostname', () => {
  const v = setup(); v.begin(1, 1); v.begin(2, 2);
  v.emit('request', request({ cookieStoreId: 'firefox-container-1' }));
  v.emit('request', request({ tabId: 2, documentId: doc(2), cookieStoreId: 'firefox-container-2', url: 'https://other.example.org/' }));
  assert.equal(v.collector.get(1).observations[0].hostname, 'cdn.example.net');
  assert.equal(v.collector.get(2).observations[0].hostname, 'other.example.org');
  assert.equal(v.collector.get(1, doc(2)).reason, 'stale-document');
});

test('navigation immediately clears old evidence and late previous-document requests cannot repopulate it', () => {
  const v = setup(); v.begin(); v.emit('request', request());
  v.emit('onBeforeNavigate', nav(1, 20));
  assert.equal(v.collector.get(1).reason, 'awaiting-commit');
  v.emit('request', request({ timeStamp: 21 }));
  v.emit('onCommitted', nav(1, 22, { documentId: doc(2) }));
  v.emit('request', request({ timeStamp: 30 })); // Same URL/tab, but previous document UUID.
  v.emit('request', request({ documentId: doc(2), timeStamp: 21 })); // Old timestamp.
  assert.equal(v.collector.get(1).kind, 'not-observed');
  v.emit('request', request({ documentId: doc(2), timeStamp: 31 }));
  assert.equal(v.collector.get(1, doc(2)).observations[0].events, 1);
  assert.equal(v.collector.get(1, doc(1)).reason, 'stale-document');
});

test('redirect navigation commits final document; early/main-frame/iframe/worker traffic is outside coverage', () => {
  const v = setup();
  v.emit('onBeforeNavigate', nav(1, 10, { url: 'https://initial.example.org/' }));
  v.emit('request', request({ type: 'main_frame', timeStamp: 11 }));
  v.emit('request', request({ timeStamp: 11 })); // Before commit.
  v.emit('onCommitted', nav(1, 12, { url: 'https://final.example.org/', documentId: doc(1) }));
  for (const extra of [{ type: 'main_frame' }, { type: 'sub_frame' }, { frameId: 2 }, { frameId: -1 }, { tabId: -1 }]) {
    v.emit('request', request(extra));
  }
  assert.equal(v.collector.get(1).kind, 'not-observed');
  v.emit('request', request({ type: 'xmlhttprequest' }));
  assert.equal(v.collector.get(1).observations[0].type, 'xmlhttprequest');
});

test('missing document IDs fail closed for Firefox versions without them; no hostname fallback', () => {
  const v = setup();
  v.emit('onBeforeNavigate', nav());
  v.emit('onCommitted', nav(1, 12));
  v.emit('request', request());
  assert.equal(v.collector.get(1).reason, 'document-identity-unavailable');
  v.begin(1, 2, 20);
  v.emit('request', request({ documentId: undefined, timeStamp: 23 }));
  assert.equal(v.collector.get(1).reason, 'document-identity-unavailable');
  v.emit('request', request({ documentId: doc(2), timeStamp: 24 }));
  assert.equal(v.collector.get(1).kind, 'unavailable'); // Needs a fresh navigation.
});

test('private and unknown context clears metadata before reading a request URL', () => {
  for (const incognito of [true, undefined, null, 'false']) {
    const v = setup(); v.begin(); v.emit('request', request());
    const event = request({ incognito });
    Object.defineProperty(event, 'url', { get() { assert.fail('No private URL inspection'); } });
    v.emit('request', event);
    assert.deepEqual(plain(v.collector.get(1)), { kind: 'unavailable', reason: 'private-or-unknown-context' });
    v.emit('request', request());
    assert.equal(v.collector.get(1).kind, 'unavailable');
  }
});

test('unsupported/error navigation and tab removal/replacement release all previous observations', () => {
  for (const end of [
    v => { v.emit('onBeforeNavigate', nav(1, 20)); v.emit('onCommitted', nav(1, 22, { url: 'about:blank', documentId: doc(2) })); },
    v => v.emit('onErrorOccurred', nav(1, 20)),
    v => v.emit('removed', 1),
    v => v.emit('replaced', 1, 2),
    v => v.emit('replaced', 2, 1),
  ]) {
    const v = setup(); v.begin(); v.emit('request', request()); end(v);
    v.emit('request', request({ timeStamp: 25 }));
    assert.equal('observations' in v.collector.get(1), false);
  }
  const v = setup(); v.begin(); v.emit('removed', 1);
  v.emit('onCommitted', nav(1, 20, { documentId: doc(1) }));
  assert.equal(v.collector.get(1).kind, 'not-observed'); // No paired start.
});

test('stale navigation events cannot clear current evidence; later unpaired commit resets it', () => {
  const v = setup(); v.begin(1, 1, 20); v.emit('request', request({ timeStamp: 23 }));
  v.emit('onBeforeNavigate', nav(1, 10));
  v.emit('onCommitted', nav(1, 12, { documentId: doc(2) }));
  v.emit('onErrorOccurred', nav(1, 15));
  v.emit('onCommitted', nav(1, 22, { documentId: doc(1) })); // Duplicate.
  v.emit('onBeforeNavigate', nav(1, 24, { frameId: 2 }));
  assert.equal(v.collector.get(1).observations[0].events, 1);
  v.emit('onCommitted', nav(1, 30, { documentId: doc(2) }));
  assert.equal(v.collector.get(1).kind, 'not-observed');
});

test('unsupported/malformed URL input is omitted; valid IDN, local and IP hosts preserve hostname only', () => {
  const v = setup(); v.begin();
  for (const url of ['about:blank', 'file:///tmp/a', 'data:text/plain,private', 'wss://example.com/',
    'https://user:secret@example.com/', '//example.com/', 'https://example.com/' + 'x'.repeat(8192)]) {
    v.emit('request', request({ url }));
  }
  assert.equal(v.collector.get(1).kind, 'not-observed');
  for (const url of ['https://bücher.de/path', 'http://127.1:4180/path', 'http://localhost/a', 'http://[::1]/b']) {
    v.emit('request', request({ url, type: 'unknown-future-type' }));
  }
  assert.deepEqual(plain(v.collector.get(1).observations).map(o => o.hostname),
    ['xn--bcher-kva.de', '127.0.0.1', 'localhost', '[::1]']);
  assert.ok(v.collector.get(1).observations.every(o => o.type === 'other'));
});

test('per-navigation pair cap reports truncation and continues updating existing aggregates', () => {
  const v = setup(); v.begin(); const cap = v.module.LIMITS.pairsPerNavigation;
  for (let i = 0; i < cap + 10; i++) v.emit('request', request({ url: 'https://h' + i + '.example.com/' }));
  const full = v.collector.get(1);
  assert.equal(full.observations.length, cap); assert.equal(full.truncated, true);
  v.emit('request', request({ url: 'https://h0.example.com/another?secret=yes' }));
  assert.equal(v.collector.get(1).observations[0].events, 2);
  v.begin(1, 2, 20);
  assert.equal(v.collector.get(1).truncated, false);
});

test('event counts saturate at the documented bound without wrapping or pretending to be exact', () => {
  const v = setup(); v.begin(); const cap = v.module.LIMITS.eventsPerPair, event = request();
  for (let i = 0; i < cap; i++) v.emit('request', event);
  assert.equal(v.collector.get(1).observations[0].events, cap);
  assert.equal(v.collector.get(1).counterSaturated, false);
  v.emit('request', event);
  assert.equal(v.collector.get(1).observations[0].events, cap);
  assert.equal(v.collector.get(1).counterSaturated, true);
});

test('global tab cap evicts oldest navigation without reads or requests reviving it', () => {
  const v = setup(), cap = v.module.LIMITS.tabs;
  for (let tab = 1; tab <= cap; tab++) v.begin(tab, tab);
  v.emit('request', request()); v.collector.get(1);
  v.begin(cap + 1, cap + 1);
  v.emit('request', request());
  assert.deepEqual(plain(v.collector.get(1)), { kind: 'not-observed' });
  assert.equal(v.collector.get(cap + 1).documentId, doc(cap + 1));
});

test('caller mutations cannot change stored evidence and stop clears/unregisters listeners idempotently', () => {
  const v = setup(); v.begin(); v.emit('request', request());
  const copy = v.collector.get(1); copy.observations[0].hostname = 'tampered'; copy.observations.length = 0;
  assert.equal(v.collector.get(1).observations[0].hostname, 'cdn.example.net');
  v.collector.stop(); v.collector.stop();
  assert.ok([...v.events.values()].every(set => set.size === 0));
  v.begin(); v.emit('request', request());
  assert.deepEqual(plain(v.collector.get(1)), { kind: 'unavailable', reason: 'stopped' });
});

test('missing/failed dependencies and partial listener registration cannot leave active capture', () => {
  assert.equal(setup({ helper: false }).collector.get(1).reason, 'domain-helper-unavailable');
  const broken = setup(); broken.begin(); broken.context.tldts.parse = () => { throw Error('failed parser'); };
  broken.emit('request', request());
  assert.equal(broken.collector.get(1).reason, 'domain-helper-unavailable');
  const v = setup({ failEvent: 'request', removalFails: true });
  v.begin(); v.emit('request', request());
  assert.equal(v.collector.get(1).reason, 'listener-unavailable');
  v.collector.stop(); v.begin(); v.emit('request', request());
  assert.equal(v.collector.get(1).reason, 'stopped');
});

test('invalid event identities do not allocate records and D23 is excluded from the shipping manifest', () => {
  const v = setup();
  for (const extra of [{ tabId: -1 }, { tabId: NaN }, { frameId: 1 }, { timeStamp: Infinity }]) {
    v.emit('onBeforeNavigate', nav(1, 10, extra));
  }
  assert.deepEqual(plain(v.collector.get(1)), { kind: 'not-observed' });
  assert.equal(v.collector.get(-1).kind, 'invalid');
  assert.equal(v.collector.get(1, 'not-a-document-uuid').kind, 'invalid');
  assert.doesNotMatch(read('manifest.json'), /request-capture/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).includes('lib/request-capture.js'));
});
