import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { dynamicContent } from './helpers/dynamic-content.mjs';
import { deferred } from './helpers/popup.mjs';

test('inserted/removed fields and forms update observations without explicit refresh', async () => {
  const view = await dynamicContent();
  const form = view.create('form', { action: 'http://other.example/send' });
  await view.advance(500);
  assert.equal(view.forms().insecureForms, 1); assert.equal(view.forms().insecurePasswordForms, 0);
  const wrapper = view.create('div', {}, form);
  const field = view.create('input', { type: 'password' }, wrapper);
  await view.advance(500);
  assert.equal(view.forms().insecurePasswordForms, 1); assert.equal(view.bannerCount(form), 1);
  wrapper.remove(); await view.advance(500);
  assert.equal(view.forms().insecurePasswordForms, 0); assert.equal(view.bannerCount(form), 0);
  form.appendChild(field); await view.advance(500);
  assert.equal(view.bannerCount(form), 1);
  form.remove(); await view.advance(500); assert.equal(view.forms().insecureForms, 0);
});

test('action, method, overrides, disabled state, type, and ownership changes rescan', async () => {
  const view = await dynamicContent(); const form = view.create('form', { id: 'owner', action: 'https://secure.example/' });
  const field = view.create('input', { type: 'text', form: 'owner' });
  const fieldset = view.create('fieldset', { disabled: '' });
  const button = view.create('button', { form: 'owner', formaction: 'http://other.example/' }, fieldset);
  await view.advance(500); assert.equal(view.forms().insecureForms, 0);
  fieldset.removeAttribute('disabled'); field.type = 'password'; await view.advance(500);
  assert.equal(view.forms().insecurePasswordForms, 1); assert.equal(view.bannerCount(form), 1);
  button.setAttribute('formaction', 'https://secure.example/'); await view.advance(500);
  assert.equal(view.bannerCount(form), 0);
  form.setAttribute('action', 'http://other.example/'); await view.advance(500); assert.equal(view.bannerCount(form), 1);
  form.setAttribute('method', 'dialog'); await view.advance(500); assert.equal(view.forms().insecureForms, 0);
  button.setAttribute('formmethod', 'post'); button.setAttribute('formaction', 'http://other.example/');
  await view.advance(500); assert.equal(view.bannerCount(form), 1);
  button.type = 'button'; await view.advance(500); assert.equal(view.bannerCount(form), 0);
  button.type = 'submit'; button.setAttribute('disabled', ''); await view.advance(500); assert.equal(view.bannerCount(form), 0);
  button.removeAttribute('disabled'); form.id = 'new-owner'; await view.advance(500); assert.equal(view.bannerCount(form), 0);
  button.setAttribute('form', 'new-owner'); field.setAttribute('form', 'new-owner'); await view.advance(500);
  assert.equal(view.bannerCount(form), 1);
  field.type = 'text'; await view.advance(500); assert.equal(view.bannerCount(form), 0);
  button.setAttribute('formaction', 'mailto:test@example.invalid'); await view.advance(500);
  assert.equal(view.forms(), false);
});

test('head base additions, href changes, and removals update relative destinations', async () => {
  const view = await dynamicContent(); const form = view.create('form', { action: 'send' });
  view.create('input', { type: 'password' }, form); await view.advance(500);
  assert.equal(view.bannerCount(form), 0);
  const base = view.create('base', { href: 'http://base.example/' }, view.document.head);
  await view.advance(500); assert.equal(view.bannerCount(form), 1);
  base.setAttribute('href', 'https://base.example/'); await view.advance(500); assert.equal(view.bannerCount(form), 0);
  base.setAttribute('href', 'http://base.example/'); await view.advance(500);
  base.remove(); await view.advance(500); assert.equal(view.bannerCount(form), 0);
  assert.equal(view.observer.target, view.document);
});

test('warning insertion/removal does not feed scans; external removal repairs once', async () => {
  const view = await dynamicContent(); const form = view.create('form', { action: 'http://other.example/' });
  view.create('input', { type: 'password' }, form); await view.advance(500);
  const count = view.writes.length; await view.advance(5000); assert.equal(view.writes.length, count);
  form.querySelector('[data-pm-banner]').remove(); await view.advance(500);
  assert.equal(view.bannerCount(form), 1); assert.equal(view.writes.length, count + 1);
  await view.advance(5000); assert.equal(view.writes.length, count + 1);
  form.setAttribute('action', 'https://secure.example/'); await view.advance(500);
  assert.equal(view.bannerCount(form), 0); await view.advance(5000); assert.equal(view.writes.length, count + 2);
});

