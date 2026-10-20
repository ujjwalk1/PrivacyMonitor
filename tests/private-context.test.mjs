import assert from 'node:assert/strict';
import test from 'node:test';
import { popup, consentedPopup, deferred } from './helpers/popup.mjs';

const normal = { incognito: false };
const empty = () => ({ ok: true, json: async () => [] });
const service = view => view.background.PrivacyMonitorBreachService;
const kind = view => view.nodes['breach-section'].attributes['data-state'];

test('service refuses private and unverified contexts before consent, network, or cache work', async () => {
  const view = consentedPopup(); let consentReads = 0;
  view.controls.getPermissions = async () => { consentReads++; throw new Error('Should not read consent'); };
  for (const context of [undefined, null, {}, { incognito: true }, { incognito: null },
    { incognito: 'false' }, { incognito: 0 }]) {
    const reply = await service(view).lookup('private.example', context);
    assert.equal(reply.kind, context?.incognito === true ? 'private-disabled' : 'context-unavailable');
  }
  assert.equal(consentReads, 0); assert.equal(view.calls.fetch, 0); assert.equal(view.timers.length, 0);
});

test('a private lookup never reads a shared public cache entry or evicts it', async () => {
  const view = consentedPopup(); view.controls.fetch = async () => empty();
  await service(view).lookup('fixture.example', normal);
  assert.equal((await service(view).lookup('fixture.example', { incognito: true })).kind, 'private-disabled');
  assert.equal((await service(view).lookup('fixture.example')).kind, 'context-unavailable');
  assert.equal((await service(view).lookup('fixture.example', normal)).cached, true);
  assert.equal(view.calls.fetch, 1);
});

test('private lookup does not join or cancel pending normal work', async () => {
  const view = consentedPopup(); const response = deferred(); view.controls.fetch = () => response.promise;
  const pending = service(view).lookup('fixture.example', normal); await view.requested;
  assert.equal((await service(view).lookup('fixture.example', { incognito: true })).kind, 'private-disabled');
  assert.equal(view.calls.fetch, 1);
  response.resolve(empty()); assert.equal((await pending).kind, 'empty');
  assert.equal((await service(view).lookup('fixture.example', normal)).cached, true);
});

test('private and unknown-context popup loads skip legacy storage and the breach service', async () => {
  for (const incognito of [true, undefined, null, 'false']) {
    const view = consentedPopup(); let serviceReads = 0;
    view.controls.query = async () => [{ id: 1, url: 'https://fixture.example/private?secret=fixture', incognito }];
    view.controls.storage = async () => { throw new Error('Private popup must not read shared rows'); };
    view.context.browser.runtime.getBackgroundPage = async () => { serviceReads++; throw new Error('No service access'); };
    await view.context.loadAllData();
    assert.equal(view.calls.storage, 0); assert.equal(view.calls.fetch, 0); assert.equal(serviceReads, 0);
    assert.equal(kind(view), incognito === true ? 'private-disabled' : 'context-unavailable');
    assert.equal(view.nodes['score-text'].textContent, '—');
    assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'incomplete');
    assert.match(view.nodes['forms-body'].innerHTML, /unavailable/);
    assert.equal(view.nodes['breach-none'].style.display, 'none');
    assert.match(view.nodes['status-message'].textContent, /Private browsing|Privacy context unavailable/);
  }
});

test('late public lookup results cannot restore a successful state after switching to a private tab', async () => {
  const view = consentedPopup(); const result = deferred(); view.controls.fetch = () => result.promise;
  const publicLoad = view.context.loadAllData(); await view.requested;
  view.controls.query = async () => [{ id: 2, url: 'https://fixture.example/', incognito: true }];
  await view.context.loadAllData(); result.resolve(empty()); await publicLoad;
  assert.equal(kind(view), 'private-disabled'); assert.equal(view.nodes['score-text'].textContent, '—');
  assert.equal(view.calls.fetch, 1, 'Only the previously authorized normal-tab lookup was sent');
  assert.equal(view.calls.storage, 1, 'Only the normal tab read legacy observations');
});

test('consent and refresh cannot bypass the private-tab gate', async () => {
  const view = popup();
  view.controls.query = async () => [{ id: 1, url: 'https://fixture.example/', incognito: true }];
  await view.context.loadAllData(); await view.context.setBreachLookupEnabled(true);
  await view.context.refreshData();
  assert.equal(view.permissions.data_collection.includes('browsingActivity'), true);
  assert.equal(view.calls.scan, 1); assert.equal(view.calls.storage, 0); assert.equal(view.calls.fetch, 0);
  assert.equal(kind(view), 'private-disabled'); assert.equal(view.nodes['score-text'].textContent, '—');
});
