// Local observation score only; no DOM, storage, or network access. See docs/SCORING.md.
const PrivacyMonitorScoring = (() => {
  const HEADER_WEIGHTS = Object.freeze({
    CSP: 10,
    HSTS: 10,
    'X-Frame-Options': 10,
    'X-Content-Type-Options': 5,
    'Referrer-Policy': 5,
    'Permissions-Policy': 2,
  });
  const MAX_HEADER_WEIGHT = Object.values(HEADER_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

  // null means insufficient/invalid observations, never a clean or zero result.
  function calculateSecurityScore(data) {
    const { basicData, headerData, formData } = data ?? {};
    if (typeof basicData?.httpsOnly !== 'boolean' ||
        !Number.isSafeInteger(formData?.insecurePasswordForms) ||
        formData.insecurePasswordForms < 0) return null;

    const present = headerData?.present;
    const missing = headerData?.missing;
    if (!present || typeof present !== 'object' || Array.isArray(present) ||
        !Array.isArray(missing) || new Set(missing).size !== missing.length ||
        missing.some(name => !Object.prototype.hasOwnProperty.call(HEADER_WEIGHTS, name))) return null;

    let observedHeaderWeight = 0;
    for (const [name, weight] of Object.entries(HEADER_WEIGHTS)) {
      const found = Object.prototype.hasOwnProperty.call(present, name);
      // Each header must be explicitly present OR absent in the observation.
      if (found === missing.includes(name)) return null;
      if (found) {
        if (typeof present[name] !== 'string') return null;
        observedHeaderWeight += weight;
      }
    }

    const httpsPoints = basicData.httpsOnly ? 40 : 0;
    const headerPoints = Math.round(40 * observedHeaderWeight / MAX_HEADER_WEIGHT);
    const formPoints = formData.insecurePasswordForms === 0 ? 20 : 0;
    return httpsPoints + headerPoints + formPoints;
  }

  return Object.freeze({ calculateSecurityScore });
})();