test('mutation bursts do no synchronous subtree queries and use one timer without starvation', async () => {
  const view = await dynamicContent(); const form = view.create('form'); await view.advance(500);
  const queries = view.queries, count = view.writes.length;
  for (let i = 0; i < 2000; i++) form.setAttribute('action', i % 2 ? 'https://secure.example/' : 'http://other.example/');
  await view.settle(); assert.equal(view.queries, queries); assert.equal(view.timers.size, 1);
  await view.advance(400); form.setAttribute('action', 'http://other.example/'); await view.advance(100);
  assert.equal(view.writes.length, count + 1); assert.equal(view.forms().insecureForms, 1);
  await view.advance(5000); assert.equal(view.writes.length, count + 1);
});

test('slow or failed writes allow one follow-up scan using the latest DOM, without backlog', async () => {
  const view = await dynamicContent(); const form = view.create('form'); await view.advance(500);
  const pending = deferred(); view.controls.write = () => pending.promise;
  form.setAttribute('action', 'http://other.example/'); await view.advance(500);
  const count = view.writes.length;
  for (let i = 0; i < 20; i++) { form.setAttribute('action', 'https://secure.example/'); await view.advance(500); }
  assert.equal(view.writes.length, count); assert.equal(view.timers.size, 0);
  view.controls.write = async () => {}; pending.reject(new Error('Do not log sensitive browser errors'));
  await view.settle(); assert.equal(view.timers.size, 1); await view.advance(500);
  assert.equal(view.writes.length, count + 1); assert.equal(view.forms().insecureForms, 0);
  assert.deepEqual(view.logs, []);
});

test('explicit refresh consumes a pending dynamic scan and irrelevant attributes stay quiet', async () => {
  const view = await dynamicContent(); const form = view.create('form'); await view.advance(500);
  const count = view.writes.length;
  form.setAttribute('action', 'http://other.example/'); await view.settle();
  await view.context.analyzePage(); await view.advance(5000); assert.equal(view.writes.length, count + 1);
  form.setAttribute('class', 'new'); form.setAttribute('style', 'display:block'); form.setAttribute('href', '/ignored');
  await view.advance(5000); assert.equal(view.writes.length, count + 1);
});

test('shared password handlers survive reinsertion, switching, type changes, and body replacement', async () => {
  const view = await dynamicContent(); const field = view.create('input', { type: 'password' });
  field.value = 'synthetic-only'; view.fire('focusin', field);
  assert.equal(view.document.querySelectorAll('[id="pm-password-indicator"]').length, 1);
  for (let i = 0; i < 20; i++) { field.remove(); view.document.body.appendChild(field); }
  await view.advance(500);
  assert.equal(view.events.input.length, 1); assert.equal(view.events.focusin.length, 1);
  view.fire('input', field); field.type = 'text'; await view.advance(500);
  assert.equal(vm.runInContext('activePasswordInput', view.context), null);
  assert.equal(view.document.querySelector('[id="pm-password-indicator"]').style.display, 'none');
  field.type = 'password'; await view.advance(500);
  assert.equal(vm.runInContext('activePasswordInput', view.context), field);
  const next = view.create('input', { type: 'password' }); next.value = 'different-synthetic';
  view.fire('input', field); view.fire('focusout', field); view.fire('focusin', next); await view.advance(300);
  assert.equal(vm.runInContext('activePasswordInput', view.context), next);
  const oldIndicator = view.document.querySelector('[id="pm-password-indicator"]'); oldIndicator.remove();
  await view.advance(500); assert.equal(view.document.querySelectorAll('[id="pm-password-indicator"]').length, 1);
  assert.notEqual(view.document.querySelector('[id="pm-password-indicator"]'), oldIndicator);
  view.document.body.remove(); view.document.body = view.create('body', {}, view.document.documentElement);
  await view.advance(500); assert.equal(vm.runInContext('activePasswordInput', view.context), null);
  assert.equal(vm.runInContext('indicator', view.context), null);
  assert.equal(view.timers.size, 0);
  assert.doesNotMatch(JSON.stringify(view.writes), /synthetic-only|different-synthetic/);
});

test('private dynamic scans keep warnings local and password feedback does not trigger repeated scans', async () => {
  const view = await dynamicContent({ privacy: true });
  const form = view.create('form', { action: 'http://other.example/' }); const field = view.create('input', { type: 'password' }, form);
  await view.advance(500); assert.equal(view.bannerCount(form), 1);
  field.value = 'synthetic'; view.fire('focusin', field); await view.advance(500);
  const queries = view.queries;
  for (let i = 0; i < 20; i++) view.fire('input', field);
  await view.advance(5000); assert.equal(view.queries, queries); assert.equal(view.timers.size, 0);
  field.remove(); await view.advance(500); assert.equal(view.bannerCount(form), 0);
  assert.equal(vm.runInContext('activePasswordInput', view.context), null);
  assert.deepEqual(view.writes, []); assert.deepEqual(view.logs, []);
});
