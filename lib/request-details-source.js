// Read-only D25 adapter. Explicit setup in the trusted background only.
globalThis.PrivacyMonitorRequestDetails = (() => {
  'use strict';
  function createSource({ store, collector, dataset } = {}) {
    let analyzer;
    try { analyzer = globalThis.PrivacyMonitorRequestAnalysis?.create({ collector, dataset }); } catch { /* Fail closed. */ }
    // Metadata is copied at setup; only returned when D24 confirms usable list classification.
    const info = dataset && { id: dataset.id, revision: dataset.revision, retrievedOn: dataset.retrievedOn };
    function read(tabId) {
      if (!Number.isSafeInteger(tabId) || tabId < 0) return { analysis: { kind: 'invalid' }, dataset: null };
      try {
        const current = store.get(tabId);
        if (!current?.ok || current.kind !== 'record') {
          return { analysis: { kind: current?.ok ? 'not-observed' : 'unavailable' }, dataset: null };
        }
        if (current.record?.tabId !== tabId) return { analysis: { kind: 'unavailable' }, dataset: null };
        const analysis = analyzer.analyze(current.record);
        const usable = analysis.kind === 'observed' &&
          analysis.findings.some(f => ['listed', 'unknown'].includes(f.tracker.kind));
        return { analysis, dataset: usable && info ? { ...info } : null };
      } catch { return { analysis: { kind: 'unavailable' }, dataset: null }; }
    }
    return Object.freeze({ read });
  }
  return Object.freeze({ createSource });
})();
