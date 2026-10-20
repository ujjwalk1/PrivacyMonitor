import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { background, nav, req } from './helpers/background.mjs';
import test from 'node:test';

const source = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

test('manifest background scripts initialize without fetching or persisting breach data', async () => {
  const view = background();
  assert.equal(typeof view.context.PrivacyMonitorBreachService.lookup, 'function');
  assert.equal((await view.context.PrivacyMonitorBreachService.lookup('fixture.example')).kind, 'disabled');
  assert.equal(view.writes.length, 0);
});

test('background registers header monitoring and ignores subresources', () => {
  const view = background();
  assert.deepEqual(plain(view.registrations['request.onHeadersReceived']),
    [{ urls: ['<all_urls>'], types: ['main_frame'] }, ['responseHeaders']]);
  view.events['request.onHeadersReceived'](req({ type: 'script', responseHeaders: [] }));
  assert.equal(view.store.get(1).kind, 'not-observed'); assert.equal(view.writes.length, 0);
});

test('committed main-frame headers reach the transient per-tab record', async () => {
  const view = background();
  view.events['navigation.onBeforeNavigate'](nav());
  view.events['request.onBeforeRequest'](req());
  view.events['request.onHeadersReceived'](req({ timeStamp: 12, statusCode: 200,
    responseHeaders: [{ name: 'Content-Security-Policy', value: "default-src 'self'" }] }));
  view.events['navigation.onCommitted'](nav(1, 13));
  view.events['request.onCompleted'](req({ timeStamp: 14 }));
  await view.settle();
  const headers = view.store.get(1).record.observations.headers;
  assert.equal(headers.kind, 'observed'); assert.equal(headers.data.CSP, 'present');
  assert.equal(headers.data.HSTS, 'absent'); assert.equal(view.writes.length, 0);
});

test('content script waits for the document and initializes once on an empty fixture', () => {
  const events = [];
  const writes = [];
  const observations = [];
  const document = {
    readyState: 'loading', body: {}, cookie: '',
    addEventListener: (...args) => events.push(args),
    querySelectorAll: () => [],
  };
  vm.runInNewContext(source('content-script.js'), {
    document, URL, console, setTimeout, clearTimeout,
    window: { location: new URL('https://fixture.example/') },
    browser: { storage: { local: { set: value => writes.push(plain(value)) } } },
    MutationObserver: class { observe(...args) { observations.push(args); } },
  });
  assert.equal(writes.length, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'DOMContentLoaded');
  events[0][1]();
  events[0][1]();
  assert.equal(writes.length, 2, 'Duplicate initialization must not rescan');
  assert.equal(writes[0]['security_data_fixture.example'].httpsOnly, true);
  assert.equal(writes[1]['forms_fixture.example'].insecureForms, 0);
  assert.equal(observations.length, 1);
  assert.equal(observations[0][0], document.body);
});

test('popup registers its document-ready entry point without a premature lookup', () => {
  const events = [];
  vm.runInNewContext(source('popup.js'), {
    browser: {},
    document: { addEventListener: (...args) => events.push(args) },
    fetch: () => assert.fail('No external request before document ready'),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'DOMContentLoaded');
  assert.equal(typeof events[0][1], 'function');
});
