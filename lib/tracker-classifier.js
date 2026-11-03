// Offline list membership only. Not loaded by the beta manifest.
// Load tldts, then site-domains.js; pass the bundled JSON to create().
globalThis.PrivacyMonitorTrackers = (() => {
  'use strict';
  const sites = globalThis.PrivacyMonitorSites;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const keys = (value, names) => object(value) && Object.keys(value).length === names.length &&
    names.every(name => Object.hasOwn(value, name));
  const unavailable = reason => ({ kind: 'unavailable', reason });
  function create(dataset) {
    const rules = new Map();
    let metadata, failure = null;
    try {
      if (typeof sites?.fromHostname !== 'function' || typeof sites?.fromURL !== 'function') {
        failure = 'domain-helper-unavailable';
      } else {
        if (!keys(dataset, ['schemaVersion', 'id', 'revision', 'retrievedOn', 'sourceSha256', 'license', 'domains']) ||
            dataset.schemaVersion !== 1 || dataset.id !== 'easyprivacy-general-domains' ||
            dataset.license !== 'GPL-3.0-or-later' || typeof dataset.revision !== 'string' ||
            typeof dataset.sourceSha256 !== 'string' || !/^[a-f0-9]{40}$/.test(dataset.revision) ||
            !/^[a-f0-9]{64}$/.test(dataset.sourceSha256) ||
            typeof dataset.retrievedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataset.retrievedOn) ||
            !Number.isFinite(Date.parse(dataset.retrievedOn)) ||
            new Date(dataset.retrievedOn).toISOString().slice(0, 10) !== dataset.retrievedOn ||
            !Array.isArray(dataset.domains) || !dataset.domains.length || dataset.domains.length > 5000) {
          throw new Error('Invalid dataset');
        }
        for (const entry of dataset.domains) {
          if (!keys(entry, ['domain', 'sourceLine']) || typeof entry.domain !== 'string' ||
              !Number.isSafeInteger(entry.sourceLine) || entry.sourceLine < 1 || entry.sourceLine > 100000 ||
              rules.has(entry.domain)) throw new Error('Invalid rule');
          const parsed = sites.fromHostname(entry.domain);
          if (parsed.kind === 'unavailable') { failure = 'domain-helper-unavailable'; break; }
          if (parsed.kind !== 'domain' || parsed.hostname !== entry.domain) throw new Error('Invalid rule domain');
          rules.set(entry.domain, entry.sourceLine);
        }
        metadata = { datasetId: dataset.id, revision: dataset.revision,
          retrievedOn: dataset.retrievedOn, sourceSha256: dataset.sourceSha256 };
      }
    } catch { failure = 'invalid-dataset'; }
    if (failure) rules.clear();

    function classify(input, method) {
      if (failure) return unavailable(failure);
      let parsed;
      try { parsed = sites[method](input); } catch { return unavailable('domain-helper-unavailable'); }
      if (!parsed || parsed.kind === 'unavailable') return unavailable('domain-helper-unavailable');
      if (parsed.kind === 'invalid') return { kind: 'invalid' };
      if (parsed.kind !== 'domain') return { kind: 'unknown', hostname: parsed.hostname, reason: 'unsupported-host' };
      // Walk whole labels only, never above the PSL registrable/private tenant boundary.
      let candidate = parsed.hostname;
      while (true) {
        if (rules.has(candidate)) return {
          kind: 'listed', hostname: parsed.hostname, owner: null, category: null,
          evidence: { ...metadata, rule: '||' + candidate + '^', sourceLine: rules.get(candidate),
            match: candidate === parsed.hostname ? 'exact' : 'subdomain' },
        };
        if (candidate === parsed.domain) break;
        candidate = candidate.slice(candidate.indexOf('.') + 1);
      }
      return { kind: 'unknown', hostname: parsed.hostname, reason: 'not-listed' };
    }
    return Object.freeze({
      classifyHostname: input => classify(input, 'fromHostname'),
      classifyURL: input => classify(input, 'fromURL'),
    });
  }
  return Object.freeze({ create });
})();
