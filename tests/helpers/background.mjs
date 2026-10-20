import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
export function background() {
  const events = {}, registrations = {}, writes = [], pending = [], errors = [];
  const controls = { digest: (...args) => webcrypto.subtle.digest(...args) };
  const event = name => ({ addListener(fn, ...args) { events[name] = fn; registrations[name] = args; } });
  const context = vm.createContext({ URL, TextEncoder, AbortController,
    crypto: { randomUUID: () => webcrypto.randomUUID(), subtle: { digest(...args) {
      const promise = controls.digest(...args); pending.push(promise); return promise;
    } } },
    console: { error: (...args) => errors.push(args) },
    fetch: () => { throw new Error('Unexpected external lookup'); },
    browser: {
      runtime: { id: 'privacy-monitor@example.com', getURL: path => `moz-extension://fixture/${path}`,
        onMessage: event('message') },
      permissions: { getAll: async () => ({ data_collection: [] }), onRemoved: event('permissionRemoved') },
      webRequest: Object.fromEntries(['onBeforeRequest', 'onHeadersReceived', 'onBeforeRedirect', 'onCompleted', 'onErrorOccurred']
        .map(name => [name, event(`request.${name}`)])),
      webNavigation: Object.fromEntries(['onBeforeNavigate', 'onCommitted', 'onErrorOccurred'].map(name => [name, event(`navigation.${name}`)])),
      tabs: { onRemoved: event('tabRemoved'), onReplaced: event('tabReplaced') },
      storage: { local: { set: data => writes.push(data), get: () => { throw new Error('No legacy header reads'); } } },
    },
  });
  for (const path of JSON.parse(read('manifest.json')).background.scripts) vm.runInContext(read(path), context, { filename: path });
  return { context, events, registrations, writes, errors, controls,
    store: context.PrivacyMonitorAnalysisStore,
    async settle() { await Promise.allSettled(pending); await new Promise(resolve => setImmediate(resolve)); },
  };
}

export const nav = (tabId = 1, timeStamp = 10, url = 'https://fixture.example/') => ({ tabId, frameId: 0, timeStamp, url });
export const req = (extra = {}) => ({ ...nav(), timeStamp: 11, type: 'main_frame', requestId: 'r1',
  incognito: false, cookieStoreId: 'firefox-default', ...extra });
