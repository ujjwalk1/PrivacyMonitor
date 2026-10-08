import assert from 'node:assert/strict';
import test from 'node:test';
import { popup, deferred } from './helpers/popup.mjs';

const record = { Name: 'Historical fixture', BreachDate: '2000-01-01', PwnCount: 1000, DataClasses: ['Email addresses'] };
const response = value => ({ ok: true, json: async () => value });
const state = view => view.nodes['breach-section'].attributes['data-state'];
const flush = () => new Promise(resolve => setImmediate(resolve));

function checkFinal(view, expected) {
  assert.equal(state(view), expected);
  assert.equal(view.nodes['breach-loading'].style.display, 'none');
  assert.equal(view.nodes['score-text'].textContent, '100');
  assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'ready');
  assert.equal(view.nodes['refresh'].disabled, false);
  assert.equal(view.timers.length, 0, 'Settled requests must remove their deadline');
  assert.deepEqual(view.errors, []);
  if (expected !== 'empty' && expected !== 'results') {
    assert.equal(view.nodes['breach-error'].style.display, 'block');
    assert.match(view.nodes['breach-error'].textContent, /No conclusion can be drawn/);
    assert.equal(view.nodes['breach-none'].style.display, 'none');
    assert.equal(view.nodes['breach-list'].style.display, 'none');
    assert.equal(view.nodes['breach-list'].innerHTML, '');
  }
}

test('successful empty and populated responses have distinct states without changing the score', async () => {
  for (const [value, expected] of [[[], 'empty'], [[record], 'results']]) {
    const view = popup();
    let signal;
    view.controls.fetch = async (url, options) => {
      assert.equal(url, 'https://haveibeenpwned.com/api/v3/breaches?domain=fixture.example');
      signal = options.signal;
      return response(value);
    };
    await view.context.loadAllData();
    checkFinal(view, expected);
    assert.equal(view.nodes['breach-error'].style.display, 'none');
    assert.equal(view.nodes['breach-none'].style.display, expected === 'empty' ? 'flex' : 'none');
    assert.equal(view.nodes['breach-list'].style.display, expected === 'results' ? 'flex' : 'none');
    if (expected === 'results') assert.match(view.nodes['breach-list'].innerHTML, /Historical fixture/);
    view.advanceTime(8000);
    assert.equal(signal.aborted, false, 'A completed request must not be aborted later');
  }
});

test('HTTP errors, including 404 and rate limiting, never become empty successes', async () => {
  for (const status of [401, 403, 404, 429, 500, 503]) {
    const view = popup();
    view.controls.fetch = async () => ({ ok: false, status, json: () => assert.fail('Do not parse an HTTP error body') });
    await view.context.loadAllData();
    checkFinal(view, 'http-error');
    assert.match(view.nodes['breach-error'].textContent, new RegExp(`HTTP ${status}`));
    assert.equal(view.calls.fetch, 1, 'D04 does not introduce automatic retries');
  }
});

test('invalid JSON and malformed records produce an explicit malformed response', async () => {
  const values = [null, {}, '[]', [null], [{ ...record, Name: ' ' }],
    [{ ...record, BreachDate: 'invalid' }], [{ ...record, BreachDate: '2026-02-30' }],
    [{ ...record, BreachDate: '01/01/2000' }], [{ ...record, PwnCount: -1 }],
    [{ ...record, PwnCount: '1000' }], [{ ...record, DataClasses: 'Email' }],
    [{ ...record, DataClasses: [null] }], [record, {}]];
  const responses = [...values.map(value => response(value)),
    { ok: true, json: async () => { throw new SyntaxError('Synthetic invalid JSON'); } }];
  for (const result of responses) {
    const view = popup();
    view.controls.fetch = async () => result;
    await view.context.loadAllData();
    checkFinal(view, 'malformed');
    assert.match(view.nodes['breach-error'].textContent, /unreadable or unexpected response/);
  }
});

