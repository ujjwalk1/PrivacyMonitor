// Bounded response-header configuration analysis; not yet loaded by the beta manifest.
globalThis.PrivacyMonitorHeaderPolicies = (() => {
  'use strict';
  const LIMITS = Object.freeze({ headers: 256, name: 256, value: 4096, totalValue: 16384, url: 8192 });
  const NAMES = Object.freeze({
    'strict-transport-security': 'hsts',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'referrerPolicy',
  });
  const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  const trim = value => value.replace(/^[ \t]+|[ \t]+$/g, '');
  const finding = (state, reason, details = {}) => ({ state, reason, ...details });
  const unavailable = reason => ({ kind: 'unavailable', reason, data: null });

  // Delimiters inside quoted strings are not policy/directive separators.
  // Preserve quotes so quoted nosniff/referrer policy tokens cannot become valid.
  function split(value, delimiter) {
    const parts = [];
    let start = 0, quoted = false, escaped = false;
    for (let index = 0; index < value.length; index++) {
      const character = value[index];
      if (escaped) { escaped = false; continue; }
      if (quoted && character === '\\') { escaped = true; continue; }
      if (character === '"') quoted = !quoted;
      else if (!quoted && character === delimiter) {
        parts.push(trim(value.slice(start, index)));
        start = index + 1;
      }
    }
    parts.push(trim(value.slice(start)));
    return { parts, closed: !quoted && !escaped };
  }

  function hsts(values, page) {
    if (page.protocol !== 'https:') return finding('not-applicable', 'insecure-transport');
    // URL canonicalizes alternate IPv4 spellings and encloses IPv6 in brackets.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(page.hostname) || page.hostname.startsWith('[')) {
      return finding('not-applicable', 'ip-address');
    }
    if (!values.length) return finding('absent', 'header-absent');
    const directives = split(values[0], ';'); // RFC 6797: first field only.
    if (!directives.closed) return finding('invalid', 'invalid-syntax');
    const seen = new Set();
    let maxAge = null, includeSubDomains = false;
    for (const part of directives.parts) {
      if (!part) continue; // Empty directive slots are permitted by the grammar.
      const equals = part.indexOf('=');
      const name = trim(equals === -1 ? part : part.slice(0, equals)).toLowerCase();
      let value = equals === -1 ? null : trim(part.slice(equals + 1));
      if (!TOKEN.test(name)) return finding('invalid', 'invalid-syntax');
      if (seen.has(name)) return finding('invalid', 'duplicate-directive');
      seen.add(name);
      if (value !== null) {
        if (value.startsWith('"')) {
          // Only ASCII quoted strings are in this evaluator's supported input subset.
          if (!/^"(?:[^"\\]|\\[\t\x20-\x7e])*"$/.test(value)) return finding('invalid', 'invalid-syntax');
          value = value.slice(1, -1).replace(/\\([\t\x20-\x7e])/g, '$1');
        } else if (!TOKEN.test(value)) return finding('invalid', 'invalid-syntax');
      }
      if (name === 'max-age') {
        if (value === null || !/^\d+$/.test(value)) return finding('invalid', 'invalid-max-age');
        maxAge = Number(value);
      } else if (name === 'includesubdomains') {
        if (value !== null) return finding('invalid', 'valued-include-subdomains');
        includeSubDomains = true;
      }
      // Well-formed extension directives are ignored; their values never leave this call.
    }
    if (maxAge === null) return finding('invalid', 'missing-max-age');
    if (!Number.isSafeInteger(maxAge)) return finding('unavailable', 'max-age-out-of-range');
    return finding(maxAge === 0 ? 'disabled' : 'configured',
      maxAge === 0 ? 'max-age-zero' : 'positive-max-age',
      { maxAgeSeconds: maxAge, includeSubDomains: maxAge > 0 && includeSubDomains });
  }

  function nosniff(values) {
    if (!values.length) return finding('absent', 'header-absent');
    // Fetch uses the first decoded/split value, with ASCII case-insensitive matching.
    return split(values.join(', '), ',').parts[0].toLowerCase() === 'nosniff'
      ? finding('configured', 'nosniff-token')
      : finding('invalid', 'unrecognized-first-token');
  }

  // Referrer exposure for same-origin, cross-origin (no downgrade), HTTPS-to-HTTP.
  // "url" means a referrer URL stripped of credentials and fragment, not raw href.
  const REFERRERS = Object.freeze({
    'no-referrer': ['none', 'none', 'none'],
    'same-origin': ['url', 'none', 'none'],
    'strict-origin': ['origin', 'origin', 'none'],
    'strict-origin-when-cross-origin': ['url', 'origin', 'none'],
    'origin': ['origin', 'origin', 'origin'],
    'origin-when-cross-origin': ['url', 'origin', 'origin'],
    'no-referrer-when-downgrade': ['url', 'url', 'none'],
    'unsafe-url': ['url', 'url', 'url'],
  });
  function referrerPolicy(values) {
    if (!values.length) return finding('absent', 'header-absent');
    let policy = null;
    for (const token of split(values.join(', '), ',').parts) {
      if (Object.hasOwn(REFERRERS, token)) policy = token;
    }
    if (policy === null) return finding('invalid', 'no-recognized-policy');
    const [sameOrigin, crossOrigin, downgrade] = REFERRERS[policy];
    const permissive = crossOrigin === 'url' || downgrade !== 'none';
    return finding(permissive ? 'permissive' : 'configured',
      permissive ? 'referrer-exposure' : 'bounded-referrer-exposure',
      { policy, sameOrigin, crossOrigin, downgrade });
  }

  // Caller must supply the final main-frame response for the current navigation.
  // This function does not establish document identity or observe any network traffic.
  function evaluate(input) {
    try {
      if (input?.kind === 'not-observed') return { kind: 'not-observed', reason: 'not-observed', data: null };
      if (input?.kind !== 'observed') return unavailable('observation-unavailable');
      if (input.type !== 'main_frame') return unavailable('unsupported-response-type');
      if (!Number.isInteger(input.statusCode) || input.statusCode < 200 || input.statusCode > 599 ||
          (input.statusCode >= 300 && input.statusCode < 400)) return unavailable('incomplete-response');
      if (typeof input.url !== 'string' || input.url.length > LIMITS.url ||
          !/^https?:\/\//i.test(input.url) || /[\x00-\x20\x7f\\]/.test(input.url)) return unavailable('invalid-url');
      const page = new URL(input.url);
      if (!['http:', 'https:'].includes(page.protocol) || !page.hostname) return unavailable('invalid-url');
      const list = input.responseHeaders;
      if (!Array.isArray(list)) return unavailable('headers-unavailable');
      if (list.length > LIMITS.headers) return unavailable('header-limit');
      const groups = { hsts: [], nosniff: [], referrerPolicy: [] };
      const failures = {};
      let total = 0;
      for (const header of list) {
        if (!header || typeof header.name !== 'string' || !header.name.length ||
            header.name.length > LIMITS.name || !TOKEN.test(header.name)) return unavailable('invalid-header-name');
        const name = header.name.toLowerCase();
        if (!Object.hasOwn(NAMES, name)) continue; // Never read Set-Cookie or unrelated values.
        const key = NAMES[name];
        const value = header.value;
        if (typeof value !== 'string') { failures[key] = 'value-unavailable'; continue; }
        if (value.length > LIMITS.value) { failures[key] = 'value-limit'; continue; }
        total += value.length;
        if (total > LIMITS.totalValue) return unavailable('total-value-limit');
        if (/[^\t\x20-\x7e]/.test(value)) { failures[key] = 'unsupported-value-encoding'; continue; }
        groups[key].push(value);
      }
      const data = {};
      for (const [key, evaluator] of Object.entries({ hsts, nosniff, referrerPolicy })) {
        data[key] = failures[key] ? finding('unavailable', failures[key]) : evaluator(groups[key], page);
      }
      return { kind: 'observed', data };
    } catch {
      // Malformed URL or inaccessible browser data: never return a successful empty result.
      return unavailable('invalid-input');
    }
  }

  return Object.freeze({ evaluate, LIMITS });
})();
