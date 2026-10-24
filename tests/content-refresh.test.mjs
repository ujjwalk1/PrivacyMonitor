import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { popup, deferred } from './helpers/popup.mjs';

const source = readFileSync(new URL('../content-script.js', import.meta.url), 'utf8');
const message = { channel: 'privacy-monitor.scan', version: 1, type: 'refresh' };
const sender = { id: 'fixture-extension', url: 'moz-extension://fixture/popup.html' };
const tick = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));

function content({ ready = true, privacy = false, url = 'https://fixture.example/', crypto = webcrypto } = {}) {
  const events = {}, writes = [], logs = [], stored = {}, timers = new Map();
  let timerId = 0;
  const form = {
    action: 'http://fixture.example/submit', password: true, attributes: {}, banners: [],
    getAttribute(name) { return name === 'action' ? this.action : this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelector(selector) { return selector === 'input[type="password"]' ? (this.password ? {} : null) : this.banners[0] ?? null; },
    querySelectorAll() { return [...this.banners]; },
    insertBefore(banner) { this.banners.unshift(banner); banner.remove = () => { this.banners = this.banners.filter(b => b !== banner); }; },
  };
  const controls = { write: async data => Object.assign(stored, plain(data)), scripts: [] };
  const document = {
    readyState: ready ? 'complete' : 'loading', body: {}, cookie: '', URL: url, baseURI: url,
    addEventListener(name, fn) { events[name] = fn; },
    querySelectorAll(selector) {
      if (selector === 'form') return [form];
      if (selector === 'button, input') return form.password ? [{ tagName: 'INPUT', type: 'password', form }] : [];
      if (selector === 'script' || selector === 'script[src]') return controls.scripts;
      return []; // Password presence is a form fixture; no password value is supplied.
    },
    createElement() { return { style: {}, setAttribute() {} }; },
  };
  form.ownerDocument = document;
  const context = vm.createContext({ document, URL, crypto,
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    window: { location: new URL(url) },
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    browser: {
      extension: { inIncognitoContext: privacy },
      runtime: { id: sender.id, getURL: path => `moz-extension://fixture/${path}`,
        onMessage: { addListener(fn) { events.message = fn; } } },
      storage: { onChanged: { addListener() {} }, local: {
        get: async () => ({}), set(data) { writes.push(plain(data)); return controls.write(data); } } },
    },
    MutationObserver: class { constructor(fn) { events.mutation = fn; } observe() {} disconnect() {} },
  });
  vm.runInContext(readFileSync(new URL('../settings.js', import.meta.url), 'utf8'), context);
  vm.runInContext(source, context, { filename: 'content-script.js' });
  return { events, writes, logs, stored, controls, form, context,
    async flushDynamic() { const pending = [...timers.values()]; timers.clear(); for (const fn of pending) await fn(); await tick(); },
    refresh: () => events.message(message, sender) };
}

test('startup and refresh share collection and commit both legacy records in one awaited write', async () => {
  const view = content(); await tick();
  assert.equal(view.writes.length, 1);
  assert.deepEqual(Object.keys(view.writes[0]).sort(), ['forms_fixture.example', 'security_data_fixture.example']);
  const write = deferred(); view.controls.write = () => write.promise;
  let finished = false;
  const refresh = view.refresh().then(reply => { finished = true; return reply; });
  await tick(); assert.equal(view.writes.length, 2); assert.equal(finished, false);
  write.resolve(); const reply = await refresh;
  assert.deepEqual(plain(reply), { channel: message.channel, version: 1, ok: true });
});

test('refresh preserves warnings, recreates removed banners, and clears obsolete warnings', async () => {
  const view = content(); await tick(); const original = view.form.banners[0];
  assert.equal(view.form.banners.length, 1);
  await view.refresh(); assert.equal(view.form.banners[0], original);
  original.remove(); assert.equal(view.form.attributes['data-pm-warned'], '1');
  await view.refresh(); assert.equal(view.form.banners.length, 1);
  delete view.form.attributes['data-pm-warned']; await view.refresh();
  assert.equal(view.form.banners.length, 1, 'A missing marker cannot duplicate an existing banner');
  view.form.action = 'https://fixture.example/submit'; await view.refresh();
  assert.equal(view.form.banners.length, 0);
  assert.equal(view.form.attributes['data-pm-warned'], undefined);
  assert.equal(view.stored['forms_fixture.example'].insecurePasswordForms, 0);
  view.form.action = 'http://fixture.example/submit'; await view.refresh();
  assert.equal(view.form.banners.length, 1);
  view.form.password = false; await view.refresh();
  assert.equal(view.form.banners.length, 0);
  assert.equal(view.stored['forms_fixture.example'].insecureForms, 1);
});

test('an unsupported destination persists unavailable and clears the popup score on refresh', async () => {
  const page = content(); await tick();
  page.form.action = 'mailto:fixture@example.invalid';
  const view = popup();
  view.controls.storage = async () => ({ ...view.stored, ...page.stored });
  view.controls.identity = (tabId, request) => page.events.message(request, sender);
  view.controls.scan = async () => page.refresh();
  await view.context.refreshData();
  assert.equal(page.stored['forms_fixture.example'], false);
  assert.equal(page.form.banners.length, 0);
  assert.equal(view.nodes['score-text'].textContent, '—');
  assert.match(view.nodes['forms-body'].innerHTML, /unavailable/);
  assert.deepEqual(page.logs, []);
});

test('concurrent refreshes serialize writes and retry after storage failure without logging page data', async () => {
  const view = content(); await tick();
  const write = deferred(); let attempts = 0;
  view.controls.write = async data => { if (++attempts === 1) await write.promise; else Object.assign(view.stored, plain(data)); };
  const first = view.refresh(), second = view.refresh(); await tick();
  assert.equal(attempts, 1);
  write.reject(new Error('Sensitive browser error must not be logged'));
  assert.equal((await first).error, 'scan-unavailable');
  assert.equal((await second).ok, true); assert.equal(attempts, 2);
  assert.deepEqual(view.logs, []);
});

test('only exact popup messages can request scans; unknown channels do not consume a reply', async () => {
  const view = content({ ready: false });
  assert.equal(view.events.message({ channel: 'other' }, sender), undefined);
  assert.equal((await view.refresh()).error, 'not-ready');
  for (const untrusted of [undefined, { ...sender, id: 'other' }, { ...sender, url: 'https://fixture.example/' },
    { ...sender, url: sender.url + '#suffix' }, { ...sender, tab: { id: 1 } }]) {
    assert.equal((await view.events.message(message, untrusted)).error, 'forbidden');
  }
  for (const invalid of [{ ...message, version: 2 }, { ...message, type: 'write' }, { ...message, tabId: 2 }]) {
    assert.equal((await view.events.message(invalid, sender)).error, 'invalid-request');
  }
  assert.equal(view.writes.length, 0);
  view.events.DOMContentLoaded(); view.events.DOMContentLoaded(); await tick();
  assert.equal(view.writes.length, 1);
});

test('the existing form-addition observer invokes the same complete scan path', async () => {
  const view = content(); await tick(); view.controls.scripts = [{ src: 'https://third.example/script.js' }];
  view.events.mutation([{ type: 'childList', target: view.context.document.body }]); await view.flushDynamic();
  assert.equal(view.writes.length, 2);
  assert.equal(view.stored['security_data_fixture.example'].thirdPartyScripts, 1);
  assert.equal(view.stored['forms_fixture.example'].insecurePasswordForms, 1);
  assert.equal(view.form.banners.length, 1);
});

test('popup-to-content refresh waits for persistence and renders the same scan without removing warnings', async () => {
  const page = content(); await tick();
  const view = popup(); const write = deferred(), started = deferred();
  page.controls.write = async data => { started.resolve(); await write.promise; Object.assign(page.stored, plain(data)); };
  view.controls.storage = async () => ({ ...view.stored, ...page.stored });
  view.controls.identity = (tabId, request) => page.events.message(request, sender);
  view.controls.scan = async (tabId, request, options) => {
    assert.equal(tabId, 1); assert.deepEqual(plain(options), { frameId: 0 });
    return page.events.message(request, sender);
  };
  const refreshing = view.context.refreshData(); await started.promise;
  assert.equal(view.calls.storage, 0); assert.equal(page.form.banners.length, 1);
  write.resolve(); await refreshing;
  assert.equal(view.calls.scan, 1); assert.equal(view.calls.storage, 1);
  assert.equal(view.nodes['score-text'].textContent, '80');
  assert.equal(page.form.banners.length, 1);
  assert.equal((view.nodes['refresh'].attributes['aria-disabled'] === 'true'), false);
});

test('missing, malformed, or failed scan replies never trigger a stale read or score', async () => {
  for (const reply of [undefined, {}, { channel: 'other', version: 1, ok: true },
    { channel: message.channel, version: 2, ok: true }, { channel: message.channel, version: 1, ok: false }]) {
    const view = popup(); view.controls.scan = async () => reply;
    await view.context.refreshData();
    assert.equal(view.calls.storage, 0); assert.equal(view.calls.fetch, 0);
    assert.equal(view.nodes['score-text'].textContent, '—');
    assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'unavailable');
    assert.equal((view.nodes['refresh'].attributes['aria-disabled'] === 'true'), false);
  }
});

