import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));
const uuid = '00000000-0000-4000-8000-000000000001';
const permissions = { origins: ['http://*/*', 'https://*/*'] };
const manifest = () => ({ manifest_version: 2, permissions: ['activeTab', 'webRequest', 'webNavigation'],
  optional_permissions: ['http://*/*', 'https://*/*'] });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup(m = manifest()) {
  const events = {}, calls = [], controls = {
    request: () => Promise.resolve(true), contains: () => Promise.resolve(true), remove: () => Promise.resolve(true),
  };
  const event = name => {
    const listeners = new Set();
    events[name] = { listeners, emit: (...args) => [...listeners].forEach(fn => fn(...args)) };
    return { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) };
  };
  const api = {
    runtime: { getManifest: () => m },
    permissions: { onRemoved: event('permissionRemoved'),
      ...Object.fromEntries(['request', 'contains', 'remove'].map(name => [name, arg => {
        calls.push({ name, arg: plain(arg) }); return controls[name](arg);
      }])) },
    webNavigation: Object.fromEntries(['onBeforeNavigate', 'onCommitted', 'onErrorOccurred'].map(n => [n, event(n)])),
    webRequest: { onBeforeRequest: event('request') },
    tabs: { onRemoved: event('closed'), onReplaced: event('replaced') },
    get storage() { assert.fail('No persistence'); },
  };
  const context = vm.createContext({ URL,
    fetch() { assert.fail('No network lookup'); },
    get localStorage() { assert.fail('No persistent history'); },
    console: { log() { assert.fail('No browsing logs'); } },
  });
  for (const p of ['vendor/tldts/index.umd.min.js', 'lib/site-domains.js', 'lib/request-capture.js', 'lib/monitoring-access.js']) {
    vm.runInContext(read(p), context);
  }
  const access = context.PrivacyMonitorMonitoringAccess.create({ api });
  function observe() {
    events.onBeforeNavigate.emit({ tabId: 1, frameId: 0, timeStamp: 10 });
    events.onCommitted.emit({ tabId: 1, frameId: 0, timeStamp: 12, documentId: uuid, url: 'https://example.com/' });
    events.request.emit({ tabId: 1, frameId: 0, timeStamp: 13, documentId: uuid,
      incognito: false, url: 'https://cdn.example.net/secret?token=secret', type: 'script' });
  }
  return { api, access, controls, calls, events, context, observe };
}

test('fresh policy does not prompt, attach or expose history even with an existing grant', async () => {
  const v = setup(); await settle();
  assert.deepEqual(v.calls, []); assert.equal(v.events.request.listeners.size, 0);
  assert.equal(v.access.status().mode, 'on-demand');
  assert.match(v.access.status().coverage, /cannot reconstruct earlier requests or response headers/);
  v.observe(); assert.equal(v.access.get(1).kind, 'unavailable');
});

test('current required-host/static-script manifest is rejected without misleading on-demand protection', async () => {
  for (const m of [JSON.parse(read('manifest.json')), { ...manifest(), permissions: [...manifest().permissions, 'https://example.org/*'] },
    { ...manifest(), content_scripts: [{ matches: ['https://*/*'] }] },
    { ...manifest(), optional_permissions: ['https://*/*'] }, { ...manifest(), manifest_version: 3 }]) {
    const v = setup(m); assert.equal(v.access.status().access, 'integration-required');
    await v.access.enableFromGesture(); await v.access.useOnDemand();
    assert.deepEqual(v.calls, []); assert.equal(v.events.request.listeners.size, 0);
  }
});

test('request is synchronous in the gesture call, exact in scope and starts capture only after confirmation', async () => {
  const v = setup(), request = deferred(), contains = deferred();
  v.controls.request = () => request.promise; v.controls.contains = () => contains.promise;
  const result = v.access.enableFromGesture();
  assert.deepEqual(v.calls, [{ name: 'request', arg: permissions }]); // Before yielding to microtasks.
  assert.equal(v.events.request.listeners.size, 0);
  request.resolve(true); await settle(); assert.equal(v.events.request.listeners.size, 0);
  contains.resolve(true); await result;
  assert.equal(v.access.status().mode, 'continuous'); assert.equal(v.events.request.listeners.size, 1);
  assert.equal(v.access.get(1).kind, 'not-observed'); // No reconstruction of earlier traffic.
  v.observe();
  assert.deepEqual(plain(v.access.get(1, uuid).observations), [{ hostname: 'cdn.example.net', type: 'script', events: 1 }]);
  assert.doesNotMatch(JSON.stringify(v.access.get(1)), /secret|token/);
  v.access.dispose();
});

test('denial, request rejection, malformed grant and failed confirmation never activate capture', async () => {
  for (const [request, contains, expected] of [
    [() => false, () => true, 'denied'], [() => { throw Error('denied'); }, () => true, 'unavailable'],
    [() => Promise.reject(Error('failed')), () => true, 'unavailable'],
    [() => 'true', () => true, 'unavailable'], [() => true, () => false, 'unavailable'],
    [() => true, () => Promise.reject(Error('failed')), 'unavailable'],
  ]) {
    const v = setup(); v.controls.request = request; v.controls.contains = contains;
    await v.access.enableFromGesture();
    assert.equal(v.access.status().access, expected); assert.equal(v.events.request.listeners.size, 0);
    assert.equal(v.access.get(1).kind, 'unavailable'); v.access.dispose();
  }
});

