import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { popup, deferred } from './helpers/popup.mjs';

const mapper = vm.runInNewContext(readFileSync(new URL('../popup-state.js', import.meta.url), 'utf8') +
  '\nPrivacyMonitorPopupState;', { URL });
const state = view => view.nodes['loading-screen'].attributes['data-state'];
const settle = view => view.finishFetch({ ok: true, json: async () => [] });

test('page mapping separates unsupported schemes from an inaccessible tab URL', () => {
  for (const url of ['about:config', 'about:blank', 'file:///fixture.html', 'moz-extension://id/page.html', 'data:text/html,fixture', 'ftp://fixture.example/']) {
    assert.equal(mapper.page({ url }).kind, 'unsupported');
  }
  for (const tab of [undefined, {}, { url: '' }, { url: 'invalid-url' }]) {
    assert.equal(mapper.page(tab).kind, 'unavailable');
  }
  assert.equal(mapper.page({ url: 'https://fixture.example/private?secret=not-for-display' }).hostname, 'fixture.example');
  assert.equal(mapper.page({ url: 'http://localhost/' }).kind, 'supported');
});

test('missing and invalid observations remain distinct from observed zero/absence', () => {
  const missing = mapper.local({});
  assert.equal(missing.kind, 'incomplete');
  assert.equal(missing.forms.kind, 'not-observed');
  assert.equal(missing.cookies.kind, 'not-observed');
  assert.ok(missing.headers.every(header => header.kind === 'not-observed'));
  for (const formData of [{}, { insecureForms: 0 }]) {
    assert.equal(mapper.local({ formData }).forms.kind, 'not-observed');
  }
  for (const formData of [false, [], { insecureForms: -1, insecurePasswordForms: 0 },
    { insecureForms: 0, insecurePasswordForms: 1 }, { insecureForms: '0', insecurePasswordForms: 0 }]) {
    assert.equal(mapper.local({ formData }).forms.kind, 'unavailable');
  }
  const observed = mapper.local({ basicData: { cookies: 0 }, formData: { insecureForms: 0, insecurePasswordForms: 0 },
    headerData: { present: {}, missing: ['CSP'] } });
  assert.equal(observed.cookies.value, 0);
  assert.equal(observed.forms.kind, 'observed');
  assert.equal(observed.headers[0].kind, 'absent');
  assert.equal(observed.headers[1].kind, 'not-observed');
});

test('malformed headers and contradictory connection records cannot look successful', () => {
  for (const headerData of [false, [], { present: [] }, { missing: 'CSP' }, { missing: ['CSP', 'CSP'] }]) {
    assert.ok(mapper.local({ headerData }).headers.every(header => header.kind === 'unavailable'));
  }
  const contradictory = mapper.local({ headerData: { present: { CSP: 'fixture' }, missing: ['CSP'] },
    basicData: { protocol: 'http:', httpsOnly: true, cookies: -1, scripts: '0' } });
  assert.equal(contradictory.headers[0].kind, 'unavailable');
  assert.equal(contradictory.connection.kind, 'unavailable');
  assert.equal(contradictory.cookies.kind, 'unavailable');
  assert.equal(contradictory.scripts.kind, 'unavailable');
});

test('loading clears previous successful output before tab lookup finishes', async () => {
  const view = popup(); settle(view); await view.context.loadAllData();
  const query = deferred(); view.controls.query = () => query.promise;
  const loading = view.context.loadAllData();
  assert.equal(state(view), 'loading');
  assert.equal(view.nodes['score-label'].textContent, 'Loading');
  assert.equal(view.nodes['score-text'].textContent, '—');
  assert.equal(view.nodes['main-content'].style.display, 'none');
  assert.equal(view.nodes['breach-none'].style.display, 'none');
  assert.equal(view.nodes['status-spinner'].style.display, 'block');
  query.resolve([{ url: 'about:config' }]); await loading;
});

test('unsupported tabs skip storage, injection, and breach requests on load and refresh', async () => {
  const view = popup(); view.controls.query = async () => [{ id: 1, url: 'about:config' }];
  await view.context.loadAllData(); await view.context.refreshData();
  assert.equal(state(view), 'unsupported');
  assert.equal(view.nodes['score-label'].textContent, 'Unsupported');
  assert.equal(view.nodes['refresh'].disabled, true);
  assert.deepEqual(view.calls, { storage: 0, executeScript: 0, fetch: 0 });
});

test('tab/storage failures are visible and hide old successful results', async () => {
  for (const failure of ['query', 'storage']) {
    const view = popup(); settle(view); await view.context.loadAllData();
    view.controls[failure] = async () => { throw new Error('fixture failure'); };
    await view.context.loadAllData();
    assert.equal(state(view), 'unavailable');
    assert.equal(view.nodes['main-content'].style.display, 'none');
    assert.equal(view.nodes['score-label'].textContent, 'Unavailable');
    assert.match(view.nodes['status-message'].textContent, /unavailable/);
    assert.equal(view.nodes['status-spinner'].style.display, 'none');
    assert.equal(view.nodes['refresh'].disabled, false);
  }
});

test('no active tab or URL shows unavailable without querying storage or breach service', async () => {
  for (const tabs of [[], [{}]]) {
    const view = popup(); view.controls.query = async () => tabs;
    await view.context.loadAllData();
    assert.equal(state(view), 'unavailable');
    assert.equal(view.calls.storage, 0); assert.equal(view.calls.fetch, 0);
  }
});

