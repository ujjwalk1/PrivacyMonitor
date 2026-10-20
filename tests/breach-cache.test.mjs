import assert from 'node:assert/strict';
import test from 'node:test';
import { popup, consentedPopup, deferred } from './helpers/popup.mjs';

const empty = () => ({ ok: true, json: async () => [] });
const record = { Name: 'Fixture', BreachDate: '2000-01-01', PwnCount: 2, DataClasses: ['Email'] };
const limited = value => ({ ok: false, status: 429, headers: { get: name => {
  assert.equal(name, 'Retry-After'); return value;
} } });
// Cache tests exercise explicitly normal contexts; private/unknown contexts have separate tests.
const service = view => ({
  lookup: hostname => view.background.PrivacyMonitorBreachService.lookup(hostname, { incognito: false }),
  clear: () => view.background.PrivacyMonitorBreachService.clear(),
});
const state = view => view.nodes['breach-section'].attributes['data-state'];
const flush = () => new Promise(resolve => setImmediate(resolve));

test('new popup contexts share fresh empty/record results; expiry is fixed, not extended by reads', async () => {
  for (const records of [[], [record]]) {
    const first = consentedPopup(); first.controls.fetch = async (_url, options) => {
      assert.equal(options.cache, 'no-store'); return { ok: true, json: async () => records };
    };
    await first.context.loadAllData();
    const second = popup(undefined, { consented: true, background: first.background });
    first.advanceTime(599999);
    await second.context.loadAllData();
    assert.equal(first.calls.fetch, 1); assert.equal(second.calls.fetch, 0);
    assert.equal(state(second), records.length ? 'results' : 'empty');
    assert.match(second.nodes['breach-cache-note'].textContent, /Reused a result/);
    assert.equal(second.nodes['score-text'].textContent, '100');
    first.advanceTime(1); await second.context.loadAllData();
    assert.equal(first.calls.fetch, 2, 'Expires exactly ten minutes after success');
    assert.match(second.nodes['breach-cache-note'].textContent, /Checked with/);
    assert.equal(first.timers.length, 0, 'No scheduled retry or cache timer');
  }
});

test('cache holds 32 hostnames with least-recently-used eviction and bounded entry size', async () => {
  const view = consentedPopup(); view.controls.fetch = async () => empty(); const lookup = service(view).lookup;
  for (let i = 0; i < 32; i++) await lookup(`site${i}.example`);
  assert.equal((await lookup('site0.example')).cached, true);
  await lookup('site32.example');
  assert.equal((await lookup('site0.example')).cached, true);
  assert.equal((await lookup('site1.example')).cached, false, 'Oldest unread host was evicted');
  assert.equal(view.calls.fetch, 34);
  view.controls.fetch = async () => ({ ok: true, json: async () => [{ ...record, Name: 'x'.repeat(33000) }] });
  assert.equal((await lookup('large.example')).kind, 'results');
  assert.equal((await lookup('large.example')).cached, false, 'Large successes display but are not retained');
  assert.equal(view.calls.fetch, 36);
});

test('retained records omit unused service fields and callers cannot corrupt later cache hits', async () => {
  const view = consentedPopup(); view.controls.fetch = async () => ({ ok: true,
    json: async () => [{ ...record, Description: 'Unused data', extra: 'Never cache this' }] });
  const lookup = service(view).lookup;
  const first = await lookup('fixture.example');
  assert.equal(first.breaches[0].Description, undefined); assert.equal(first.breaches[0].extra, undefined);
  first.breaches[0].Name = 'Mutated';
  const cached = await lookup('fixture.example'); assert.equal(cached.breaches[0].Name, 'Fixture');
  cached.breaches[0].DataClasses.push('Changed');
  assert.equal((await lookup('fixture.example')).breaches[0].DataClasses.length, 1);
});

test('concurrent popup lookups join one request and distinct pending requests are capped at four', async () => {
  const view = consentedPopup(); const response = deferred(); view.controls.fetch = () => response.promise;
  const one = view.context.loadAllData(); await view.requested;
  const second = popup(undefined, { consented: true, background: view.background });
  const two = second.context.loadAllData(); await flush();
  assert.equal(view.calls.fetch, 1);
  const requests = ['two.example', 'three.example', 'four.example'].map(service(view).lookup);
  await flush();
  assert.equal((await service(view).lookup('five.example')).kind, 'busy');
  assert.equal(view.calls.fetch, 4);
  response.resolve(empty()); await Promise.all([one, two, ...requests]);
  assert.equal(state(view), 'empty'); assert.equal(state(second), 'empty');
  assert.equal(view.timers.length, 0);
});

test('HTTP/network/malformed failures are not cached, and failed expiry never falls back to clean evidence', async () => {
  const failures = [
    [async () => ({ ok: false, status: 404 }), 'http-error'],
    [async () => { throw new Error('Offline'); }, 'network-error'],
    [async () => ({ ok: true, json: async () => ({}) }), 'malformed'],
  ];
  for (const [fetch, kind] of failures) {
    const view = consentedPopup(); view.controls.fetch = async () => empty();
    await view.context.loadAllData(); view.advanceTime(600000);
    view.controls.fetch = fetch; await view.context.loadAllData(); await view.context.loadAllData();
    assert.equal(state(view), kind); assert.equal(view.calls.fetch, 3);
    assert.equal(view.nodes['breach-none'].style.display, 'none');
    assert.equal(view.nodes['breach-cache-note'].style.display, 'none');
  }
});

