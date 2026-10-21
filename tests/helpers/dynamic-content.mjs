// Small modeled DOM + observer + clock for content-script lifecycle tests.
// Native form ownership, event delivery, and garbage collection still need Firefox checks.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../content-script.js', import.meta.url), 'utf8');
export async function dynamicContent({ privacy = false, preferences, readSettings } = {}) {
  const timers = new Map(), events = {}, writes = [], logs = [];
  let now = 0, timerId = 0, observer, document, queries = 0;
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  function notify(record) {
    if (!observer?.connected || !record.target.isConnected) return;
    if (record.type === 'attributes' && !observer.options.attributeFilter.includes(record.attributeName)) return;
    observer.records.push(record);
    queueMicrotask(() => {
      if (!observer.connected || !observer.records.length) return;
      const records = observer.records; observer.records = []; observer.callback(records);
    });
  }
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = [];
      this.attributes = {}; this.style = {}; this.parentNode = null; this.value = '';
    }
    get ownerDocument() { return document; }
    get isConnected() { return this === document || Boolean(this.parentNode?.isConnected); }
    get firstChild() { return this.children[0] ?? null; }
    get id() { return this.getAttribute('id') ?? ''; }
    set id(value) { this.setAttribute('id', value); }
    get type() { return this.getAttribute('type') ?? (this.tagName === 'BUTTON' ? 'submit' : 'text'); }
    set type(value) { this.setAttribute('type', value); }
    get form() {
      const id = this.getAttribute('form');
      if (id !== null) {
        const owner = document.querySelectorAll('form').find(form => form.id === id);
        return owner ?? null;
      }
      for (let node = this.parentNode; node; node = node.parentNode) if (node.tagName === 'FORM') return node;
      return null;
    }
    getAttribute(name) { return this.attributes[name] ?? null; }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      notify({ type: 'attributes', target: this, attributeName: name });
    }
    removeAttribute(name) {
      if (!(name in this.attributes)) return;
      delete this.attributes[name]; notify({ type: 'attributes', target: this, attributeName: name });
    }
    appendChild(node) { return this.insertBefore(node, null); }
    insertBefore(node, before) {
      node.remove(); node.parentNode = this;
      const index = before ? this.children.indexOf(before) : this.children.length;
      this.children.splice(index, 0, node);
      notify({ type: 'childList', target: this, addedNodes: [node], removedNodes: [] }); return node;
    }
    remove() {
      if (!this.parentNode) return;
      const parent = this.parentNode; parent.children = parent.children.filter(child => child !== this);
      this.parentNode = null;
      notify({ type: 'childList', target: parent, addedNodes: [], removedNodes: [this] });
    }
    set innerHTML(value) {
      const removedNodes = this.children; this.children = [];
      removedNodes.forEach(node => { node.parentNode = null; }); this.html = value;
      notify({ type: 'childList', target: this, addedNodes: [], removedNodes });
    }
    get innerHTML() { return this.html ?? ''; }
    matches(selector) {
      if (selector === ':disabled') {
        for (let node = this; node; node = node.parentNode) {
          if ((node === this || node.tagName === 'FIELDSET') && node.getAttribute('disabled') !== null) return true;
        }
        return false;
      }
      return selector.split(',').some(part => {
        const match = part.trim().match(/^(\w+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);
        if (!match) throw new Error(`Unsupported fixture selector: ${selector}`);
        return (!match[1] || this.tagName === match[1].toUpperCase()) &&
          (!match[2] || (match[3] === undefined ? this.getAttribute(match[2]) !== null : this.getAttribute(match[2]) === match[3]));
      });
    }
    querySelectorAll(selector) {
      queries++;
      const result = [];
      const visit = node => node.children.forEach(child => { if (child.matches(selector)) result.push(child); visit(child); });
      visit(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    getBoundingClientRect() { return { bottom: 10, left: 20 }; }
  }
  document = new Element('document');
  document.URL = 'https://fixture.example/page'; document.readyState = 'complete'; document.cookie = '';
  document.activeElement = null;
  document.createElement = tag => new Element(tag);
  document.addEventListener = (name, fn) => { (events[name] ??= []).push(fn); };
  document.documentElement = document.appendChild(new Element('html'));
  document.documentElement.scrollTop = document.documentElement.scrollLeft = 0;
  document.head = document.documentElement.appendChild(new Element('head'));
  document.body = document.documentElement.appendChild(new Element('body'));
  Object.defineProperty(document, 'baseURI', { get() {
    const base = document.querySelector('base[href]');
    return base ? new URL(base.getAttribute('href'), document.URL).href : document.URL;
  } });
  const controls = { write: async () => {}, preferences, readSettings };
  let storageChanged;
  const context = vm.createContext({ document, URL,
    setTimeout(fn, delay) { timers.set(++timerId, { fn, due: now + delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    window: { location: new URL(document.URL), pageXOffset: 0, pageYOffset: 0 },
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    browser: { extension: { inIncognitoContext: privacy },
      runtime: { onMessage: { addListener() {} } },
      storage: { onChanged: { addListener(fn) { storageChanged = fn; } }, local: {
        get: async key => controls.readSettings ? controls.readSettings(key) : { [key]: controls.preferences },
        set(data) { writes.push(JSON.parse(JSON.stringify(data))); return controls.write(data); } } } },
    MutationObserver: class {
      constructor(callback) { observer = this; this.callback = callback; this.records = []; }
      observe(target, options) { this.target = target; this.options = options; this.connected = true; }
      disconnect() { this.connected = false; this.records = []; }
    },
  });
  vm.runInContext(readFileSync(new URL('../../settings.js', import.meta.url), 'utf8'), context);
  vm.runInContext(source, context); await settle();
  const create = (tag, attributes = {}, parent = document.body) => {
    const node = new Element(tag); for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    parent?.appendChild(node); return node;
  };
  const fire = (name, target) => {
    if (name === 'focusin') document.activeElement = target;
    if (name === 'focusout') document.activeElement = null;
    for (const listener of events[name] ?? []) listener({ target });
  };
  async function advance(ms) {
    await settle(); const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      now = next[1].due; timers.delete(next[0]); void next[1].fn(); await settle();
    }
    now = end; await settle();
  }
  return { context, document, controls, writes, logs, timers, events, observer, create, fire, advance, settle,
    changeSettings(value, area = 'local') {
      if (area === 'local') controls.preferences = value;
      storageChanged({ privacy_monitor_display_settings_v1: { newValue: value } }, area);
    },
    get queries() { return queries; },
    forms: () => writes.at(-1)?.['forms_fixture.example'],
    bannerCount: form => form.querySelectorAll('[data-pm-banner]').length,
  };
}
