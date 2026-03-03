// popup.js — Privacy Monitor v1.1

const api = typeof browser !== 'undefined' ? browser : chrome;

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function calculateSecurityScore({ basicData, headerData, breachData, formData }) {
  let score = 0;

  // HTTPS: 25 pts
  if (basicData?.httpsOnly) score += 25;

  // Security headers: up to 30 pts (based on headerScore 0-100 mapped to 0-30)
  if (headerData?.headerScore != null) {
    score += Math.round((headerData.headerScore / 100) * 30);
  }

  // Cookie penalty: up to -10
  if (basicData) {
    score -= Math.min(basicData.cookies * 2, 10);
  }

  // Third-party script penalty: up to -15
  if (basicData) {
    score -= Math.min(basicData.thirdPartyScripts * 3, 15);
  }

  // Breach penalty: -15 if site has been breached
  if (breachData && Array.isArray(breachData) && breachData.length > 0) {
    score -= 15;
  }

  // Insecure form penalty: -10 if password form is HTTP
  if (formData?.insecurePasswordForms > 0) {
    score -= 10;
  }

  // Base
  score += 20;

  return Math.max(0, Math.min(100, score));
}

function getScoreStyle(score) {
  if (score >= 80) return { color: '#4ade80', label: 'Excellent' };
  if (score >= 60) return { color: '#facc15', label: 'Good'      };
  if (score >= 40) return { color: '#fb923c', label: 'Fair'      };
  return                   { color: '#f87171', label: 'Poor'      };
}

// ---------------------------------------------------------------------------
// Ring chart
// ---------------------------------------------------------------------------

