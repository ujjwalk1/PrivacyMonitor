import assert from 'node:assert/strict';
import test from 'node:test';
import { popup, deferred } from './helpers/popup.mjs';
const tokenA = 'a'.repeat(32), tokenB = 'b'.repeat(32);
const identity = sourceToken => ({ channel: 'privacy-monitor.scan', version: 1, ok: true, sourceToken });
const basicKey = 'security_data_fixture.example', formKey = 'forms_fixture.example';

test('same-host tab B cannot supply tab A scoring or breach eligibility; refreshing A recovers', async () => {
  const view = popup(undefined, { consented: true });
  view.controls.fetch = async () => ({ ok: true, json: async () => [] });
  await view.context.loadAllData(); assert.equal(view.nodes['score-text'].textContent, '100');
  view.advanceTime(10 * 60 * 1000 + 1); // Expire the cache so it cannot hide a mistaken lookup.
  const lookupsBefore = view.calls.fetch; assert.equal(lookupsBefore, 1);
  // Reproduce the combined persistent write from another document on the same host.
  view.stored[basicKey] = { ...view.stored[basicKey], sourceToken: tokenB };
  view.stored[formKey] = { sourceToken: tokenB, insecureForms: 1, insecurePasswordForms: 1 };
  await view.context.loadAllData();
  assert.equal(view.nodes['score-text'].textContent, '—', 'Must not display 80 from another document');
  assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'incomplete');
  assert.equal(view.calls.fetch, lookupsBefore);
  assert.equal(view.nodes['breach-section'].attributes['data-state'], 'not-run');
  assert.match(view.nodes['forms-body'].innerHTML, /unavailable/i);
  view.controls.scan = async () => {
    view.stored[basicKey].sourceToken = tokenA;
    view.stored[formKey] = { sourceToken: tokenA, insecureForms: 0, insecurePasswordForms: 0 };
    return { channel: 'privacy-monitor.scan', version: 1, ok: true };
  };
  await view.context.refreshData(); assert.equal(view.nodes['score-text'].textContent, '100');
});

test('untagged or individually mismatched summaries are unavailable, never zero-safe', async () => {
  for (const key of [basicKey, formKey]) for (const sourceToken of [undefined, tokenB, null, 42]) {
    const view = popup(); view.stored[key].sourceToken = sourceToken;
    await view.context.loadAllData(); assert.equal(view.nodes['score-text'].textContent, '—');
  }
});

test('missing, failed or malformed document identity cannot authorize saved evidence', async () => {
  for (const reply of [undefined, {}, identity('short'), { ...identity(tokenA), version: 2 },
    { ...identity(tokenA), channel: 'wrong' }, { ...identity(tokenA), ok: false }]) {
    const view = popup(); view.controls.identity = async () => reply;
    await view.context.loadAllData(); assert.equal(view.nodes['score-text'].textContent, '—');
    assert.equal(view.calls.fetch, 0);
  }
  const view = popup(); view.controls.identity = async () => { throw new Error('No receiver'); };
  await view.context.loadAllData(); assert.equal(view.nodes['score-text'].textContent, '—');
});

test('same-host navigation during header retrieval invalidates the old document snapshot', async () => {
  const view = popup(), reply = deferred(), started = deferred();
  const original = view.controls.analysis; view.controls.analysis = async message => {
    started.resolve(); await reply.promise; return original(message);
  };
  const loading = view.context.loadAllData(); await started.promise;
  view.controls.identity = async () => identity(tokenB);
  reply.resolve(); await loading;
  assert.equal(view.nodes['score-text'].textContent, '—');
  assert.equal(view.calls.fetch, 0);
});

test('private and unknown contexts do not request identity or read shared summaries', async () => {
  for (const incognito of [true, undefined]) {
    const view = popup(); view.controls.query = async () => [{ id: 1, url: 'https://fixture.example/', incognito }];
    view.controls.identity = () => assert.fail('Must not request identity');
    await view.context.loadAllData(); assert.equal(view.calls.identity, 0); assert.equal(view.calls.storage, 0);
  }
});
