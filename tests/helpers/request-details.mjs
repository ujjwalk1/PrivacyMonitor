import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8');
export const plain = value => JSON.parse(JSON.stringify(value));
export const data = JSON.parse(read('data/trackers/domains.json'));
export const documentId = '00000000-0000-4000-8000-000000000001';
export function pipeline() {
  const context = vm.createContext({ URL, crypto: { randomUUID: () => 'details-test' },
    fetch() { throw Error('No external requests'); }, console: { log() { throw Error('No logs'); } } });
  for (const file of ['vendor/tldts/index.umd.min.js', 'lib/site-domains.js', 'lib/tracker-classifier.js',
    'analysis-records.js', 'lib/request-analysis.js', 'lib/request-details-source.js']) {
    vm.runInContext(read(file), context);
  }
  const store = context.PrivacyMonitorAnalysis.createStore({ now: () => 100 });
  store.begin({ id: 1, url: 'https://example.com/private?secret=yes', incognito: false }, { documentId });
  const capture = { kind: 'observed', documentId, coverage: 'top-frame-after-commit',
    truncated: false, counterSaturated: false, observations: [
      { hostname: 'cdn.example.com', type: 'script', events: 2 },
      { hostname: 'clarity.ms', type: 'script', events: 3 },
      { hostname: 'clarity.ms', type: 'image', events: 1 },
      { hostname: 'static.example.net', type: 'image', events: 4 },
    ] };
  let calls = 0;
  const collector = { get() { calls++; return capture; } };
  const source = context.PrivacyMonitorRequestDetails.createSource({ store, collector, dataset: data });
  return { context, store, capture, collector, source, calls: () => calls };
}
export function envelope() { return plain(pipeline().source.read(1)); }

export class Node {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = {}; this.handlers = {}; this.hidden = false; this.value = ''; }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map(c => c.textContent).join(' '); }
  set innerHTML(_) { throw Error('HTML injection forbidden'); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this.value = ''; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name) { for (const fn of this.handlers[name] || []) fn(); }
}
export function dom() {
  const nodes = Object.fromEntries([...read('details/requests.html').matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Node()]));
  return { nodes, hidden: false, handlers: {},
    createElement: tag => new Node(tag),
    getElementById: id => { if (!nodes[id]) throw Error('Missing element ' + id); return nodes[id]; },
    addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); },
    emit(name) { for (const fn of this.handlers[name] || []) fn(); },
  };
}
export function viewHarness() {
  const doc = dom(), context = vm.createContext({ URLSearchParams, document: doc,
    fetch() { throw Error('No fetching from view'); },
    get localStorage() { throw Error('No persistence'); } });
  vm.runInContext(read('details/requests-view.js'), context);
  vm.runInContext(read('details/requests-page.js'), context);
  return { doc, context, view: context.PrivacyMonitorRequestView.mount(doc) };
}
export function controllerHarness(readResult = () => envelope(), search = '?tab=1', hidden = false) {
  const v = viewHarness(), events = {}, registrations = [];
  v.doc.hidden = hidden;
  const event = name => {
    const listeners = new Set(); events[name] = (...args) => [...listeners].forEach(fn => fn(...args));
    return { addListener(fn) { listeners.add(fn); registrations.push([name, fn]); }, removeListener(fn) { listeners.delete(fn); } };
  };
  let calls = 0;
  const controls = { background: async () => ({ PrivacyMonitorRequestDetailsSource: { read(id) { calls++; return readResult(id); } } }) };
  const api = { runtime: { getBackgroundPage: () => controls.background() },
    webNavigation: { onBeforeNavigate: event('navigate') },
    tabs: { onRemoved: event('removed'), onReplaced: event('replaced') },
    permissions: { onRemoved: event('permission') } };
  const page = v.context.PrivacyMonitorRequestPage.start({ api, doc: v.doc, location: { search } });
  return { ...v, api, page, controls, events, calls: () => calls, registrations };
}
export const settle = () => new Promise(resolve => setImmediate(resolve));
