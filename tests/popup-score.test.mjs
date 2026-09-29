import assert from 'node:assert/strict';
import test from 'node:test';
import { popup } from './helpers/popup.mjs';

test('local score renders before a pending breach request and stays unchanged after historical results', async () => {
  const view = popup();
  const loading = view.context.loadAllData();
  await Promise.race([view.requested, loading.then(() => assert.fail('Lookup did not start'))]);
  assert.equal(view.nodes['score-text'].textContent, '100');
  assert.equal(view.nodes['score-arc'].attributes['stroke-dashoffset'], '0');
  view.finishFetch({ ok: true, json: async () => [{ Name: 'Historical fixture', BreachDate: '2000-01-01' }] });
  await loading;
  assert.equal(view.nodes['score-text'].textContent, '100');
  assert.match(view.nodes['breach-list'].innerHTML, /Historical fixture/);
  assert.deepEqual(view.errors, []);
});

test('missing header observations render a neutral incomplete score', async () => {
  const view = popup(null);
  view.finishFetch({ ok: true, json: async () => [] });
  await view.context.loadAllData();
  assert.equal(view.nodes['score-text'].textContent, '—');
  assert.equal(view.nodes['score-label'].textContent, 'Incomplete');
  assert.equal(view.nodes['score-arc'].attributes['stroke-dashoffset'], '100');
  assert.equal(view.nodes['score-arc'].attributes.stroke, '#9ca3af');
  assert.deepEqual(view.errors, []);
});

test('a subsequent load clears an earlier score when the page observation disappears', async () => {
  const view = popup();
  view.finishFetch({ ok: true, json: async () => [] });
  await view.context.loadAllData();
  assert.equal(view.nodes['score-text'].textContent, '100');
  delete view.stored['security_data_fixture.example'];
  await view.context.loadAllData();
  assert.equal(view.nodes['score-text'].textContent, '—');
  assert.equal(view.nodes['score-arc'].attributes['stroke-dashoffset'], '100');
  assert.deepEqual(view.errors, []);
});
