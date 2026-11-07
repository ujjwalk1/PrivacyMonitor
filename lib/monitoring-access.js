// D26 permission/lifecycle foundation. Not loaded by the production manifest.
globalThis.PrivacyMonitorMonitoringAccess = (() => {
  'use strict';
  const ORIGINS = Object.freeze(['http://*/*', 'https://*/*']);
  const permission = () => ({ origins: [...ORIGINS] });
  const COVERAGE = 'On-demand scans cannot reconstruct earlier requests or response headers.';
  function compatible(manifest) {
    const required = manifest?.permissions, optional = manifest?.optional_permissions;
    return manifest?.manifest_version === 2 && Array.isArray(required) && Array.isArray(optional) &&
      ['activeTab', 'webRequest', 'webNavigation'].every(p => required.includes(p)) &&
      required.every(p => typeof p === 'string' && p !== '<all_urls>' && !p.includes('://')) &&
      ORIGINS.every(p => optional.includes(p)) &&
      (!manifest.content_scripts || (Array.isArray(manifest.content_scripts) && !manifest.content_scripts.length));
  }
  function create({ api } = {}) {
    let epoch = 0, disposed = false, configured = false, collector = null;
    let pending = null, releasing = null, brokenStop = false;
    let state = { mode: 'on-demand', access: 'not-requested' };
    const status = () => ({ ...state, coverage: COVERAGE });
    function stop(access) {
      epoch++;
      const previous = collector; collector = null;
      state = { mode: 'on-demand', access };
      if (previous) {
        try { previous.stop(); } catch { brokenStop = true; state.access = 'unavailable'; }
      }
    }
    function removed(change) {
      // Any origin removal conservatively invalidates the all-websites grant.
      // Separate breach-service data-collection consent does not control local capture.
      if (!disposed && (change?.origins?.length ||
          change?.permissions?.some(p => ['webRequest', 'webNavigation'].includes(p)))) stop('revoked');
    }
    try {
      configured = compatible(api.runtime.getManifest()) &&
        ['request', 'contains', 'remove'].every(k => typeof api.permissions[k] === 'function') &&
        typeof api.permissions.onRemoved?.addListener === 'function' &&
        typeof api.permissions.onRemoved?.removeListener === 'function' &&
        typeof globalThis.PrivacyMonitorRequests?.attach === 'function';
      if (configured) api.permissions.onRemoved.addListener(removed);
      else state.access = 'integration-required';
    } catch { state.access = 'unavailable'; configured = false; }

    // Call directly from an extension click handler: no await/query precedes request().
    function enableFromGesture() {
      if (!configured || disposed || brokenStop || pending || releasing || collector) return Promise.resolve(status());
      const own = ++epoch;
      state = { mode: 'on-demand', access: 'requesting' };
      let request;
      try { request = api.permissions.request(permission()); }
      catch { state.access = 'unavailable'; return Promise.resolve(status()); }
      const job = Promise.resolve(request).then(async granted => {
        if (disposed || own !== epoch) return status();
        if (granted !== true) {
          state.access = granted === false ? 'denied' : 'unavailable'; return status();
        }
        const confirmed = await api.permissions.contains(permission());
        if (disposed || own !== epoch) return status();
        if (confirmed !== true) { state.access = 'unavailable'; return status(); }
        collector = globalThis.PrivacyMonitorRequests.attach(api);
        // D23 reports dependency/registration failures through get().
        if (!collector || typeof collector.get !== 'function' || typeof collector.stop !== 'function' ||
            collector.get(0).kind === 'unavailable') {
          stop('unavailable'); return status();
        }
        state = { mode: 'continuous', access: 'granted' };
        return status();
      }).catch(() => {
        if (!disposed && own === epoch) stop('unavailable');
        return status();
      }).finally(() => { if (pending === job) pending = null; });
      pending = job;
      return job;
    }
    function useOnDemand() {
      if (!configured || disposed) return Promise.resolve(status());
      if (releasing) return releasing;
      stop('revoking'); // Clear capture immediately, before any asynchronous permission operation.
      const own = epoch, earlierRequest = pending;
      const job = (async () => {
        // A grant resolving after cancellation must be removed too, never restarted.
        await earlierRequest;
        if (disposed) return status();
        try {
          const removed = await api.permissions.remove(permission());
          if (!disposed && own === epoch && !brokenStop) {
            state.access = removed === true ? 'released' : removed === false ? 'retained' : 'unavailable';
          }
        } catch { if (!disposed && own === epoch) state.access = 'unavailable'; }
        return status();
      })().finally(() => { if (releasing === job) releasing = null; });
      releasing = job;
      return job;
    }
    function get(tabId, documentId) {
      if (disposed || !collector || state.mode !== 'continuous') {
        return { kind: 'unavailable', reason: 'monitoring-not-active' };
      }
      try { return collector.get(tabId, documentId); }
      catch { stop('unavailable'); return { kind: 'unavailable', reason: 'monitoring-unavailable' }; }
    }
    function dispose() {
      if (disposed) return;
      stop('unavailable'); disposed = true;
      try { api.permissions.onRemoved.removeListener(removed); } catch { /* Guarded callback stays inert. */ }
      // Disposal is not a claim that browser grants were revoked. Call useOnDemand first.
    }
    return Object.freeze({ status, enableFromGesture, useOnDemand, get, dispose });
  }
  return Object.freeze({ create, COVERAGE });
})();