test('empty storage shows incomplete sections and no false form/header/count success', async () => {
  const view = popup(); view.controls.storage = async () => ({});
  await view.context.loadAllData();
  assert.equal(state(view), 'incomplete');
  assert.equal(view.nodes['main-content'].style.display, 'block');
  assert.equal(view.nodes['cookie-count'].textContent, 'Not observed');
  assert.equal(view.nodes['https-status'].textContent, 'Not observed');
  assert.match(view.nodes['forms-body'].innerHTML, /not observed/);
  assert.doesNotMatch(view.nodes['forms-body'].innerHTML, /secure submission|No HTTP forms/);
  assert.doesNotMatch(view.nodes['headers-grid'].innerHTML, /pill-present|pill-missing/);
  assert.equal(view.calls.fetch, 0);
  assert.match(view.nodes['breach-error'].textContent, /not run/);
});

test('partial records retain available headers but never invent missing form/count evidence', async () => {
  const view = popup(); settle(view);
  view.stored['forms_fixture.example'] = {};
  delete view.stored['security_data_fixture.example'].thirdPartyScripts;
  await view.context.loadAllData();
  assert.equal(state(view), 'incomplete');
  assert.match(view.nodes['headers-grid'].innerHTML, /CSP: Present/);
  assert.match(view.nodes['forms-body'].innerHTML, /not observed/);
  assert.equal(view.nodes['third-party-scripts'].textContent, 'Not observed');
  assert.equal(view.nodes['third-party-scripts'].className, 'metric-value muted');
});

test('complete observations use bounded wording and recover from incomplete state', async () => {
  const view = popup(); settle(view);
  view.controls.storage = async () => ({}); await view.context.loadAllData();
  view.controls.storage = async () => view.stored; await view.context.loadAllData();
  assert.equal(state(view), 'ready');
  assert.equal(view.nodes['score-text'].textContent, '100');
  assert.equal(view.nodes['cookie-count'].textContent, '0');
  assert.equal(view.nodes['https-status'].textContent, 'HTTPS observed');
  assert.match(view.nodes['forms-body'].innerHTML, /No HTTP forms observed in this scan/);
  assert.equal(view.nodes['third-party-scripts'].className, 'metric-value');
  assert.equal(view.nodes['breach-error'].style.display, 'none');
});

test('HTTP, malformed, and network breach failures never show a successful empty result', async () => {
  const responses = [
    () => Promise.resolve({ ok: false }),
    () => Promise.resolve({ ok: true, json: async () => ({}) }),
    () => Promise.resolve({ ok: true, json: async () => [null] }),
    () => Promise.resolve({ ok: true, json: async () => [{ Name: 'Fixture', BreachDate: 'invalid' }] }),
    () => Promise.reject(new Error('network fixture')),
  ];
  for (const fetch of responses) {
    const view = popup(); view.controls.fetch = fetch; await view.context.loadAllData();
    assert.equal(view.nodes['breach-error'].style.display, 'block');
    assert.equal(view.nodes['breach-none'].style.display, 'none');
    assert.equal(view.nodes['score-text'].textContent, '100');
    assert.equal(state(view), 'ready');
  }
});

test('a new breach result replaces earlier banners and missing account counts remain unknown', () => {
  const view = popup();
  view.context.renderBreaches({ kind: 'empty' });
  view.context.renderBreaches({ kind: 'results', breaches: [{ Name: 'Fixture', BreachDate: '2000-01-01' }] });
  assert.equal(view.nodes['breach-none'].style.display, 'none');
  assert.match(view.nodes['breach-list'].innerHTML, /Account count unavailable/);
  view.context.renderBreaches({ kind: 'network-error' });
  assert.equal(view.nodes['breach-list'].style.display, 'none');
  assert.equal(view.nodes['breach-list'].innerHTML, '');
});

test('delayed results from an older popup load cannot overwrite a newer unsupported page', async () => {
  const view = popup(); const oldLoad = view.context.loadAllData(); await view.requested;
  view.controls.query = async () => [{ url: 'about:config' }];
  await view.context.loadAllData(); settle(view); await oldLoad;
  assert.equal(state(view), 'unsupported');
  assert.equal(view.nodes['breach-none'].style.display, 'none');
  assert.equal(view.nodes['score-label'].textContent, 'Unsupported');
});

test('a delayed storage read cannot restore a prior page after a newer unavailable tab', async () => {
  const view = popup(); const storage = deferred(); const requested = deferred();
  view.controls.storage = () => { requested.resolve(); return storage.promise; };
  const oldLoad = view.context.loadAllData(); await requested.promise;
  view.controls.query = async () => []; await view.context.loadAllData();
  storage.resolve(view.stored); await oldLoad;
  assert.equal(state(view), 'unavailable'); assert.equal(view.calls.fetch, 0);
});

test('failed refresh reports unavailable instead of retaining old green results', async () => {
  const view = popup(); settle(view); await view.context.loadAllData();
  view.controls.executeScript = async () => { throw new Error('restricted fixture'); };
  await view.context.refreshData();
  assert.equal(state(view), 'unavailable');
  assert.equal(view.nodes['score-text'].textContent, '—');
  assert.match(view.nodes['status-message'].textContent, /restricted/);
  assert.equal(view.nodes['refresh'].disabled, false);
});

test('successful refresh stays loading until the subsequent read resolves', async () => {
  const view = popup(); settle(view);
  await view.context.refreshData();
  assert.equal(state(view), 'loading');
  const query = deferred(); view.controls.query = () => query.promise;
  view.timers.shift()();
  assert.equal(view.nodes['refresh'].disabled, true);
  // Finish the pending read without starting another network operation.
  query.resolve([{ url: 'about:blank' }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state(view), 'unsupported');
});
