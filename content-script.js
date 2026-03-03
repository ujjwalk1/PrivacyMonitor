// Privacy Monitor — content script
// Handles: password strength UI, page security analysis, insecure form detection

let isInitialized = false;
let passwordInputs = new Set();
let indicator = null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

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
  if (!indicator) {
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

const positionIndicator = throttle((ind, input) => {
  const rect = input.getBoundingClientRect();
  const scrollTop  = window.pageYOffset  || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  ind.style.top  = (rect.bottom + scrollTop  + 5) + 'px';
  ind.style.left = (rect.left   + scrollLeft)     + 'px';
}, 100);

function addPasswordListeners(input) {
  if (passwordInputs.has(input)) return;
  passwordInputs.add(input);

  const ind = getOrCreateIndicator();

  input.addEventListener('focus', () => {
    ind.style.display = 'block';
    positionIndicator(ind, input);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { ind.style.display = 'none'; }, 200);
  });

  const handleInput = throttle((e) => {
    const password = e.target.value;
    if (password.length === 0) { ind.style.display = 'none'; return; }

    const result = checkPasswordStrength(password);
    ind.innerHTML = `
      <div style="font-weight:bold;color:${result.color};">
        Password Strength: ${result.strength}
      </div>
      <div style="margin-top:4px;">
        ${result.feedback.length > 0
          ? '<strong>Suggestions:</strong><br>' +
            result.feedback.slice(0, 3).map(f => '• ' + f).join('<br>')
          : '✓ Strong password!'}
      </div>
    `;
    ind.style.display = 'block';
    positionIndicator(ind, input);
  }, 300);

  input.addEventListener('input', handleInput);
}

function findPasswordInputs() {
  document.querySelectorAll('input[type="password"]').forEach(addPasswordListeners);
}

// ---------------------------------------------------------------------------
// Insecure form detection
// ---------------------------------------------------------------------------

const WARN_ATTR = 'data-pm-warned';

function isInsecureAction(form) {
  const action = form.getAttribute('action');

  // Explicit http:// action
  if (action && /^http:\/\//i.test(action)) return true;

  // No action (submits to current URL) but page itself is HTTP
  if (!action && window.location.protocol === 'http:') return true;

  // Relative path on an HTTP page
  if (action && !/^https?:\/\//i.test(action) && window.location.protocol === 'http:') return true;

  return false;
}

function hasPasswordField(form) {
  return form.querySelector('input[type="password"]') !== null;
}

function injectFormWarning(form) {
  if (form.getAttribute(WARN_ATTR)) return; // Already warned
  form.setAttribute(WARN_ATTR, '1');

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
      <strong>Insecure Form:</strong> This form submits over HTTP.
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

  forms.forEach(form => {
    if (isInsecureAction(form)) {
      insecureCount++;
      if (hasPasswordField(form)) {
        insecurePasswordForms++;
        injectFormWarning(form);
      }
    }
  });

  // Persist results for popup
  const storageApi = typeof browser !== 'undefined' ? browser : chrome;
  try {
    storageApi.storage.local.set({
      [`forms_${window.location.hostname}`]: {
        insecureForms: insecureCount,
        insecurePasswordForms,
        pageIsHttps: window.location.protocol === 'https:',
        timestamp: Date.now(),
      },
    });
  } catch (e) {
    console.log('[Privacy Monitor] Storage error:', e);
  }
}

// ---------------------------------------------------------------------------
// Page security analysis
// ---------------------------------------------------------------------------

function analyzePageSecurity() {
  const data = {
    url:              window.location.href,
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

  const storageApi = typeof browser !== 'undefined' ? browser : chrome;
  try {
    storageApi.storage.local.set({
      [`security_data_${window.location.hostname}`]: data,
    });
  } catch (e) {
    console.log('[Privacy Monitor] Storage error:', e);
  }
}

// ---------------------------------------------------------------------------
// Mutation observer (watch for dynamic content)
// ---------------------------------------------------------------------------

const debouncedFindInputs = throttle(findPasswordInputs, 1000);
const debouncedFormCheck  = throttle(analyzeInsecureForms, 2000);

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let checkInputs = false;
    let checkForms  = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'INPUT' || (node.querySelector && node.querySelector('input[type="password"]'))) {
          checkInputs = true;
        }
        if (node.tagName === 'FORM' || (node.querySelector && node.querySelector('form'))) {
          checkForms = true;
        }
      }
      if (checkInputs && checkForms) break;
    }

    if (checkInputs) debouncedFindInputs();
    if (checkForms)  debouncedFormCheck();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function initialize() {
  if (isInitialized) return;
  isInitialized = true;

  findPasswordInputs();
  analyzePageSecurity();
  analyzeInsecureForms();
  setupMutationObserver();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
