import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { Node } from './request-details.mjs';
export const read = p => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
export const plain = x => JSON.parse(JSON.stringify(x));
export const settle = () => new Promise(resolve => setImmediate(resolve));
export const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
export function harness() {
  const events = {}, calls = [], handlers = {};
  const nodes = Object.fromEntries([...read('details/cookies.html').matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Node()]));
  const doc = { nodes, hidden: false, createElement: tag => new Node(tag),
    getElementById: id => nodes[id], addEventListener: (name, fn) => (handlers[name] ||= []).push(fn),
    emit: name => (handlers[name] || []).forEach(fn => fn()) };
  const controls = { permission: true, grant: true, empty: false,
    tab: { id: 1, windowId: 1, active: true, incognito: false, cookieStoreId: 'firefox-container-2',
      url: 'https://www.example.com/account?secret=yes' } };
  const event = name => {
    const set = new Set(); events[name] = (...args) => [...set].forEach(fn => fn(...args));
    return { addListener: fn => set.add(fn), removeListener: fn => set.delete(fn), listeners: set };
  };
  function cookie(extra = {}) {
    const c = { domain: '.example.com', hostOnly: false, storeId: controls.tab.cookieStoreId, firstPartyDomain: '',
      session: true, secure: true, httpOnly: true, sameSite: 'lax', ...extra };
    for (const key of ['value','name','path']) Object.defineProperty(c, key, { get() { throw Error('Secret accessed'); } });
    return c;
  }
  const api = { runtime: { getManifest: () => ({ optional_permissions: ['cookies'] }) },
    permissions: { contains: async () => controls.permission,
      request: () => { calls.push('grant'); return Promise.resolve(controls.grant); }, onRemoved: event('permission') },
    tabs: { query: async () => [{ ...controls.tab }], onActivated: event('activated'), onRemoved: event('closed'), onReplaced: event('replaced') },
    windows: { onFocusChanged: event('focus') }, webNavigation: { onBeforeNavigate: event('navigate') },
    cookies: { getAll: async query => {
      calls.push('cookies');
      if (controls.empty) return [];
      return query.partitionKey ? [cookie({ partitionKey: query.partitionKey, session: false, expirationDate: 2000000000,
        sameSite: 'no_restriction' })] :
        [cookie(), cookie({ session: false, sameSite: 'future', secure: false, httpOnly: false })];
    } },
  };
  const context = vm.createContext({ URL, document: doc, crypto: { randomUUID: () => 'inspector-test' },
    fetch() { throw Error('No network'); }, get localStorage() { throw Error('No storage'); } });
  for (const file of ['vendor/tldts/index.umd.min.js','lib/site-domains.js','analysis-records.js',
    'lib/cookie-metadata.js','details/cookies-view.js','details/cookies-page.js']) vm.runInContext(read(file), context);
  const store = context.PrivacyMonitorAnalysis.createStore({ now: () => 100 });
  store.begin(controls.tab, { documentId: '00000000-0000-4000-8000-000000000001' });
  const reader = context.PrivacyMonitorCookieMetadata.create({ api, store });
  api.runtime.getBackgroundPage = async () => ({ PrivacyMonitorAnalysisStore: store });
  const view = context.PrivacyMonitorCookieView.mount(doc);
  const start = (r = reader) => context.PrivacyMonitorCookiePage.start({ api, reader: r, doc });
  return { doc, context, controls, reader, store, api, events, calls, view, start };
}
export async function fixture() {
  const h = harness(), output = plain(await h.reader.readActive()); h.reader.dispose(); return output;
}
