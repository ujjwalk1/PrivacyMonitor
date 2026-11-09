globalThis.PrivacyMonitorCookiePage = (() => {
  'use strict';
  function start({ api, reader, doc }) {
    const view = PrivacyMonitorCookieView.mount(doc);
    const allow = doc.getElementById('allow'), read = doc.getElementById('read');
    let generation = 0, disposed = false, busy = false;
    const subscriptions = [];
    function setBusy(value) {
      busy = value;
      for (const button of [allow, read]) button.setAttribute('aria-disabled', value ? 'true' : 'false');
    }
    function invalidate(kind = 'stale') {
      generation++; setBusy(false);
      try { reader.invalidate(); } catch { /* Always clear visible data. */ }
      view.render({ kind });
    }
    async function run(kind, operation) {
      if (disposed || busy || doc.hidden) return;
      const own = ++generation; setBusy(true); view.render({ kind });
      try {
        // operation() executes before the first await, preserving permission-button user activation.
        const result = await operation();
        if (!disposed && own === generation && !doc.hidden) view.render(result);
      } catch { if (!disposed && own === generation) view.render({ kind: 'unavailable' }); }
      finally { if (!disposed && own === generation) setBusy(false); }
    }
    const refresh = () => run('loading', () => reader.readActive());
    const grant = () => run('requesting', () => reader.requestFromGesture());
    function dispose() {
      if (disposed) return;
      disposed = true; invalidate();
      try { reader.dispose(); } catch { /* Display is already clear. */ }
      for (const [event, fn] of subscriptions.splice(0)) { try { event.removeListener(fn); } catch { /* Inert callbacks. */ } }
      allow.disabled = true; read.disabled = true;
    }
    function listen(event, fn) {
      if (typeof event?.addListener !== 'function' || typeof event?.removeListener !== 'function') throw Error();
      const guarded = (...args) => { if (!disposed) fn(...args); };
      subscriptions.push([event, guarded]); event.addListener(guarded);
    }
    try {
      for (const method of ['readActive','requestFromGesture','invalidate','dispose']) if (typeof reader?.[method] !== 'function') throw Error();
      listen(api.permissions.onRemoved, change => {
        if (change?.origins?.length || change?.permissions?.includes('cookies')) invalidate('unavailable');
      });
      listen(api.webNavigation.onBeforeNavigate, d => { if (d.frameId === 0) invalidate(); });
      for (const event of [api.tabs.onActivated, api.tabs.onRemoved, api.tabs.onReplaced, api.windows.onFocusChanged]) {
        listen(event, () => invalidate());
      }
    } catch {
      dispose(); view.render({ kind: 'unavailable' }); return Object.freeze({ refresh, grant, dispose });
    }
    allow.disabled = false; read.disabled = false; setBusy(false);
    allow.addEventListener('click', grant); read.addEventListener('click', refresh);
    doc.addEventListener('visibilitychange', () => { if (!disposed) invalidate(doc.hidden ? 'hidden' : 'idle'); });
    view.render({ kind: doc.hidden ? 'hidden' : 'idle' });
    return Object.freeze({ refresh, grant, dispose });
  }
  async function boot({ api, doc, win }) {
    let page = null, closed = false;
    win.addEventListener('pagehide', () => { closed = true; page?.dispose(); }, { once: true });
    try {
      const background = await api.runtime.getBackgroundPage();
      if (closed) return;
      const reader = PrivacyMonitorCookieMetadata.create({ api, store: background?.PrivacyMonitorAnalysisStore });
      page = start({ api, reader, doc });
    } catch {
      if (!closed) PrivacyMonitorCookieView.mount(doc).render({ kind: 'unavailable' });
    }
  }
  return Object.freeze({ start, boot });
})();
document.addEventListener('DOMContentLoaded', () => {
  void PrivacyMonitorCookiePage.boot({ api: typeof browser === 'undefined' ? null : browser, doc: document, win: globalThis });
});