test('timed-out or revoked work cannot populate the cache when its body finishes late', async () => {
  for (const revoke of [false, true]) {
    const view = consentedPopup(); const body = deferred(); const reading = deferred();
    view.controls.fetch = async () => ({ ok: true, json: () => { reading.resolve(); return body.promise; } });
    const lookup = service(view).lookup('fixture.example'); await reading.promise;
    if (revoke) { view.permissions.data_collection = []; view.emitPermission('removed'); }
    else view.advanceTime(8000);
    assert.equal((await lookup).kind, revoke ? 'cancelled' : 'timeout');
    body.resolve([]); await flush();
    view.permissions.data_collection = ['browsingActivity']; view.controls.fetch = async () => empty();
    assert.equal((await service(view).lookup('fixture.example')).cached, false);
    assert.equal(view.calls.fetch, 2);
  }
});

test('rate-limit cooldown is shared across popups/hosts, respects seconds and dates, and never retries itself', async () => {
  for (const header of ['120', 'Thu, 01 Jan 1970 00:02:00 GMT']) {
    const first = consentedPopup(); first.controls.fetch = async () => limited(header);
    await first.context.loadAllData();
    assert.equal(state(first), 'rate-limited');
    assert.match(first.nodes['breach-error'].textContent, /120 seconds.*No automatic retry/);
    assert.equal(first.nodes['score-text'].textContent, '100');
    const second = popup(undefined, { consented: true, background: first.background });
    await second.context.loadAllData();
    assert.equal((await service(first).lookup('other.example')).kind, 'rate-limited');
    assert.equal(first.calls.fetch, 1);
    first.advanceTime(119999); await second.context.loadAllData(); assert.equal(first.calls.fetch, 1);
    first.advanceTime(1); await flush(); assert.equal(first.calls.fetch, 1);
    first.controls.fetch = async () => empty(); await second.context.loadAllData();
    assert.equal(state(second), 'empty'); assert.equal(first.calls.fetch, 2);
  }
});

test('missing/invalid retry headers back off exponentially to 15 minutes; a success resets fallback', async () => {
  for (const header of [null, '', '-1', '1.5', 'nonsense']) {
    const view = consentedPopup(); view.controls.fetch = async () => limited(header);
    let now = 0;
    for (const seconds of [60, 120, 240, 480, 900, 900]) {
      const result = await service(view).lookup('fixture.example');
      assert.equal(result.retryAt - now, seconds * 1000);
      view.advanceTime(seconds * 1000); now += seconds * 1000;
    }
    view.controls.fetch = async () => empty(); await service(view).lookup('success.example');
    view.controls.fetch = async () => limited(header);
    assert.equal((await service(view).lookup('fixture.example')).retryAt - now, 60000);
  }
});

test('server retry hints are not shortened; zero/past hints have a one-second floor', async () => {
  for (const [header, delay] of [['3600', 3600000], ['0', 1000], ['Thu, 01 Jan 1970 00:00:00 GMT', 1000]]) {
    const view = consentedPopup(); view.controls.fetch = async () => limited(header);
    assert.equal((await service(view).lookup('fixture.example')).retryAt, delay);
  }
});

test('fresh cache remains usable during cooldown; clearing consent does not bypass backoff', async () => {
  const view = consentedPopup(); view.controls.fetch = async () => empty();
  await service(view).lookup('cached.example');
  view.controls.fetch = async () => limited('120'); await service(view).lookup('limited.example');
  assert.equal((await service(view).lookup('cached.example')).cached, true);
  view.permissions.data_collection = []; view.emitPermission('removed');
  assert.equal((await service(view).lookup('cached.example')).kind, 'disabled');
  view.permissions.data_collection = ['browsingActivity'];
  assert.equal((await service(view).lookup('cached.example')).kind, 'rate-limited');
  assert.equal(view.calls.fetch, 2);
});

test('background rechecks consent on cache hits, rejects sensitive URLs, and starts empty after restart', async () => {
  const view = consentedPopup(); view.controls.fetch = async () => empty();
  await service(view).lookup('fixture.example');
  view.permissions.data_collection = [];
  assert.equal((await service(view).lookup('fixture.example')).kind, 'disabled');
  view.permissions.data_collection = ['browsingActivity'];
  assert.equal((await service(view).lookup('fixture.example')).cached, false);
  for (const value of ['fixture.example/private?secret=x', 'https://fixture.example', 'user@fixture.example', 'fixture.example:443']) {
    assert.equal((await service(view).lookup(value)).kind, 'unavailable');
  }
  assert.equal(view.calls.fetch, 2);
  const restarted = consentedPopup(); restarted.controls.fetch = async () => empty();
  assert.equal((await service(restarted).lookup('fixture.example')).cached, false);
  assert.equal(restarted.calls.fetch, 1);
});

test('missing/rejected background access shows unavailable while keeping local results', async () => {
  for (const get of [async () => null, async () => { throw new Error('Unavailable'); }]) {
    const view = consentedPopup(); view.context.browser.runtime.getBackgroundPage = get;
    await view.context.loadAllData(); assert.equal(state(view), 'unavailable');
    assert.equal(view.nodes['score-text'].textContent, '100'); assert.equal(view.calls.fetch, 0);
  }
});

test('cancellation by another popup settles the waiting UI instead of leaving a spinner', async () => {
  const view = consentedPopup();
  const loading = view.context.loadAllData(); await view.requested;
  service(view).clear(); await loading;
  assert.equal(state(view), 'cancelled');
  assert.equal(view.nodes['breach-loading'].style.display, 'none');
  assert.equal(view.nodes['score-text'].textContent, '100');
});
