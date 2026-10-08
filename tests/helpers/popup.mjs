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
}) {
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
  const response = deferred();
  const requested = deferred();
  const controls = {
    query: async () => [{ id: 1, url: 'https://fixture.example/' }],
    storage: async () => stored,
    fetch: () => response.promise,
    executeScript: async () => {},
  };
  const calls = { storage: 0, fetch: 0, executeScript: 0 };
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
    console: { error: (...args) => errors.push(args), warn() {} },
    setTimeout(fn, ms) { fn.due = clock + ms; timers.push(fn); return fn; },
    clearTimeout(timer) { const i = timers.indexOf(timer); if (i !== -1) timers.splice(i, 1); },
    browser: {
      tabs: { query: (...args) => controls.query(...args) },
      storage: { local: { get: (...args) => { calls.storage++; return controls.storage(...args); } } },
      scripting: { executeScript: (...args) => { calls.executeScript++; return controls.executeScript(...args); } },
    },
    document: {
      addEventListener() {},
      getElementById(id) { assert.ok(nodes[id], `Missing popup element: ${id}`); return nodes[id]; },
    },
    fetch(...args) { calls.fetch++; requested.resolve(); return controls.fetch(...args); },
  });
  for (const [, path] of html.matchAll(/<script\s+src="([^"]+)"/g)) {
    vm.runInContext(read(path), context, { filename: path });
  }
  return { context, nodes, stored, controls, calls, timers, advanceTime,
    requested: requested.promise, finishFetch: response.resolve, errors };
}