function updateScoreRing(score) {
  const { color, label } = getScoreStyle(score);
  const arc = document.getElementById('score-arc');
  const text = document.getElementById('score-text');
  const lbl  = document.getElementById('score-label');

  // stroke-dashoffset: 100 = empty, 0 = full; offset = 100 - score
  arc.setAttribute('stroke-dashoffset', String(100 - score));
  arc.setAttribute('stroke', color);
  text.textContent = String(score);
  lbl.textContent  = label;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function show(id) { document.getElementById(id).style.display = ''; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function showFlex(id) { document.getElementById(id).style.display = 'flex'; }
function showBlock(id) { document.getElementById(id).style.display = 'block'; }

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderConnection(data) {
  document.getElementById('protocol').textContent = data.protocol.replace(':', '').toUpperCase();

  const el = document.getElementById('https-status');
  if (data.httpsOnly) {
    el.textContent  = '✓ Secure';
    el.className    = 'metric-value good';
  } else {
    el.textContent  = '⚠ Not Secure';
    el.className    = 'metric-value danger';
  }
}

function renderPrivacy(data) {
  document.getElementById('cookie-count').textContent  = data.cookies;
  document.getElementById('script-count').textContent  = data.scripts;

  const tpEl = document.getElementById('third-party-scripts');
  tpEl.textContent = data.thirdPartyScripts;
  if      (data.thirdPartyScripts > 10) tpEl.className = 'metric-value danger';
  else if (data.thirdPartyScripts > 5)  tpEl.className = 'metric-value warning';
  else                                   tpEl.className = 'metric-value good';
}

function renderHeaders(headerData) {
  hide('headers-loading');

  if (!headerData) {
    show('headers-error');
    return;
  }

  const grid = document.getElementById('headers-grid');
  grid.style.display = 'flex';

  const allHeaders = [
    'CSP', 'HSTS', 'X-Frame-Options',
    'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy',
  ];

  grid.innerHTML = allHeaders.map(name => {
    const present = name in headerData.present;
    return `<span class="header-pill ${present ? 'pill-present' : 'pill-missing'}">
      ${present ? '✓' : '✗'} ${name}
    </span>`;
  }).join('');
}

function renderBreaches(breaches) {
  hide('breach-loading');

  if (breaches === null) {
    show('breach-error');
    return;
  }

  if (breaches.length === 0) {
    showFlex('breach-none');
    return;
  }

  const list = document.getElementById('breach-list');
  list.style.display = 'flex';

  // Show up to 3 most recent breaches
  const recent = [...breaches]
    .sort((a, b) => new Date(b.BreachDate) - new Date(a.BreachDate))
    .slice(0, 3);

  list.innerHTML = recent.map(b => `
    <div class="breach-item">
      <div class="breach-name">⚠ ${escHtml(b.Name)}</div>
      <div class="breach-meta">
        ${escHtml(b.BreachDate)} · ${(b.PwnCount || 0).toLocaleString()} accounts
        ${b.DataClasses ? '<br>' + b.DataClasses.slice(0, 3).map(escHtml).join(', ') : ''}
      </div>
    </div>
  `).join('');

  if (breaches.length > 3) {
    list.insertAdjacentHTML('beforeend',
      `<div style="font-size:11px;color:#b45309;padding:2px 0;">
        + ${breaches.length - 3} more breach${breaches.length - 3 > 1 ? 'es' : ''}
      </div>`
    );
  }
}

function renderForms(formData) {
  hide('forms-loading');
  const body = document.getElementById('forms-body');
  body.style.display = 'block';

  if (!formData) {
    body.innerHTML = `<div class="loading-row" style="color:#9ca3af;">No form data available</div>`;
    return;
  }

  if (formData.insecurePasswordForms > 0) {
    body.innerHTML = `
      <div class="form-warning">
        ⚠️ <strong>${formData.insecurePasswordForms} insecure form${formData.insecurePasswordForms > 1 ? 's' : ''} detected</strong><br>
        Password form${formData.insecurePasswordForms > 1 ? 's' : ''} submit${formData.insecurePasswordForms === 1 ? 's' : ''}
        over HTTP — credentials could be intercepted.
      </div>`;
  } else if (formData.insecureForms > 0) {
    body.innerHTML = `
      <div class="form-warning">
        ⚠️ ${formData.insecureForms} form${formData.insecureForms > 1 ? 's' : ''} use HTTP
        (no password fields detected).
      </div>`;
  } else {
    body.innerHTML = `
      <div class="no-breaches" style="padding:8px 12px;">
        ✅ All forms use secure submission
      </div>`;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchBreaches(hostname) {
  try {
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(hostname)}`,
      { headers: { 'User-Agent': 'PrivacyMonitorExtension/1.1' } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('[Privacy Monitor] Breach API error:', e);
    return null; // null = network failure
  }
}

async function loadAllData() {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    let hostname;

    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      document.getElementById('loading-screen').textContent = 'Cannot analyze this page.';
      return;
    }

    document.getElementById('current-domain').textContent = hostname;

    // Fetch stored data
    const stored = await api.storage.local.get([
      `security_data_${hostname}`,
      `headers_${hostname}`,
      `forms_${hostname}`,
    ]);

    const basicData  = stored[`security_data_${hostname}`] || null;
    const headerData = stored[`headers_${hostname}`]       || null;
    const formData   = stored[`forms_${hostname}`]         || null;

    // Show main UI immediately with what we have
    hide('loading-screen');
    showBlock('main-content');

    if (basicData) {
      renderConnection(basicData);
      renderPrivacy(basicData);
    } else {
      // No page data yet — content script hasn't run (e.g. browser page)
      document.getElementById('loading-screen').textContent =
        'No data yet — try refreshing the page.';
      show('loading-screen');
      hide('main-content');
      return;
    }

    renderHeaders(headerData);
    renderForms(formData);

    // Breach check is async — show spinner until done
    const breaches = await fetchBreaches(hostname);
    renderBreaches(breaches);

    // Final score (now that we have everything)
    const score = calculateSecurityScore({ basicData, headerData, breachData: breaches, formData });
    updateScoreRing(score);

  } catch (err) {
    console.error('[Privacy Monitor] Load error:', err);
    document.getElementById('loading-screen').textContent = 'Error loading data.';
  }
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

async function refreshData() {
  const btn = document.getElementById('refresh');
  btn.textContent = '⏳ Refreshing…';
  btn.disabled = true;

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const scriptingAPI = api.scripting || chrome.scripting;

    await scriptingAPI.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Re-run security and form analysis
        const hostname = window.location.hostname;
        const storageApi = typeof browser !== 'undefined' ? browser : chrome;

        const secData = {
          url: window.location.href,
          protocol: window.location.protocol,
          cookies: document.cookie ? document.cookie.split(';').length : 0,
          scripts: document.querySelectorAll('script').length,
          thirdPartyScripts: 0,
          httpsOnly: window.location.protocol === 'https:',
          timestamp: Date.now(),
        };

        document.querySelectorAll('script[src]').forEach(s => {
          try {
            if (new URL(s.src).hostname !== hostname) secData.thirdPartyScripts++;
          } catch {}
        });

        storageApi.storage.local.set({ [`security_data_${hostname}`]: secData });

        // Re-analyze forms (remove old banners first)
        document.querySelectorAll('[data-pm-banner]').forEach(b => b.remove());
        document.querySelectorAll('[data-pm-warned]').forEach(f => f.removeAttribute('data-pm-warned'));

        let insecureForms = 0, insecurePasswordForms = 0;
        document.querySelectorAll('form').forEach(form => {
          const action = form.getAttribute('action');
          const isHttp = (action && /^http:\/\//i.test(action)) ||
                         (!action && window.location.protocol === 'http:') ||
                         (action && !/^https?:\/\//i.test(action) && window.location.protocol === 'http:');
          if (isHttp) {
            insecureForms++;
            if (form.querySelector('input[type="password"]')) insecurePasswordForms++;
          }
        });

        storageApi.storage.local.set({
          [`forms_${hostname}`]: {
            insecureForms, insecurePasswordForms,
            pageIsHttps: window.location.protocol === 'https:',
            timestamp: Date.now(),
          },
        });
      },
    });

    setTimeout(() => {
      loadAllData();
      btn.textContent = '🔄 Refresh Analysis';
      btn.disabled = false;
    }, 600);

  } catch (err) {
    console.error('[Privacy Monitor] Refresh error:', err);
    btn.textContent = '🔄 Refresh Analysis';
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  document.getElementById('refresh').addEventListener('click', refreshData);
});
