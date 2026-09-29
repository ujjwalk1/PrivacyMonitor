import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('popup.html');

function popup(headerData = {
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
  let finishFetch;
  let signalFetch;
  const response = new Promise(resolve => { finishFetch = resolve; });
  const requested = new Promise(resolve => { signalFetch = resolve; });
  const context = vm.createContext({
    URL,
    console: { error: (...args) => errors.push(args), warn() {} },
    browser: {
      tabs: { query: async () => [{ id: 1, url: 'https://fixture.example/' }] },
      storage: { local: { get: async () => stored } },
    },
    document: {
      addEventListener() {},
      getElementById(id) { assert.ok(nodes[id], `Missing popup element: ${id}`); return nodes[id]; },
    },
    fetch() { signalFetch(); return response; },
  });
  // Load in the real HTML order so a missing scorer or incorrect script order fails.
  for (const [, path] of html.matchAll(/<script\s+src="([^"]+)"/g)) {
    vm.runInContext(read(path), context, { filename: path });
  }
  return { context, nodes, stored, requested, finishFetch, errors };
}

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