test('a superseded scan reply cannot reload or overwrite a newer unsupported popup', async () => {
  const view = popup(), pending = deferred(), started = deferred();
  view.controls.scan = () => { started.resolve(); return pending.promise; };
  const refreshing = view.context.refreshData(); await started.promise;
  view.controls.query = async () => [{ id: 1, url: 'about:config' }]; await view.context.loadAllData();
  pending.resolve({ channel: message.channel, version: 1, ok: true }); await refreshing;
  assert.equal(view.calls.storage, 0);
  assert.equal(view.nodes['loading-screen'].attributes['data-state'], 'unsupported');
});

test('new normal-context records omit URL history and cookie values while preserving preferences', async () => {
  const view = content({ ready: false, url: 'https://fixture.example/private/path?secret=example#sensitive' });
  view.stored.preference = { enabled: true };
  view.context.document.cookie = 'session=never-store-this; other=secret-cookie';
  view.events.DOMContentLoaded(); await tick(); await view.refresh();
  for (const write of view.writes) {
    const data = write['security_data_fixture.example'];
    assert.equal(Object.hasOwn(data, 'url'), false); assert.equal(data.cookies, 2);
    assert.doesNotMatch(JSON.stringify(write), /private\/path|secret=|sensitive|never-store-this|secret-cookie/);
  }
  assert.deepEqual(view.stored.preference, { enabled: true });
});

