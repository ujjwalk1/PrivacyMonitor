// Shared, schemeless domain comparison. Not loaded by the beta manifest yet.
// Load vendor/tldts/index.umd.min.js before this file. No network or storage.
globalThis.PrivacyMonitorSites = (() => {
  'use strict';
  const parser = globalThis.tldts;
  const options = Object.freeze({ allowPrivateDomains: true, validateHostname: true });
  const invalid = () => ({ kind: 'invalid' });
  function fromHostname(input) {
    if (typeof input !== 'string' || !input || input.length > 2048 ||
        /[\s/\\?#@%]/u.test(input) ||
        (input.includes(':') && !/^\[[0-9a-f:.]+\]$/i.test(input))) return invalid();
    let hostname;
    try {
      const url = new URL('http://' + input + '/');
      hostname = url.hostname.toLowerCase().replace(/\.$/, '');
      if (!hostname || hostname.length > 253) return invalid();
    } catch { return invalid(); }
    const ip = hostname.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    if (!ip && !hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return invalid();
    const result = { hostname, domain: null, publicSuffix: null, isPrivate: false, siteKey: hostname };
    if (ip) return { kind: 'ip', ...result };
    // Local names are compared exactly, never by a guessed last-two-label rule.
    if (!hostname.includes('.') || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
      // A single label may itself be a public suffix; let the PSL decide first.
      if (hostname.includes('.') || hostname === 'localhost') return { kind: 'local', ...result };
    }
    if (typeof parser?.parse !== 'function') return { kind: 'unavailable' };
    try {
      const parsed = parser.parse(hostname, options);
      if (!parsed || parsed.hostname !== hostname) return { kind: 'unavailable' };
      if (!parsed.isIcann && !parsed.isPrivate) {
        return !hostname.includes('.') ? { kind: 'local', ...result }
          : { kind: 'unknown', ...result, siteKey: null };
      }
      const publicSuffix = parsed.publicSuffix;
      const isPrivate = parsed.isPrivate === true;
      if (!parsed.domain) return { kind: 'unknown', ...result, publicSuffix, isPrivate, siteKey: null };
      return { kind: 'domain', ...result, domain: parsed.domain, publicSuffix, isPrivate, siteKey: parsed.domain };
    } catch { return { kind: 'unavailable' }; }
  }
  function fromURL(input) {
    if (typeof input !== 'string' || !input || input.length > 8192 ||
        !/^https?:\/\//i.test(input) || input.trim() !== input || /[\u0000-\u0020\u007f\\]/u.test(input)) return invalid();
    try {
      const url = new URL(input);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return invalid();
      return fromHostname(url.hostname);
    } catch { return invalid(); }
  }
  function compare(left, right) {
    if ([left.kind, right.kind].includes('unavailable')) return { relation: 'unavailable', sameSite: null };
    if ([left.kind, right.kind].includes('invalid')) return { relation: 'unknown', sameSite: null };
    if (left.hostname === right.hostname) return { relation: 'same-host', sameSite: true };
    if (!left.siteKey || !right.siteKey) return { relation: 'unknown', sameSite: null };
    const sameSite = left.kind === right.kind && left.siteKey === right.siteKey;
    return { relation: sameSite ? 'same-site' : 'cross-site', sameSite };
  }
  return Object.freeze({
    fromHostname, fromURL,
    compareHosts: (left, right) => compare(fromHostname(left), fromHostname(right)),
    compareURLs: (left, right) => compare(fromURL(left), fromURL(right)),
  });
})();