test('fetch rejection and interrupted body reads are network errors, not malformed or empty results', async () => {
  for (const fetch of [
    async () => { throw new TypeError('Synthetic network failure'); },
    async () => ({ ok: true, json: async () => { throw new TypeError('Synthetic body interruption'); } }),
  ]) {
    const view = popup(); view.controls.fetch = fetch;
    await view.context.loadAllData();
    checkFinal(view, 'network-error');
    assert.match(view.nodes['breach-error'].textContent, /could not reach the service or finish reading/);
  }
});

test('an eight-second deadline aborts stalled fetches and wins over abort rejection', async () => {
  for (const honorsAbort of [true, false]) {
    const view = popup(); const pending = deferred(); let signal;
    view.controls.fetch = (url, options) => {
      signal = options.signal;
      if (honorsAbort) signal.addEventListener('abort', () => pending.reject(new Error('Synthetic abort')), { once: true });
      return pending.promise;
    };
    const loading = view.context.loadAllData(); await view.requested;
    assert.equal(state(view), 'loading');
    assert.equal(view.nodes['score-text'].textContent, '100', 'Local results are available during the lookup');
    view.advanceTime(7999); await flush();
    assert.equal(signal.aborted, false);
    assert.equal(state(view), 'loading');
    view.advanceTime(1); await loading;
    assert.equal(signal.aborted, true);
    checkFinal(view, 'timeout');
    assert.match(view.nodes['breach-error'].textContent, /timed out after 8 seconds/);
    if (!honorsAbort) { pending.resolve(response([])); await flush(); checkFinal(view, 'timeout'); }
  }
});

test('the same deadline covers a stalled body and ignores late body success or rejection', async () => {
  for (const lateFailure of [false, true]) {
    const view = popup(); const body = deferred(); const reading = deferred(); let signal;
    view.controls.fetch = async (url, options) => {
      signal = options.signal;
      return { ok: true, json() { reading.resolve(); return body.promise; } };
    };
    const loading = view.context.loadAllData(); await reading.promise;
    view.advanceTime(8000); await loading;
    assert.equal(signal.aborted, true);
    checkFinal(view, 'timeout');
    if (lateFailure) body.reject(new SyntaxError('Late malformed body'));
    else body.resolve([record]);
    await flush(); checkFinal(view, 'timeout');
  }
});

test('a superseded request timing out cannot overwrite a newer successful load', async () => {
  const view = popup(); const old = deferred();
  view.controls.fetch = () => old.promise;
  const oldLoad = view.context.loadAllData(); await view.requested;
  view.controls.fetch = async () => response([]);
  await view.context.loadAllData();
  assert.equal(state(view), 'empty');
  assert.equal(view.timers.length, 1, 'Only the older pending request still has a deadline');
  view.advanceTime(8000); await oldLoad;
  checkFinal(view, 'empty');
  old.reject(new TypeError('Late old request failure')); await flush();
  checkFinal(view, 'empty');
});

test('a new load clears a timeout message and can successfully show records', async () => {
  const view = popup();
  const firstLoad = view.context.loadAllData(); await view.requested;
  view.advanceTime(8000); await firstLoad;
  checkFinal(view, 'timeout');
  const next = deferred(); view.controls.fetch = () => next.promise;
  const retry = view.context.loadAllData(); await flush();
  assert.equal(state(view), 'loading');
  assert.equal(view.nodes['breach-error'].style.display, 'none');
  next.resolve(response([record])); await retry;
  checkFinal(view, 'results');
});

test('valid records keep sorting, escaping, optional fields, and the three-record display limit', async () => {
  const view = popup();
  view.controls.fetch = async () => response([
    { Name: 'Oldest', BreachDate: '1999-01-01' },
    { Name: '<Newest>', BreachDate: '2024-02-29', DataClasses: ['<script>', 'Passwords'] },
    { ...record, Name: 'Middle' },
    { Name: 'Older', BreachDate: '1999-02-01' },
  ]);
  await view.context.loadAllData(); checkFinal(view, 'results');
  const html = view.nodes['breach-list'].innerHTML;
  assert.equal([...html.matchAll(/class="breach-item"/g)].length, 3);
  assert.ok(html.indexOf('&lt;Newest&gt;') < html.indexOf('Middle'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Account count unavailable/);
  assert.match(html, /\+ 1 more breach/);
  assert.doesNotMatch(html, /Oldest|<script>/);
});