test('revocation immediately clears and detaches real capture; later traffic cannot repopulate it', async () => {
  const v = setup(); await v.access.enableFromGesture(); v.observe();
  assert.equal(v.access.get(1).kind, 'observed');
  v.events.permissionRemoved.emit({ origins: ['https://*/*'] });
  assert.equal(v.access.status().access, 'revoked'); assert.equal(v.events.request.listeners.size, 0);
  v.observe(); assert.equal(v.access.get(1).kind, 'unavailable');
  await v.access.enableFromGesture(); assert.equal(v.access.get(1).kind, 'not-observed');
  v.access.dispose();
});

test('unrelated breach consent does not control local capture, but API removal does', async () => {
  const v = setup(); await v.access.enableFromGesture(); v.observe();
  v.events.permissionRemoved.emit({ data_collection: ['browsingActivity'] });
  assert.equal(v.access.get(1).kind, 'observed');
  v.events.permissionRemoved.emit({ permissions: ['webRequest'] });
  assert.equal(v.access.get(1).kind, 'unavailable'); v.access.dispose();
});

test('switching to on-demand stops capture synchronously before releasing optional origins', async () => {
  const v = setup(); await v.access.enableFromGesture(); v.observe();
  const removed = deferred(); v.controls.remove = () => removed.promise;
  const result = v.access.useOnDemand();
  assert.equal(v.events.request.listeners.size, 0); assert.equal(v.access.get(1).kind, 'unavailable');
  await settle(); assert.deepEqual(v.calls.at(-1), { name: 'remove', arg: permissions });
  removed.resolve(true); await result;
  assert.equal(v.access.status().mode, 'on-demand'); assert.equal(v.access.status().access, 'released');
  v.access.dispose();
});

test('failed permission removal leaves capture off and reports retained or unavailable access honestly', async () => {
  for (const remove of [() => false, () => Promise.reject(Error('cannot remove'))]) {
    const v = setup(); await v.access.enableFromGesture(); v.controls.remove = remove;
    await v.access.useOnDemand();
    assert.ok(['retained', 'unavailable'].includes(v.access.status().access));
    assert.equal(v.access.status().mode, 'on-demand'); assert.equal(v.events.request.listeners.size, 0);
    v.access.dispose();
  }
});

test('late grant after cancellation is removed and cannot start capture; clicks during removal never queue enable', async () => {
  const v = setup(), grant = deferred(); v.controls.request = () => grant.promise;
  const enabling = v.access.enableFromGesture(), disabling = v.access.useOnDemand();
  await v.access.enableFromGesture(); assert.equal(v.calls.filter(c => c.name === 'request').length, 1);
  grant.resolve(true); await Promise.all([enabling, disabling]);
  assert.equal(v.calls.filter(c => c.name === 'remove').length, 1);
  assert.equal(v.events.request.listeners.size, 0); assert.equal(v.access.status().mode, 'on-demand');
  v.access.dispose();
});

test('revocation during confirmation invalidates a stale successful permission read', async () => {
  const v = setup(), confirm = deferred(); v.controls.contains = () => confirm.promise;
  const pending = v.access.enableFromGesture(); await settle();
  v.events.permissionRemoved.emit({ origins: ['http://*/*'] });
  confirm.resolve(true); await pending;
  assert.equal(v.access.status().access, 'revoked'); assert.equal(v.events.request.listeners.size, 0);
  v.access.dispose();
});

test('duplicate enable clicks attach once; disposal cancels pending work and removes listeners', async () => {
  const v = setup(), grant = deferred(); v.controls.request = () => grant.promise;
  const pending = v.access.enableFromGesture(); await v.access.enableFromGesture();
  assert.equal(v.calls.length, 1); v.access.dispose(); v.access.dispose();
  grant.resolve(true); await pending;
  assert.equal(v.events.request.listeners.size, 0); assert.equal(v.events.permissionRemoved.listeners.size, 0);
  const w = setup(); await w.access.enableFromGesture(); await w.access.enableFromGesture();
  assert.equal(w.events.request.listeners.size, 1); w.access.dispose();
  assert.equal(w.events.request.listeners.size, 0);
});

test('collector registration failure is unavailable and rolls back, with no production/package activation', async () => {
  const v = setup(); v.api.webRequest.onBeforeRequest.addListener = () => { throw Error('API unavailable'); };
  await v.access.enableFromGesture();
  assert.equal(v.access.status().access, 'unavailable');
  assert.equal(v.events.onCommitted.listeners.size, 0);
  assert.equal(v.access.get(1).kind, 'unavailable');
  assert.doesNotMatch(read('manifest.json'), /monitoring-access/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).includes('lib/monitoring-access.js'));
  v.access.dispose();
});
