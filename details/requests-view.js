// DOM text only: request and dataset strings never become HTML or link targets.
globalThis.PrivacyMonitorRequestView = (() => {
  'use strict';
  const labels = { 'known-tracker': 'Tracker-list match', 'first-party': 'First-party',
    'unclassified-third-party': 'Unclassified third-party', unknown: 'Classification unknown', unavailable: 'Classification unavailable' };
  const parties = { 'first-party': 'Same host or site', 'third-party': 'Different site', unknown: 'Site relationship unknown' };
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const host = v => typeof v === 'string' && v.length > 0 && v.length <= 253 &&
    /^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])$/.test(v);
  const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  function metadata(d) {
    return object(d) && d.id === 'easyprivacy-general-domains' &&
      typeof d.revision === 'string' && /^[a-f0-9]{40}$/.test(d.revision) && date(d.retrievedOn);
  }
  function valid(a, d) {
    if (!object(a) || !host(a.pageHostname) || a.coverage !== 'top-frame-after-commit' ||
        typeof a.truncated !== 'boolean' || typeof a.counterSaturated !== 'boolean' ||
        !Array.isArray(a.findings) || !a.findings.length || a.findings.length > 256) return false;
    const seen = new Set(); let pairs = 0;
    return a.findings.every(f => {
      if (!object(f) || !host(f.hostname) || seen.has(f.hostname) || !Object.hasOwn(labels, f.classification) ||
          !Object.hasOwn(parties, f.party) || f.owner !== null || f.category !== null ||
          !object(f.tracker) || !['listed', 'unknown', 'unavailable'].includes(f.tracker.kind) ||
          !Array.isArray(f.types) || !f.types.length || (pairs += f.types.length) > 256) return false;
      seen.add(f.hostname);
      const types = new Set();
      if (!f.types.every(t => object(t) && typeof t.type === 'string' && /^[a-z_]{1,32}$/.test(t.type) &&
          !types.has(t.type) && types.add(t.type) && Number.isSafeInteger(t.events) && t.events > 0 && t.events <= 65535)) return false;
      const expected = f.tracker.kind === 'listed' ? 'known-tracker' :
        f.tracker.kind === 'unavailable' ? 'unavailable' :
          f.party === 'first-party' ? 'first-party' :
            f.party === 'third-party' ? 'unclassified-third-party' : 'unknown';
      if (f.classification !== expected) return false;
      if (f.tracker.kind === 'unavailable') return true;
      if (!metadata(d)) return false;
      if (f.tracker.kind === 'unknown') return ['not-listed', 'unsupported-host'].includes(f.tracker.reason);
      const e = f.tracker.evidence;
      return object(e) && e.datasetId === d.id && e.revision === d.revision && e.retrievedOn === d.retrievedOn &&
        typeof e.rule === 'string' && e.rule.length <= 257 && /^\|\|[a-z0-9.-]+\^$/.test(e.rule) &&
        Number.isSafeInteger(e.sourceLine) && e.sourceLine > 0 && e.sourceLine <= 100000 &&
        typeof e.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(e.sourceSha256) &&
        ['exact', 'subdomain'].includes(e.match);
    });
  }
  function mount(doc) {
    const node = id => doc.getElementById(id);
    const element = (tag, text, className) => {
      const e = doc.createElement(tag);
      if (text !== undefined) e.textContent = text;
      if (className) e.className = className;
      return e;
    };
    function render(envelope) {
      node('findings').replaceChildren();
      node('page-host').textContent = '';
      node('coverage').hidden = true; node('limits').hidden = true;
      node('coverage').textContent = ''; node('limits').textContent = '';
      const a = envelope?.analysis, d = envelope?.dataset;
      let kind = a?.kind;
      if (kind === 'observed' && !valid(a, d)) kind = 'unavailable';
      node('results').setAttribute('aria-busy', kind === 'loading' ? 'true' : 'false');
      const states = {
        loading: 'Loading request details…',
        'not-observed': 'No request observations are available for this document. This does not mean no trackers were present.',
        stale: 'The target page changed. Refresh results for the current document.',
        closed: 'The target tab is closed. Open details from an available tab.',
        unavailable: 'Request details are unavailable. Capture, document identity or classification data may be missing.',
        invalid: 'Request details are unavailable for this target.',
      };
      if (kind !== 'observed') { node('status').textContent = states[kind] || states.unavailable; return; }
      node('page-host').textContent = 'Page: ' + a.pageHostname;
      node('status').textContent = a.findings.length + ' observed ' + (a.findings.length === 1 ? 'domain' : 'domains') + '.';
      node('coverage').hidden = false;
      node('coverage').textContent = 'Limited capture: top-frame requests observed after navigation committed. Earlier requests, frames and inaccessible activity are not covered.';
      const warnings = [];
      if (a.truncated) warnings.push('Capture limit reached; additional domains or types may be missing.');
      if (a.counterSaturated) warnings.push('Some event counts reached their limit and are lower bounds.');
      node('limits').hidden = !warnings.length; node('limits').textContent = warnings.join(' ');
      for (const f of a.findings) {
        const card = element('article', undefined, 'finding');
        card.append(element('h2', f.hostname), element('p', labels[f.classification]),
          element('p', 'Site relationship: ' + parties[f.party], 'metadata'));
        const activity = element('ul');
        for (const t of f.types) {
          const count = a.counterSaturated && t.events === 65535 ? 'At least ' + t.events : String(t.events);
          activity.append(element('li', t.type.replaceAll('_', ' ') + ': ' + count + ' observed ' + (t.events === 1 ? 'event' : 'events')));
        }
        card.append(activity);
        const available = f.tracker.kind !== 'unavailable';
        card.append(element('p', available ? 'Dataset snapshot retrieved: ' + d.retrievedOn : 'Dataset date: unavailable.', 'metadata'));
        const evidence = f.tracker.kind === 'listed' ? 'Matched rule ' + f.tracker.evidence.rule + ' in the EasyPrivacy general-domain subset.' :
          f.tracker.kind === 'unavailable' ? 'Tracker-list classification is unavailable.' :
            f.tracker.reason === 'unsupported-host' ? 'This host is outside the dataset’s supported domain coverage.' :
              'No rule matched in this limited dataset. Unlisted hosts may still track.';
        card.append(element('p', evidence));
        const detail = element('details'), summary = element('summary', 'Classification evidence');
        const fields = element('dl');
        const add = (name, value) => fields.append(element('dt', name), element('dd', value));
        add('Owner', 'Unknown'); add('Category', 'Unknown');
        if (available) { add('Dataset', 'EasyPrivacy general-domain subset'); add('Snapshot revision', d.revision); }
        if (f.tracker.kind === 'listed') {
          const e = f.tracker.evidence;
          add('Source file', 'easyprivacy_trackingservers_general.txt, line ' + e.sourceLine);
          add('Match', e.match === 'exact' ? 'Exact hostname' : 'Subdomain of listed hostname');
          add('Source SHA-256', e.sourceSha256);
        }
        detail.append(summary, fields); card.append(detail); node('findings').append(card);
      }
    }
    return Object.freeze({ render });
  }
  return Object.freeze({ mount });
})();
