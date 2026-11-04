// D24: project current-document capture into domain classifications.
// Trusted background API only; not loaded by the production manifest.
globalThis.PrivacyMonitorRequestAnalysis = (() => {
  'use strict';
  const LIMITS = Object.freeze({ observations: 256, eventsPerPair: 65535 });
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const exact = (value, fields) => object(value) && Object.keys(value).length === fields.length &&
    fields.every(key => Object.hasOwn(value, key));
  const uuid = value => typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  const unavailable = reason => ({ kind: 'unavailable', reason });
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

  function create({ collector, dataset } = {}) {
    const sites = globalThis.PrivacyMonitorSites;
    let trackers;
    try { trackers = globalThis.PrivacyMonitorTrackers?.create(dataset); } catch { /* Unavailable below. */ }

    function analyze(record) {
      if (!object(record) || record.schemaVersion !== 1 || !Number.isSafeInteger(record.tabId) ||
          record.tabId < 0 || typeof record.navigationId !== 'string' ||
          !record.navigationId || record.navigationId.length > 128) {
        return { kind: 'invalid', reason: 'invalid-analysis-record' };
      }
      // Reject private/unknown context before reading capture or normalizing browsing hosts.
      if (record.context?.incognito !== false) return unavailable('private-or-unknown-context');
      if (!uuid(record.documentId)) return unavailable('document-identity-unavailable');
      if (!object(record.page) || !['http:', 'https:'].includes(record.page.protocol)) {
        return unavailable('unsupported-page');
      }
      if (typeof sites?.fromHostname !== 'function' || typeof sites?.compareHosts !== 'function') {
        return unavailable('domain-helper-unavailable');
      }
      let page;
      try { page = sites.fromHostname(record.page.hostname); } catch { return unavailable('domain-helper-unavailable'); }
      if (!page || page.kind === 'unavailable') return unavailable('domain-helper-unavailable');
      if (!page.hostname || page.kind === 'invalid') return { kind: 'invalid', reason: 'invalid-page-hostname' };
      if (typeof collector?.get !== 'function') return unavailable('capture-unavailable');

      let snapshot;
      try { snapshot = collector.get(record.tabId, record.documentId); } catch { return unavailable('capture-unavailable'); }
      if (!object(snapshot)) return unavailable('invalid-capture');
      if (snapshot.kind === 'unavailable') return unavailable('capture-unavailable');
      if (exact(snapshot, ['kind']) && snapshot.kind === 'not-observed') return { kind: 'not-observed' };
      if (!exact(snapshot, ['kind', 'documentId', 'coverage', 'truncated', 'counterSaturated', 'observations']) ||
          !['observed', 'not-observed'].includes(snapshot.kind) || !uuid(snapshot.documentId) ||
          snapshot.coverage !== 'top-frame-after-commit' || typeof snapshot.truncated !== 'boolean' ||
          typeof snapshot.counterSaturated !== 'boolean' || !Array.isArray(snapshot.observations) ||
          snapshot.observations.length > LIMITS.observations ||
          (snapshot.kind === 'observed') !== (snapshot.observations.length > 0)) {
        return unavailable('invalid-capture');
      }
      if (snapshot.documentId.toLowerCase() !== record.documentId.toLowerCase()) return unavailable('stale-document');
      if (snapshot.kind === 'not-observed') return { kind: 'not-observed' };

      // Each input is one cumulative snapshot, never an incremental batch.
      // Deduplicate canonical hostname/type rows by maximum count, not addition.
      const hosts = new Map();
      for (const row of snapshot.observations) {
        if (!exact(row, ['hostname', 'type', 'events']) || typeof row.type !== 'string' ||
            !/^[a-z_]{1,32}$/.test(row.type) || !Number.isSafeInteger(row.events) ||
            row.events < 1 || row.events > LIMITS.eventsPerPair) return unavailable('invalid-capture');
        let host;
        try { host = sites.fromHostname(row.hostname); } catch { return unavailable('domain-helper-unavailable'); }
        if (!host || host.kind === 'unavailable') return unavailable('domain-helper-unavailable');
        if (!host.hostname || host.kind === 'invalid') return unavailable('invalid-capture');
        if (!hosts.has(host.hostname)) hosts.set(host.hostname, new Map());
        const types = hosts.get(host.hostname);
        types.set(row.type, Math.max(types.get(row.type) ?? 0, row.events));
      }

      const findings = [];
      for (const [hostname, types] of [...hosts].sort(([a], [b]) => compare(a, b))) {
        let relation;
        try { relation = sites.compareHosts(page.hostname, hostname); } catch { return unavailable('domain-helper-unavailable'); }
        if (!relation || relation.relation === 'unavailable') return unavailable('domain-helper-unavailable');
        const party = relation.sameSite === true ? 'first-party' :
          relation.sameSite === false ? 'third-party' : 'unknown';
        let match;
        try { match = trackers?.classifyHostname(hostname); } catch { /* Unavailable below. */ }
        // D22 produces bounded evidence and null owner/category. Do not infer either.
        const listed = match?.kind === 'listed';
        const knownUnknown = match?.kind === 'unknown' &&
          ['not-listed', 'unsupported-host'].includes(match.reason);
        const tracker = listed
          ? { kind: 'listed', evidence: { ...match.evidence } }
          : knownUnknown ? { kind: 'unknown', reason: match.reason }
            : { kind: 'unavailable' };
        const classification = listed ? 'known-tracker' :
          tracker.kind === 'unavailable' ? 'unavailable' :
            party === 'first-party' ? 'first-party' :
              party === 'third-party' ? 'unclassified-third-party' : 'unknown';
        findings.push({ hostname, party, classification, tracker, owner: null, category: null,
          types: [...types].sort(([a], [b]) => compare(a, b)).map(([type, events]) => ({ type, events })) });
      }
      return { kind: 'observed', tabId: record.tabId, navigationId: record.navigationId,
        documentId: snapshot.documentId.toLowerCase(), pageHostname: page.hostname,
        coverage: snapshot.coverage, truncated: snapshot.truncated,
        counterSaturated: snapshot.counterSaturated, findings };
    }
    return Object.freeze({ analyze });
  }
  return Object.freeze({ LIMITS, create });
})();
