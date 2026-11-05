globalThis.PrivacyMonitorRequestPage = (() => {
  'use strict';
  function start({ api, doc, location }) {
    const view = PrivacyMonitorRequestView.mount(doc);
    const button = doc.getElementById('refresh');
    let generation = 0, disposed = false, closed = false, busy = false;
    const subscriptions = [];
    const values = new URLSearchParams(location.search).getAll('tab');
    const tabId = values.length === 1 && /^(0|[1-9]\d*)$/.test(values[0]) ? Number(values[0]) : NaN;
    const targetValid = Number.isSafeInteger(tabId) && tabId >= 0;
    const setBusy = value => { busy = value; button.setAttribute('aria-disabled', value ? 'true' : 'false'); };
    function invalidate(kind) {
      generation++; setBusy(false); view.render({ analysis: { kind } });
    }
    async function refresh() {
      if (disposed || closed || !targetValid) return;
      if (doc.hidden) { invalidate('unavailable'); return; }
      const own = ++generation; setBusy(true); view.render({ analysis: { kind: 'loading' } });
      try {
        const background = await api.runtime.getBackgroundPage();
        if (disposed || own !== generation) return;
        const source = background?.PrivacyMonitorRequestDetailsSource;
        const result = source?.read ? await source.read(tabId) : { analysis: { kind: 'unavailable' } };
        if (!disposed && own === generation) view.render(result);
      } catch { if (!disposed && own === generation) view.render({ analysis: { kind: 'unavailable' } }); }
      finally { if (!disposed && own === generation) setBusy(false); }
    }
    function subscribe(event, fn) {
      if (typeof event?.addListener !== 'function' || typeof event?.removeListener !== 'function') throw Error('Lifecycle unavailable');
      subscriptions.push([event, fn]); event.addListener(fn);
    }
    function dispose() {
      disposed = true; generation++;
      for (const [event, fn] of subscriptions.splice(0)) { try { event.removeListener(fn); } catch { /* Callbacks remain guarded. */ } }
      invalidate('unavailable');
    }
    button.addEventListener('click', () => { if (!busy) void refresh(); });
    if (!targetValid) { invalidate('invalid'); return Object.freeze({ refresh, dispose }); }
    try {
      subscribe(api.webNavigation.onBeforeNavigate, d => {
        if (!disposed && d.tabId === tabId && d.frameId === 0) invalidate('stale');
      });
      subscribe(api.tabs.onRemoved, id => {
        if (!disposed && id === tabId) { closed = true; invalidate('closed'); }
      });
      subscribe(api.tabs.onReplaced, (added, removed) => {
        if (!disposed && (added === tabId || removed === tabId)) { closed = true; invalidate('closed'); }
      });
      subscribe(api.permissions.onRemoved, () => { if (!disposed) invalidate('unavailable'); });
    } catch { dispose(); return Object.freeze({ refresh, dispose }); }
    doc.addEventListener('visibilitychange', () => {
      if (!disposed) { if (doc.hidden) invalidate('unavailable'); else void refresh(); }
    });
    void refresh();
    return Object.freeze({ refresh, dispose });
  }
  return Object.freeze({ start });
})();
document.addEventListener('DOMContentLoaded', () => {
  const api = typeof browser === 'undefined' ? null : browser;
  const page = PrivacyMonitorRequestPage.start({ api, doc: document, location });
  globalThis.addEventListener('pagehide', () => page.dispose(), { once: true });
});
