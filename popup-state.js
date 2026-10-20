// Pure mapping of existing observations to popup states. No page/API access.
const PrivacyMonitorPopupState = (() => {
  const HEADER_NAMES = ['CSP', 'HSTS', 'X-Frame-Options',
    'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'];
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isCount = value => Number.isSafeInteger(value) && value >= 0;
  const unknown = value => ({ kind: value == null ? 'not-observed' : 'unavailable' });

  function count(value) {
    return isCount(value) ? { kind: 'observed', value } : unknown(value);
  }

  function page(tab) {
    if (!tab || typeof tab.url !== 'string' || !tab.url) return { kind: 'unavailable' };
    let url;
    try { url = new URL(tab.url); } catch { return { kind: 'unavailable' }; }
    if (!['http:', 'https:'].includes(url.protocol)) return { kind: 'unsupported' };
    return { kind: 'supported', hostname: url.hostname };
  }

  function connection(data) {
    if (data == null) return unknown(data);
    if (!isRecord(data)) return { kind: 'unavailable' };
    if (data.protocol == null || data.httpsOnly == null) return { kind: 'not-observed' };
    if (!['http:', 'https:'].includes(data.protocol) ||
        typeof data.httpsOnly !== 'boolean' || data.httpsOnly !== (data.protocol === 'https:')) {
      return { kind: 'unavailable' };
    }
    return { kind: 'observed', protocol: data.protocol, httpsOnly: data.httpsOnly };
  }

  function headers(data) {
    const invalid = data != null && (!isRecord(data) ||
      (data.present != null && !isRecord(data.present)) ||
      (data.missing != null && (!Array.isArray(data.missing) ||
        new Set(data.missing).size !== data.missing.length ||
        data.missing.some(name => !HEADER_NAMES.includes(name)))));
    return HEADER_NAMES.map(name => {
      if (invalid) return { name, kind: 'unavailable' };
      const present = Object.prototype.hasOwnProperty.call(data?.present ?? {}, name);
      const absent = (data?.missing ?? []).includes(name);
      if ((present && absent) || (present && typeof data.present[name] !== 'string')) {
        return { name, kind: 'unavailable' };
      }
      return { name, kind: present ? 'present' : absent ? 'absent' : 'not-observed' };
    });
  }

  function forms(data) {
    if (data == null) return unknown(data);
    if (!isRecord(data)) return { kind: 'unavailable' };
    if (data.insecureForms == null || data.insecurePasswordForms == null) return { kind: 'not-observed' };
    if (!isCount(data.insecureForms) || !isCount(data.insecurePasswordForms) ||
        data.insecurePasswordForms > data.insecureForms) return { kind: 'unavailable' };
    return { kind: 'observed', insecureForms: data.insecureForms,
      insecurePasswordForms: data.insecurePasswordForms };
  }

  function local(data) {
    const result = {
      connection: connection(data.basicData),
      headers: headers(data.headerData),
      forms: forms(data.formData),
      cookies: count(data.basicData?.cookies),
      scripts: count(data.basicData?.scripts),
      thirdPartyScripts: count(data.basicData?.thirdPartyScripts),
    };
    const observed = [result.connection, result.forms, result.cookies, result.scripts, result.thirdPartyScripts]
      .every(item => item.kind === 'observed');
    result.kind = observed && result.headers.every(item => ['present', 'absent'].includes(item.kind))
      ? 'ready' : 'incomplete';
    return result;
  }

  function breaches(value) {
    // Validate every field used by the renderer; reject partial malformed lists.
    const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!Array.isArray(value) || !value.every(item => isRecord(item) &&
        typeof item.Name === 'string' && item.Name.trim() &&
        isDate(item.BreachDate) &&
        (item.PwnCount == null || isCount(item.PwnCount)) &&
        (item.DataClasses == null || (Array.isArray(item.DataClasses) &&
          item.DataClasses.every(entry => typeof entry === 'string'))))) return 'unavailable';
    return value.length ? 'results' : 'empty';
  }

  // D08 bridge: project per-tab presence states for the existing scorer/renderer.
  function legacyHeaders(observation) {
    if (observation?.kind === 'not-observed') return undefined;
    if (observation?.kind !== 'observed' || !isRecord(observation.data) ||
        Object.keys(observation.data).length !== HEADER_NAMES.length ||
        !HEADER_NAMES.every(name => Object.hasOwn(observation.data, name) &&
          ['present', 'absent', 'not-observed', 'unavailable'].includes(observation.data[name]))) return false;
    const present = {}, missing = [];
    for (const name of HEADER_NAMES) {
      const kind = observation.data[name];
      if (kind === 'present') present[name] = ''; // Presence only; raw header values are not retained.
      else if (kind === 'absent') missing.push(name);
      else if (kind === 'unavailable') present[name] = null;
    }
    return { present, missing };
  }
  return Object.freeze({ page, local, breaches, legacyHeaders });
})();
