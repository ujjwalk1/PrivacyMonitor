import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function background() {
  const registrations = [];
  const writes = [];
  vm.runInNewContext(source('background.js'), {
    URL, console,
    browser: {
      webRequest: { onHeadersReceived: { addListener: (...args) => registrations.push(args) } },
      storage: { local: { set: value => writes.push(plain(value)) } },
    },
  });
  assert.equal(registrations.length, 1);
  const [listener, filter, options] = registrations[0];
  assert.deepEqual(plain(filter), { urls: ['<all_urls>'] });
  assert.deepEqual(plain(options), ['responseHeaders']);
  return { listener, writes };
}

test('background registers header monitoring and ignores subresources', () => {
  const { listener, writes } = background();
  listener({ type: 'script', url: 'https://fixture.example/app.js', responseHeaders: [] });
  assert.equal(writes.length, 0);
});

test('main-frame header observation reaches extension storage', () => {
  const { listener, writes } = background();
  listener({
    type: 'main_frame', url: 'https://fixture.example/',
    responseHeaders: [{ name: 'Content-Security-Policy', value: "default-src 'self'" }],
  });
  assert.equal(writes.length, 1);
  const record = writes[0]['headers_fixture.example'];
  assert.deepEqual(record.present, { CSP: "default-src 'self'" });
  assert.ok(record.missing.includes('HSTS'));
  assert.ok(!record.missing.includes('CSP'));
  assert.equal(typeof record.timestamp, 'number');
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
