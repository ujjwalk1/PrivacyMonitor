import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dynamicContent } from './helpers/dynamic-content.mjs';
import { deferred } from './helpers/popup.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const KEY = 'privacy_monitor_display_settings_v1';
const enabled = { version: 1, passwordFeedback: true, formWarnings: true };
const disabled = { version: 1, passwordFeedback: false, formWarnings: false };
const plain = value => JSON.parse(JSON.stringify(value));
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function options(stored = {}) {
  const writes = [], logs = [], events = {};
  const nodes = Object.fromEntries([...read('options.html').matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
    checked: false, disabled: true, textContent: '', listeners: {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
  }]));
  const controls = { get: async key => ({ [key]: stored[key] }), set: async data => Object.assign(stored, plain(data)) };
  const context = vm.createContext({
    browser: { storage: { local: { get: (...args) => controls.get(...args),
      set: data => { writes.push(plain(data)); return controls.set(data); } } } },
    document: { getElementById: id => nodes[id], addEventListener: (name, fn) => { events[name] = fn; } },
    console: { error: (...args) => logs.push(args), log: (...args) => logs.push(args) },
    fetch: () => assert.fail('Settings must not use a network request'),
  });
  for (const file of ['settings.js', 'options.js']) vm.runInContext(read(file), context);
  return { context, nodes, controls, writes, logs, stored, boot: () => events.DOMContentLoaded(),
    save: () => nodes['settings-form'].listeners.submit({ preventDefault() {} }),
    reset: () => nodes['restore-defaults'].listeners.click() };
}

test('settings distinguish absent defaults, valid saved booleans, and invalid/unavailable data', async () => {
  const view = options(); const settings = view.context.PrivacyMonitorSettings;
  assert.deepEqual(plain(settings.normalize(undefined)), enabled);
  assert.deepEqual(plain(settings.normalize(disabled)), disabled);
  for (const value of [null, [], {}, { ...enabled, version: 2 }, { ...enabled, formWarnings: 'false' },
    { ...enabled, excludedSites: ['example.invalid'] }, { version: 1, passwordFeedback: true, unknown: true }]) {
    assert.equal(settings.normalize(value), null);
  }
  for (const response of [null, [], false]) {
    view.controls.get = async () => response;
    assert.equal(await settings.read(view.context.browser), null);
  }
  view.controls.get = async () => { throw new Error('Sensitive storage message'); };
  assert.equal(await settings.read(view.context.browser), null); assert.deepEqual(view.logs, []);
});

test('options save only display preferences and a fresh context restores them without changing consent or scan rows', async () => {
  const stored = { otherPreference: 'keep', breachConsent: 'keep', forms_fixture: { insecureForms: 1 } };
  const view = options(stored); await view.boot(); assert.equal(view.writes.length, 0);
  assert.equal(view.nodes['password-feedback'].checked, true); assert.equal(view.nodes['form-warnings'].checked, true);
  view.nodes['password-feedback'].checked = false; view.nodes['form-warnings'].checked = false;
  view.save(); await settle(); assert.deepEqual(view.writes, [{ [KEY]: disabled }]);
  assert.deepEqual(stored, { otherPreference: 'keep', breachConsent: 'keep', forms_fixture: { insecureForms: 1 }, [KEY]: disabled });
  const restarted = options(stored); await restarted.boot();
  assert.equal(restarted.nodes['password-feedback'].checked, false); assert.equal(restarted.nodes['form-warnings'].checked, false);
  const page = await dynamicContent({ preferences: stored[KEY] });
  const form = page.create('form', { action: 'http://other.example/' }); page.create('input', { type: 'password' }, form);
  await page.advance(500); assert.equal(page.bannerCount(form), 0); assert.equal(page.forms().insecurePasswordForms, 1);
});

test('save acknowledgement is awaited, duplicate saves are blocked, and failures stay visible', async () => {
  const view = options(); await view.boot(); const pending = deferred(); view.controls.set = () => pending.promise;
  view.save(); view.save(); view.reset(); assert.equal(view.writes.length, 1);
  assert.equal(view.nodes['save-settings'].disabled, true); assert.match(view.nodes['settings-status'].textContent, /Saving/);
  pending.reject(new Error('Storage detail must not be logged')); await settle();
  assert.match(view.nodes['settings-status'].textContent, /Could not save/); assert.equal(view.nodes['save-settings'].disabled, false);
  assert.deepEqual(view.logs, []);
  view.controls.set = async data => Object.assign(view.stored, plain(data)); view.save(); await settle();
  assert.match(view.nodes['settings-status'].textContent, /Settings saved/);
});

test('unreadable settings cannot be silently overwritten; explicit restore repairs only the owned key', async () => {
  const stored = { [KEY]: { version: 999 }, preference: 'keep' }; const view = options(stored);
  await view.boot(); assert.equal(view.nodes['display-controls'].disabled, true);
  assert.match(view.nodes['settings-status'].textContent, /could not be loaded/); view.save(); assert.equal(view.writes.length, 0);
  view.reset(); await settle(); assert.deepEqual(stored, { [KEY]: enabled, preference: 'keep' });
  assert.equal(view.nodes['display-controls'].disabled, false);
});

