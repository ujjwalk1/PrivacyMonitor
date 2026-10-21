import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { popup, consentedPopup, deferred } from './helpers/popup.mjs';

const flush = () => new Promise(resolve => setImmediate(resolve));
const state = view => view.nodes['breach-section'].attributes['data-state'];
const ready = view => {
  assert.equal(view.nodes['score-text'].textContent, '100');
  assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'ready');
  assert.equal((view.nodes['refresh'].attributes['aria-disabled'] === 'true'), false);
};
const empty = { ok: true, json: async () => [] };

test('manifest declares optional browsing transmission without making it required', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.browser_specific_settings.gecko.id, 'privacy-monitor@example.com');
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions,
    { required: ['none'], optional: ['browsingActivity'] });
});

test('fresh installation and repeated opens send nothing, while local checks and refresh work', async () => {
  const view = popup();
  view.controls.requestPermission = () => assert.fail('Opening must not prompt for consent');
  await view.context.loadAllData(); await view.context.loadAllData();
  ready(view); assert.equal(state(view), 'disabled');
  assert.equal((view.nodes['breach-enable'].attributes['aria-disabled'] === 'true'), false);
  assert.equal((view.nodes['breach-disable'].attributes['aria-disabled'] === 'true'), true);
  await view.context.refreshData(); view.advanceTime(600); await flush();
  ready(view); assert.equal(view.calls.fetch, 0);
  assert.equal(view.nodes['breach-none'].style.display, 'none');
});

test('enable requests Firefox consent synchronously from the gesture and sends only the hostname after approval', async () => {
  const view = popup(); await view.context.loadAllData();
  const permission = deferred(); let requested = false;
  view.controls.requestPermission = options => {
    assert.deepEqual(JSON.parse(JSON.stringify(options)), { data_collection: ['browsingActivity'] });
    requested = true; return permission.promise;
  };
  view.controls.query = async () => [{ id: 1, url: 'https://fixture.example/private?secret=fixture#fragment', incognito: false }];
  view.controls.fetch = async (url, options) => {
    assert.equal(url, 'https://haveibeenpwned.com/api/v3/breaches?domain=fixture.example');
    assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.body, undefined); return empty;
  };
  const enabling = view.context.setBreachLookupEnabled(true);
  assert.equal(requested, true, 'No async step may precede permissions.request');
  assert.equal(view.calls.fetch, 0); ready(view);
  view.permissions.data_collection = ['browsingActivity'];
  view.emitPermission('added'); permission.resolve(true); await enabling;
  assert.equal(view.calls.fetch, 1); assert.equal(state(view), 'empty'); ready(view);
  const reopened = popup(undefined, { consented: true });
  reopened.finishFetch(empty); await reopened.context.loadAllData();
  assert.equal(reopened.calls.fetch, 1, 'Browser-held permission survives reopening');
});

test('denied or rejected consent never starts lookup or disables local analysis', async () => {
  for (const request of [async () => false, async () => { throw new Error('Synthetic permission failure'); }]) {
    const view = popup(); await view.context.loadAllData();
    view.controls.requestPermission = request;
    await view.context.setBreachLookupEnabled(true); await view.context.loadAllData();
    assert.equal(view.calls.fetch, 0); assert.equal(state(view), 'disabled'); ready(view);
  }
});

test('unsupported, failed, or malformed permission reads fail closed while preserving local results', async () => {
  for (const [read, expected] of [
    [async () => ({ permissions: [] }), 'consent-unsupported'],
    [async () => ({ data_collection: 'browsingActivity' }), 'consent-error'],
    [async () => { throw new Error('Synthetic permission read failure'); }, 'consent-error'],
  ]) {
    const view = popup(); view.controls.getPermissions = read;
    await view.context.loadAllData();
    assert.equal(state(view), expected); assert.equal(view.calls.fetch, 0); ready(view);
    assert.equal((view.nodes['breach-enable'].attributes['aria-disabled'] === 'true'), true);
  }
  const view = popup(); delete view.context.browser.permissions;
  await view.context.loadAllData();
  assert.equal(state(view), 'consent-unsupported'); assert.equal(view.calls.fetch, 0); ready(view);
});

