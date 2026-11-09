globalThis.PrivacyMonitorCookieView = (() => {
  'use strict';
  const COVERAGE = 'current-url-unpartitioned-and-top-level-site-non-fpi';
  const token = s => typeof s === 'string' && s.length > 0 && s.length <= 128 && !/[\u0000-\u001f\u007f]/.test(s);
  const host = s => {
    if (typeof s !== 'string' || !s || s.length > 253 ||
        !/^(?:[a-z0-9.-]+|\[[a-f0-9:.]+\])$/.test(s)) return false;
    try { return new URL('https://' + s + '/').hostname === s; } catch { return false; }
  };
  const exact = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) &&
    Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
  const sameSite = { no_restriction: 'None', lax: 'Lax', strict: 'Strict', unspecified: 'Unspecified (browser default)' };
  function valid(result) {
    if (!exact(result, ['kind','tabId','navigationId','documentId','storeId','hostname','coverage','cookies']) ||
        result.kind !== 'observed' || !Number.isSafeInteger(result.tabId) || result.tabId < 0 ||
        !token(result.navigationId) || !token(result.documentId) || !token(result.storeId) ||
        !host(result.hostname) || result.coverage !== COVERAGE ||
        !Array.isArray(result.cookies) || result.cookies.length > 256) return false;
    return result.cookies.every(c => {
      if (!exact(c, ['domain','hostOnly','session','expirationDate','secure','httpOnly','sameSite','partition','purpose']) ||
          !host(c.domain) || !['hostOnly','session','secure','httpOnly'].every(k => typeof c[k] === 'boolean') ||
          c.purpose !== null || !(c.sameSite === null || Object.hasOwn(sameSite, c.sameSite)) ||
          !(c.expirationDate === null || (Number.isFinite(c.expirationDate) && c.expirationDate >= 0 &&
            c.expirationDate <= 8640000000000)) || (c.session && c.expirationDate !== null)) return false;
      if (exact(c.partition, ['kind']) && c.partition.kind === 'unpartitioned') return true;
      if (!exact(c.partition, ['kind','topLevelSite']) || c.partition.kind !== 'top-level-site') return false;
      try {
        const url = new URL(c.partition.topLevelSite);
        return ['http:', 'https:'].includes(url.protocol) && host(url.hostname) &&
          !url.port && url.origin === c.partition.topLevelSite && c.partition.topLevelSite.length <= 261;
      } catch { return false; }
    });
  }
  function mount(doc) {
    const status = doc.getElementById('status'), heading = doc.getElementById('page-host');
    const findings = doc.getElementById('findings'), scope = doc.getElementById('scope');
    const results = doc.getElementById('results');
    const node = (tag, text) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
    function render(result) {
      findings.replaceChildren(); heading.textContent = ''; scope.textContent = ''; scope.hidden = true;
      results.setAttribute('aria-busy', ['loading','requesting'].includes(result?.kind) ? 'true' : 'false');
      if (result?.kind !== 'observed' || !valid(result)) {
        const messages = {
          idle: 'Ready. Choose Read cookie metadata to inspect the active page.',
          loading: 'Reading cookie metadata…',
          requesting: 'Waiting for cookie permission…',
          granted: 'Cookie access allowed. Choose Read cookie metadata to inspect the active page.',
          stale: 'The browsing context changed. Read again for the active page.',
          hidden: 'Cookie metadata cleared while this inspector is hidden.',
        };
        const reasons = {
          'permission-denied': 'Cookie access was denied. No cookie metadata was read.',
          'permission-unavailable': 'Cookie or website access is unavailable. This is not a zero-cookie result.',
          'integration-required': 'Cookie inspection is not enabled in this build.',
          busy: 'A cookie operation is still pending. Try again when it finishes.',
        };
        status.textContent = messages[result?.kind] || (result?.kind === 'unavailable' && reasons[result.reason]) ||
          'Cookie metadata is unavailable. No cookie count can be determined.';
        return;
      }
      heading.textContent = 'Page: ' + result.hostname;
      scope.hidden = false; scope.textContent = 'Store: ' + result.storeId + '. Snapshot of the selected scope; read again to update.';
      status.textContent = result.cookies.length ? result.cookies.length + ' cookie metadata records in the selected scope.' :
        'No matching cookies in the selected scope. Other cookies may exist outside this scope.';
      result.cookies.forEach((c, index) => {
        const card = node('article'); card.className = 'finding';
        card.append(node('h2', 'Cookie ' + (index + 1) + ': ' + c.domain));
        const dl = node('dl');
        const expiry = c.session ? 'Session cookie' : c.expirationDate === null ? 'Persistent; expiry unknown' :
          'Persistent; expires ' + new Date(c.expirationDate * 1000).toISOString().replace('T', ' ').replace('Z', ' UTC');
        for (const [label, value] of [
          ['Domain', c.domain], ['Domain scope', c.hostOnly ? 'Host only' : 'Domain cookie'],
          ['Lifetime', expiry], ['Secure', c.secure ? 'Yes' : 'No'], ['HttpOnly', c.httpOnly ? 'Yes' : 'No'],
          ['SameSite', c.sameSite === null ? 'Unknown' : sameSite[c.sameSite]],
          ['Partition', c.partition.kind === 'unpartitioned' ? 'Unpartitioned' : 'Top-level site: ' + c.partition.topLevelSite],
          ['Purpose', 'Unknown'],
        ]) dl.append(node('dt', label), node('dd', value));
        card.append(dl); findings.append(card);
      });
    }
    return Object.freeze({ render });
  }
  return Object.freeze({ mount });
})();
