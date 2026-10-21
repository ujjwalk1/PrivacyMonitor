// Privacy Monitor — content script
// Handles: password strength UI, page security analysis, insecure form detection

let isInitialized = false;
let activePasswordInput = null;
let passwordFeedbackTimer = null;
let indicator = null;

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

function checkPasswordStrength(password) {
  let score = 0;
  let feedback = [];

  if (password.length >= 8) score += 2;
  else feedback.push("Use at least 8 characters");

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  else feedback.push("Add special characters");

  if (/(123|abc|password|qwerty)/i.test(password)) {
    score -= 2;
    feedback.push("Avoid common patterns");
  }

  let strength = "Very Weak";
  let color = "#ff4444";

  if (score >= 7)      { strength = "Strong"; color = "#44cc44"; }
  else if (score >= 5) { strength = "Medium"; color = "#ffaa44"; }
  else if (score >= 3) { strength = "Weak";   color = "#ff8844"; }

  return { strength, score, feedback, color };
}

function getOrCreateIndicator() {
  if (!indicator || !indicator.isConnected) {
    indicator = document.createElement('div');
    indicator.id = 'pm-password-indicator';
    indicator.style.cssText = `
      position: absolute;
      background: white;
      border: 2px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      font-size: 12px;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 250px;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(indicator);
  }
  return indicator;
}

function positionIndicator(ind, input) {
  const rect = input.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  ind.style.top = (rect.bottom + scrollTop + 5) + 'px';
  ind.style.left = (rect.left + scrollLeft) + 'px';
}

function isLivePasswordInput(input) {
  return input?.isConnected && input.tagName === 'INPUT' && input.type === 'password';
}

function clearPasswordFeedback() {
  clearTimeout(passwordFeedbackTimer);
  passwordFeedbackTimer = null;
  activePasswordInput = null;
  if (indicator) {
    indicator.style.display = 'none';
    indicator.innerHTML = '';
  }
}

function renderPasswordFeedback() {
  const input = activePasswordInput;
  if (!isLivePasswordInput(input)) { clearPasswordFeedback(); return; }
  const ind = getOrCreateIndicator();
  // Read only the current field, synchronously; never retain a value or input event.
  if (!input.value) { ind.style.display = 'none'; ind.innerHTML = ''; return; }
  const result = checkPasswordStrength(input.value);
  ind.innerHTML = `
    <div style="font-weight:bold;color:${result.color};">Password Strength: ${result.strength}</div>
    <div style="margin-top:4px;">
      ${result.feedback.length > 0
        ? '<strong>Suggestions:</strong><br>' + result.feedback.slice(0, 3).map(f => '• ' + f).join('<br>')
        : '✓ Strong password!'}
    </div>`;
  ind.style.display = 'block';
  positionIndicator(ind, input);
}

function reconcilePasswordFeedback() {
  if (activePasswordInput && !isLivePasswordInput(activePasswordInput)) clearPasswordFeedback();
  if (indicator && !indicator.isConnected) {
    indicator = null;
    if (activePasswordInput) renderPasswordFeedback();
  }
  // A focused text input may have become a password input since its focus event.
  if (!activePasswordInput && isLivePasswordInput(document.activeElement)) {
    activePasswordInput = document.activeElement;
    renderPasswordFeedback();
  }
}

function setupPasswordListeners() {
  // Delegation covers inserted/reinserted fields without a per-node registry.
  document.addEventListener('focusin', event => {
    clearPasswordFeedback();
    if (!isLivePasswordInput(event.target)) return;
    activePasswordInput = event.target;
    renderPasswordFeedback();
  }, true);
  document.addEventListener('focusout', event => {
    if (event.target === activePasswordInput) clearPasswordFeedback();
  }, true);
  document.addEventListener('input', event => {
    if (!isLivePasswordInput(event.target)) {
      if (event.target === activePasswordInput) clearPasswordFeedback();
      return;
    }
    if (event.target !== activePasswordInput || passwordFeedbackTimer !== null) return;
    passwordFeedbackTimer = setTimeout(() => {
      passwordFeedbackTimer = null;
      renderPasswordFeedback();
    }, 300);
  }, true);
}

// ---------------------------------------------------------------------------
// Insecure form detection
// ---------------------------------------------------------------------------

const WARN_ATTR = 'data-pm-warned';

function resolveFormDestination(form, submitter = null) {
  // Attribute presence matters: an empty override does not inherit the form action.
  const method = submitter?.getAttribute('formmethod') ?? form.getAttribute('method');
  if (method?.toLowerCase() === 'dialog') return 'none';
  const action = submitter?.getAttribute('formaction') ?? form.getAttribute('action');
  const owner = form.ownerDocument;
  try {
    // Missing/empty actions use the document URL, independently of <base>.
    const destination = new URL(action == null || action === '' ? owner.URL : action, owner.baseURI);
    if (destination.protocol === 'http:') return 'http';
    if (destination.protocol === 'https:') return 'https';
  } catch (_) { /* Do not retain or log invalid destination URLs. */ }
  return 'unknown';
}

function injectFormWarning(form) {
  form.setAttribute(WARN_ATTR, '1');
  if (form.querySelector('[data-pm-banner]')) return; // Preserve an existing warning; recreate a removed one.

  const banner = document.createElement('div');
  banner.setAttribute('data-pm-banner', '1');
  banner.style.cssText = `
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #856404;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 2147483646;
  `;
  banner.innerHTML = `
    <span style="font-size:16px;">⚠️</span>
    <span>
      <strong>Insecure Form:</strong> This form can submit over HTTP.
      Your data (including passwords) may be visible to attackers.
    </span>
  `;

  // Insert banner as first child of the form
  form.insertBefore(banner, form.firstChild);
}

function analyzeInsecureForms() {
  const forms = document.querySelectorAll('form');
  let insecureCount = 0;
  let insecurePasswordForms = 0;
  let hasUnknownDestination = false;
  const associated = new Map();
  // Native form ownership includes external controls and excludes controls owned
  // by another form. Query input images too: form.elements omits them.
  document.querySelectorAll('button, input').forEach(control => {
    if (!control.form) return;
    if (!associated.has(control.form)) associated.set(control.form, []);
    associated.get(control.form).push(control);
  });

  forms.forEach(form => {
    const controls = associated.get(form) ?? [];
    const destinations = [resolveFormDestination(form)];
    controls.forEach(control => {
      const isSubmitter = control.type === 'submit' ||
        (control.tagName === 'INPUT' && control.type === 'image');
      if (isSubmitter && !control.matches(':disabled')) {
        destinations.push(resolveFormDestination(form, control));
      }
    });
    if (destinations.includes('unknown')) hasUnknownDestination = true;
    if (destinations.includes('http')) {
      insecureCount++;
      if (controls.some(control => control.tagName === 'INPUT' && control.type === 'password')) {
        insecurePasswordForms++;
        injectFormWarning(form);
        return;
      }
    }
    // Both automatic scans and explicit refresh remove obsolete warnings.
    form.querySelectorAll('[data-pm-banner]').forEach(banner => banner.remove());
    form.removeAttribute(WARN_ATTR);
  });

  // The legacy contract has no per-route unknown state. Fail the aggregate closed
  // rather than awarding a complete score from only the resolvable destinations.
  if (hasUnknownDestination) return false;
  return {
    insecureForms: insecureCount, insecurePasswordForms,
    pageIsHttps: window.location.protocol === 'https:', timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Page security analysis
// ---------------------------------------------------------------------------

function analyzePageSecurity() {
  const data = {
    protocol:         window.location.protocol,
    cookies:          document.cookie ? document.cookie.split(';').length : 0,
    scripts:          document.querySelectorAll('script').length,
    thirdPartyScripts: 0,
    httpsOnly:        window.location.protocol === 'https:',
    timestamp:        Date.now(),
  };

  document.querySelectorAll('script[src]').forEach(script => {
    try {
      const scriptUrl = new URL(script.src, window.location.href);
      if (scriptUrl.hostname !== window.location.hostname) {
        data.thirdPartyScripts++;
      }
    } catch (e) { /* ignore invalid URLs */ }
  });

  return data;
}


// One scan path for startup, the existing observer, and explicit popup refresh.
// Legacy storage remains a temporary adapter until the rest of D09 is migrated.
const contentApi = typeof browser !== 'undefined' ? browser : chrome;
let analysisQueue = Promise.resolve();
function analyzePage() {
  const run = analysisQueue.then(async () => {
    clearTimeout(dynamicTimer);
    dynamicTimer = null;
    dynamicDirty = false;
    let basicData, formData;
    // A full scan supersedes pending records. Disconnect only during synchronous
    // DOM work so our banners cannot feed the observer; reconnect before storage.
    mutationObserver?.disconnect();
    try {
      reconcilePasswordFeedback();
      basicData = analyzePageSecurity();
      formData = analyzeInsecureForms();
    } finally {
      mutationObserver?.observe(document, OBSERVER_OPTIONS);
    }
    // Keep page warnings local in private/unknown contexts; never use persistent scan storage.
    if (contentApi.extension?.inIncognitoContext !== false) return;
    await contentApi.storage.local.set({
      [`security_data_${window.location.hostname}`]: basicData,
      [`forms_${window.location.hostname}`]: formData,
    });
  });
  // Serialize writes so an earlier scan cannot finish after a later scan in this document.
  // A failed write must not prevent the next explicit retry.
  analysisQueue = run.catch(() => {});
  return run;
}

function scheduleAnalysis() {
  void analyzePage().catch(() => {}); // No page data or raw browser errors are logged.
}

contentApi.runtime.onMessage.addListener((message, sender) => {
  if (message?.channel !== 'privacy-monitor.scan') return undefined;
  const reply = result => Promise.resolve({ channel: 'privacy-monitor.scan', version: 1, ...result });
  if (sender?.id !== contentApi.runtime.id || sender?.url !== contentApi.runtime.getURL('popup.html') || sender?.tab) {
    return reply({ ok: false, error: 'forbidden' });
  }
  if (message.version !== 1 || message.type !== 'refresh' ||
      Object.keys(message).length !== 3) return reply({ ok: false, error: 'invalid-request' });
  if (!isInitialized) return reply({ ok: false, error: 'not-ready' });
  return analyzePage().then(() => reply({ ok: true }), () => reply({ ok: false, error: 'scan-unavailable' }));
});

// ---------------------------------------------------------------------------
// Mutation observer (watch for dynamic content)
// ---------------------------------------------------------------------------

const OBSERVER_OPTIONS = {
  childList: true, subtree: true, attributes: true,
  attributeFilter: ['action', 'method', 'formaction', 'formmethod', 'form', 'type', 'disabled', 'id', 'href'],
};
const DYNAMIC_SCAN_DELAY = 500;
let mutationObserver = null;
let dynamicTimer = null;
let dynamicInFlight = false;
let dynamicDirty = false;

function scheduleDynamicAnalysis() {
  dynamicDirty = true;
  if (dynamicTimer !== null || dynamicInFlight) return;
  dynamicTimer = setTimeout(async () => {
    dynamicTimer = null;
    dynamicInFlight = true;
    dynamicDirty = false;
    try { await analyzePage(); } catch (_) { /* Retry on the next change/refresh. */ }
    finally {
      dynamicInFlight = false;
      if (dynamicDirty) scheduleDynamicAnalysis();
    }
  }, DYNAMIC_SCAN_DELAY);
}

function affectsFormMonitoring(mutation) {
  // Feedback changes only this root's innerHTML. Attribute filtering excludes
  // position/style updates. Removing the root itself still triggers recovery.
  if (mutation.target === indicator) return false;
  if (mutation.type === 'childList') return true;
  const tag = mutation.target?.tagName;
  const name = mutation.attributeName;
  // Any element's ID can affect native form association when IDs collide.
  if (name === 'id') return true;
  if (tag === 'FORM') return ['action', 'method', 'id'].includes(name);
  if (tag === 'INPUT' || tag === 'BUTTON') {
    return ['formaction', 'formmethod', 'form', 'type', 'disabled'].includes(name);
  }
  if (tag === 'FIELDSET') return name === 'disabled';
  if (tag === 'BASE') return name === 'href';
  return false;
}

function setupMutationObserver() {
  mutationObserver = new MutationObserver((mutations) => {
    // No subtree queries or retained records/nodes in this callback. Large batches
    // conservatively schedule one scan instead of walking an unbounded list.
    if (mutations.length > 64 || mutations.some(affectsFormMonitoring)) scheduleDynamicAnalysis();
  });
  // analyzePage starts observing the whole document (including <head>/<base>).
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function initialize() {
  if (isInitialized) return;
  isInitialized = true;

  setupPasswordListeners();
  setupMutationObserver();
  scheduleAnalysis();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