test('disable aborts an active lookup immediately, clears results, and prevents subsequent requests', async () => {
  const view = consentedPopup(); const response = deferred(); let signal;
  view.controls.fetch = async (_url, options) => { signal = options.signal; return response.promise; };
  const loading = view.context.loadAllData(); await view.requested;
  const removing = deferred(); view.controls.removePermission = () => removing.promise;
  const disabling = view.context.setBreachLookupEnabled(false);
  assert.equal(signal.aborted, true); ready(view);
  await loading; assert.equal(view.timers.length, 0);
  await view.context.loadAllData(); assert.equal(view.calls.fetch, 1);
  view.permissions.data_collection = []; view.emitPermission('removed');
  removing.resolve(true); await disabling;
  response.resolve(empty); await flush();
  assert.equal(state(view), 'disabled'); assert.equal(view.nodes['breach-none'].style.display, 'none');
  await view.context.loadAllData(); assert.equal(view.calls.fetch, 1); ready(view);
  const reopened = popup(); await reopened.context.loadAllData(); assert.equal(reopened.calls.fetch, 0);
});

test('revocation in Firefox aborts a stalled body and rejects late results', async () => {
  const view = consentedPopup(); const body = deferred(); const reading = deferred(); let signal;
  view.controls.fetch = async (_url, options) => {
    signal = options.signal;
    return { ok: true, json() { reading.resolve(); return body.promise; } };
  };
  const loading = view.context.loadAllData(); await reading.promise;
  view.permissions.data_collection = []; view.emitPermission('removed'); await loading; await flush();
  assert.equal(signal.aborted, true); assert.equal(state(view), 'disabled'); ready(view);
  body.resolve([{ Name: 'Late fixture', BreachDate: '2000-01-01' }]); await flush();
  assert.equal(view.nodes['breach-list'].innerHTML, '');
  assert.equal(view.timers.length, 0);
  await view.context.loadAllData(); assert.equal(view.calls.fetch, 1);
});

test('a stale permission read cannot start a request after revocation', async () => {
  const view = consentedPopup(); const permission = deferred(); const checking = deferred();
  view.controls.getPermissions = () => { checking.resolve(); return permission.promise; };
  const loading = view.context.loadAllData(); await checking.promise; await flush();
  view.controls.getPermissions = async () => ({ data_collection: [] });
  view.emitPermission('removed'); permission.resolve({ data_collection: ['browsingActivity'] });
  await loading; await flush();
  assert.equal(view.calls.fetch, 0); assert.equal(state(view), 'disabled'); ready(view);
});

test('each lookup rechecks Firefox consent even without a permission-change event', async () => {
  const view = consentedPopup(); view.finishFetch(empty); await view.context.loadAllData();
  view.permissions.data_collection = []; await view.context.loadAllData();
  assert.equal(view.calls.fetch, 1); assert.equal(state(view), 'disabled'); ready(view);
});

test('failed removal is disclosed and blocks this popup until a successful retry', async () => {
  for (const remove of [async () => false, async () => { throw new Error('Synthetic remove failure'); }]) {
    const view = consentedPopup(); view.finishFetch(empty); await view.context.loadAllData();
    view.controls.removePermission = remove; await view.context.setBreachLookupEnabled(false);
    assert.match(view.nodes['breach-consent-status'].textContent, /Could not turn off Firefox/);
    await view.context.loadAllData(); assert.equal(view.calls.fetch, 1); ready(view);
    view.controls.removePermission = async () => { view.permissions.data_collection = []; return true; };
    await view.context.setBreachLookupEnabled(false);
    assert.equal((view.nodes['breach-enable'].attributes['aria-disabled'] === 'true'), false);
  }
});

test('consent control remains available on unsupported pages without triggering a lookup', async () => {
  const view = popup(); view.controls.query = async () => [{ url: 'about:config' }];
  await view.context.loadAllData(); await flush();
  assert.equal((view.nodes['breach-enable'].attributes['aria-disabled'] === 'true'), false);
  await view.context.setBreachLookupEnabled(true);
  assert.equal((view.nodes['breach-disable'].attributes['aria-disabled'] === 'true'), false);
  assert.equal(view.calls.fetch, 0);
});

test('granting consent in Firefox updates the control without claiming lookup is off or starting a request', async () => {
  const view = popup(); await view.context.loadAllData();
  view.permissions.data_collection = ['browsingActivity']; view.emitPermission('added'); await flush();
  assert.equal((view.nodes['breach-disable'].attributes['aria-disabled'] === 'true'), false);
  assert.equal(state(view), 'not-run'); assert.equal(view.calls.fetch, 0); ready(view);
  assert.match(view.nodes['breach-error'].textContent, /has not run since consent changed/);
  view.finishFetch(empty); await view.context.loadAllData();
  assert.equal(state(view), 'empty'); assert.equal(view.calls.fetch, 1);
});
