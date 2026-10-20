import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const html = read('popup.html');
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export function popup(headerData = {
  present: { CSP: 'fixture', HSTS: 'fixture', 'X-Frame-Options': 'fixture',
    'X-Content-Type-Options': 'fixture', 'Referrer-Policy': 'fixture', 'Permissions-Policy': 'fixture' },
  missing: [],
}, { consented = false, background } = {}) {
  const nodes = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, {
    style: {}, attributes: {}, textContent: '', innerHTML: '',
    setAttribute(name, value) { this.attributes[name] = value; },
    insertAdjacentHTML(position, value) { this.innerHTML += value; },
  }]));
  const errors = [];
  const stored = {
    'security_data_fixture.example': { httpsOnly: true, protocol: 'https:', cookies: 0, scripts: 0, thirdPartyScripts: 0 },
    'headers_fixture.example': headerData,
    'forms_fixture.example': { insecureForms: 0, insecurePasswordForms: 0 },
  };
  let lastStored = stored;
  const response = deferred();
  const requested = deferred();
  const permissionEvents = { added: [], removed: [] };
  const permissions = { data_collection: consented ? ['browsingActivity'] : [] };
  function emitPermission(event, data = { data_collection: ['browsingActivity'] }) {
    for (const listener of permissionEvents[event]) listener(data);
  }
  const controls = {
    getPermissions: async () => structuredClone(permissions),
    requestPermission: async () => { permissions.data_collection = ['browsingActivity']; emitPermission('added'); return true; },
    removePermission: async () => { permissions.data_collection = []; emitPermission('removed'); return true; },
    query: async () => [{ id: 1, url: 'https://fixture.example/', incognito: false }],
    storage: async () => stored,
    fetch: () => response.promise,
    scan: async () => ({ channel: 'privacy-monitor.scan', version: 1, ok: true }),
  };
  const calls = { storage: 0, fetch: 0, scan: 0 };
  const timers = [];
  let clock = 0;
  function advanceTime(ms) {
    clock += ms;
    for (const timer of [...timers]) {
      if (timer.due > clock) continue;
      timers.splice(timers.indexOf(timer), 1);
      timer();
    }
  }
  const context = vm.createContext({
    URL, AbortController,
    Date: class extends Date { static now() { return clock; } },
    console: { error: (...args) => errors.push(args), warn() {} },
    setTimeout(fn, ms) { fn.due = clock + ms; timers.push(fn); return fn; },
    clearTimeout(timer) { const i = timers.indexOf(timer); if (i !== -1) timers.splice(i, 1); },
    browser: {
      permissions: {
        getAll: (...args) => controls.getPermissions(...args),
        request: (...args) => controls.requestPermission(...args),
        remove: (...args) => controls.removePermission(...args),
        onAdded: { addListener: fn => permissionEvents.added.push(fn) },
        onRemoved: { addListener: fn => permissionEvents.removed.push(fn) },
      },
      tabs: { query: (...args) => controls.query(...args),
        sendMessage: (...args) => { calls.scan++; return controls.scan(...args); } },
      storage: { local: { get: (...args) => { calls.storage++; return Promise.resolve(controls.storage(...args)).then(result => { lastStored = result; return result; }); } } },
    },
    document: {
      addEventListener() {},
      getElementById(id) { assert.ok(nodes[id], `Missing popup element: ${id}`); return nodes[id]; },
    },
    fetch(...args) { calls.fetch++; requested.resolve(); return controls.fetch(...args); },
  });
  if (!background) {
    background = vm.createContext({ URL, AbortController, Date: context.Date,
      browser: context.browser, fetch: context.fetch,
      setTimeout: context.setTimeout, clearTimeout: context.clearTimeout });
    for (const path of ['popup-state.js', 'breach-service.js']) vm.runInContext(read(path), background, { filename: path });
  }
  controls.analysis = async message => {
    const key = Object.keys(lastStored ?? {}).find(key => key.startsWith('headers_'));
    const hostname = key?.slice(8) || 'fixture.example';
    const header = lastStored?.[key];
    const mapping = vm.runInContext('data => PrivacyMonitorPopupState.local({headerData: data}).headers', context)(header);
    return { channel: message.channel, version: 1, ok: true, kind: 'record', record: {
      schemaVersion: 1, tabId: message.tabId, page: { hostname, protocol: 'https:' },
      observations: { headers: header === undefined ? { kind: 'not-observed', data: null } :
        { kind: 'observed', data: Object.fromEntries(mapping.map(({name,kind}) => [name,kind])) } },
    } };
  };
  context.browser.runtime = { getBackgroundPage: async () => background, sendMessage: (...args) => controls.analysis(...args) };
  for (const [, path] of html.matchAll(/<script\s+src="([^"]+)"/g)) {
    vm.runInContext(read(path), context, { filename: path });
  }
  return { context, background, nodes, stored, controls, calls, timers, advanceTime, permissions, emitPermission,
    requested: requested.promise, finishFetch: response.resolve, errors };
}

// Earlier outcome/scoring tests explicitly model an already consenting installation.
export function consentedPopup(headerData) { return popup(headerData, { consented: true }); }