test('private and unknown content contexts keep warnings local without any persistent write', async () => {
  for (const privacy of [true, null, 'false', 0, 'missing-api']) {
    const view = content({ ready: false, privacy });
    if (privacy === 'missing-api') delete view.context.browser.extension;
    view.stored.preference = { enabled: true };
    view.controls.write = () => { throw new Error('Must not persist private observations'); };
    view.events.DOMContentLoaded(); await tick();
    assert.equal(view.form.banners.length, 1);
    view.form.banners[0].remove(); assert.equal((await view.refresh()).ok, true);
    assert.equal(view.form.banners.length, 1);
    view.events.mutation([{ type: 'childList', target: view.context.document.body }]); await view.flushDynamic();
    assert.equal(view.writes.length, 0); assert.deepEqual(view.stored, { preference: { enabled: true } });
    assert.deepEqual(view.logs, []);
  }
});

test('document identity is stable across scans, distinct across documents, and read-only on HTTP', async () => {
  const first = content({ url: 'http://fixture.example/' }), second = content({ url: 'http://fixture.example/' });
  await tick();
  const request = { ...message, type: 'identity' };
  const a = await first.events.message(request, sender), b = await second.events.message(request, sender);
  assert.match(a.sourceToken, /^[a-f0-9]{32}$/);
  assert.notEqual(a.sourceToken, b.sourceToken);
  assert.equal(first.writes.length, 1, 'Identity does not rescan or persist');
  for (const key of ['security_data_fixture.example', 'forms_fixture.example']) {
    assert.equal(first.stored[key].sourceToken, a.sourceToken);
  }
  await first.refresh();
  assert.equal((await first.events.message(request, sender)).sourceToken, a.sourceToken);
  assert.equal(first.stored['forms_fixture.example'].sourceToken, a.sourceToken);
});

test('identity rejects unauthorized, malformed, unready, private and unavailable-crypto contexts', async () => {
  const request = { ...message, type: 'identity' }, view = content({ ready: false });
  assert.equal((await view.events.message(request, sender)).error, 'not-ready');
  for (const untrusted of [undefined, { ...sender, id: 'other' }, { ...sender, url: 'https://fixture.example/' },
    { ...sender, url: sender.url + '#suffix' }, { ...sender, tab: { id: 1 } }]) {
    assert.equal((await view.events.message(request, untrusted)).error, 'forbidden');
  }
  for (const invalid of [{ ...request, version: 2 }, { ...request, sourceToken: 'caller-token' }]) {
    assert.equal((await view.events.message(invalid, sender)).error, 'invalid-request');
  }
  for (const options of [{ privacy: true }, { privacy: null }, { crypto: null },
    { crypto: { getRandomValues() { throw new Error('Unavailable'); } } }]) {
    const page = content(options); await tick();
    const reply = await page.events.message(request, sender);
    assert.equal(reply.ok, false); assert.equal(reply.error, 'identity-unavailable');
    assert.equal(reply.sourceToken, undefined);
    assert.equal(page.form.banners.length, 1, 'Local warnings remain usable');
  }
});

test('real content producers sharing storage cannot mix another document into the popup score', async () => {
  const a = content(), b = content();
  a.form.action = 'https://fixture.example/submit';
  await tick();
  const view = popup(), shared = { ...view.stored, ...a.stored };
  a.controls.write = async data => Object.assign(shared, plain(data));
  b.controls.write = async data => Object.assign(shared, plain(data));
  view.controls.storage = async () => ({ ...shared });
  view.controls.identity = (tabId, request, options) => {
    assert.equal(tabId, 1); assert.deepEqual(plain(options), { frameId: 0 });
    return a.events.message(request, sender);
  };
  view.controls.scan = (tabId, request) => a.events.message(request, sender);
  await view.context.loadAllData(); assert.equal(view.nodes['score-text'].textContent, '100');
  await b.refresh();
  await view.context.loadAllData(); assert.equal(view.nodes['score-text'].textContent, '—');
  await view.context.refreshData(); assert.equal(view.nodes['score-text'].textContent, '100');
});