test('pending startup read cannot overwrite a newer disabled choice or briefly inject UI', async () => {
  const pending = deferred(); const view = await dynamicContent({ readSettings: () => pending.promise });
  const form = view.create('form', { action: 'http://other.example/' }); const field = view.create('input', { type: 'password' }, form);
  let valueReads = 0; Object.defineProperty(field, 'value', { get() { valueReads++; return 'must-not-read'; } });
  view.fire('focusin', field); assert.equal(view.writes.length, 0); assert.equal(view.bannerCount(form), 0);
  view.changeSettings(disabled); pending.resolve({ [KEY]: enabled }); await view.advance(500);
  assert.equal(view.bannerCount(form), 0); assert.equal(view.forms().insecurePasswordForms, 1); assert.equal(valueReads, 0);
  assert.equal(view.document.querySelector('[id="pm-password-indicator"]'), null);
});

test('disabling hints cancels pending feedback and removes UI even while a scan write is pending', async () => {
  const view = await dynamicContent(); const form = view.create('form', { action: 'http://other.example/' });
  const field = view.create('input', { type: 'password' }, form); field.value = 'synthetic-only';
  view.fire('focusin', field); await view.advance(500); assert.equal(view.bannerCount(form), 1);
  const pending = deferred(); view.controls.write = () => pending.promise;
  form.setAttribute('method', 'post'); await view.advance(500);
  view.fire('input', field); view.changeSettings(disabled);
  assert.equal(view.bannerCount(form), 0); assert.equal(form.getAttribute('data-pm-warned'), null);
  assert.equal(view.document.querySelector('[id="pm-password-indicator"]'), null);
  assert.equal(vm.runInContext('activePasswordInput', view.context), null);
  assert.equal(vm.runInContext('passwordFeedbackTimer', view.context), null);
  view.controls.write = async () => {}; pending.resolve(); await view.advance(1000);
  assert.equal(view.forms().insecurePasswordForms, 1, 'Hidden warnings must not become clean form observations');
  view.changeSettings(enabled); await view.advance(500);
  assert.equal(view.bannerCount(form), 1);
  assert.equal(view.document.querySelectorAll('[id="pm-password-indicator"]').length, 1);
  view.changeSettings(enabled); await view.advance(500); assert.equal(view.bannerCount(form), 1);
  assert.doesNotMatch(JSON.stringify(view.writes), /synthetic-only/);
});

test('each display control acts independently and unrelated storage events do not change settings', async () => {
  const view = await dynamicContent(); const form = view.create('form', { action: 'http://other.example/' });
  const field = view.create('input', { type: 'password' }, form); field.value = 'synthetic'; view.fire('focusin', field);
  await view.advance(500);
  view.changeSettings({ ...enabled, passwordFeedback: false }); await view.advance(500);
  assert.equal(view.bannerCount(form), 1); assert.equal(view.document.querySelector('[id="pm-password-indicator"]'), null);
  view.changeSettings({ ...enabled, formWarnings: false }); await view.advance(500);
  assert.equal(view.bannerCount(form), 0); assert.equal(view.document.querySelectorAll('[id="pm-password-indicator"]').length, 1);
  view.changeSettings(enabled, 'sync'); await view.advance(500); assert.equal(view.bannerCount(form), 0);
  view.changeSettings(undefined); await view.advance(500); assert.equal(view.bannerCount(form), 1, 'Deleting the preference key restores defaults');
});

test('invalid or failed preference reads suppress hints while local observations still work', async () => {
  for (const readSettings of [async () => ({ [KEY]: { ...enabled, version: 2 } }), async () => { throw new Error('Private error'); }]) {
    const view = await dynamicContent({ readSettings }); const form = view.create('form', { action: 'http://other.example/' });
    const field = view.create('input', { type: 'password' }, form);
    Object.defineProperty(field, 'value', { get() { assert.fail('Disabled feedback must not read passwords'); } });
    view.fire('focusin', field); view.fire('input', field); await view.advance(500);
    assert.equal(view.bannerCount(form), 0); assert.equal(view.forms().insecurePasswordForms, 1);
    assert.deepEqual(view.logs, []);
  }
});

test('private pages apply display settings without storing scan data or preferences', async () => {
  const view = await dynamicContent({ privacy: true }); const form = view.create('form', { action: 'http://other.example/' });
  view.create('input', { type: 'password' }, form); await view.advance(500); assert.equal(view.bannerCount(form), 1);
  view.changeSettings(disabled); await view.advance(500); assert.equal(view.bannerCount(form), 0);
  view.changeSettings(enabled); await view.advance(500); assert.equal(view.bannerCount(form), 1);
  assert.deepEqual(view.writes, []);
});

test('popup settings link opens the native options page and reports an opening failure', async () => {
  const nodes = Object.fromEntries([...read('popup.html').matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
    listeners: {}, hidden: true, textContent: '', addEventListener(name, fn) { this.listeners[name] = fn; },
  }]));
  let boot, calls = 0;
  const context = vm.createContext({ browser: { runtime: { openOptionsPage: async () => { calls++; } } },
    document: { addEventListener(name, fn) { boot = fn; }, getElementById: id => nodes[id] } });
  vm.runInContext(read('popup.js'), context);
  vm.runInContext('loadAllData = () => {}', context); boot();
  await nodes['open-settings'].listeners.click(); assert.equal(calls, 1); assert.equal(nodes['settings-error'].hidden, true);
  context.browser.runtime.openOptionsPage = async () => { throw new Error('Hidden details'); };
  await nodes['open-settings'].listeners.click(); assert.equal(nodes['settings-error'].hidden, false);
  assert.match(nodes['settings-error'].textContent, /Firefox/); assert.doesNotMatch(nodes['settings-error'].textContent, /Hidden details/);
});
