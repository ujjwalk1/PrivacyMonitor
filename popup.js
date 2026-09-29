// popup.js — Privacy Monitor v1.1

const api = typeof browser !== 'undefined' ? browser : chrome;
let loadVersion = 0;

// ---------------------------------------------------------------------------
// Score presentation (calculation lives in scoring.js)
// ---------------------------------------------------------------------------

function getScoreStyle(score) {
  if (score >= 80) return { color: '#4ade80', label: 'Excellent' };
  if (score >= 60) return { color: '#facc15', label: 'Good'      };
  if (score >= 40) return { color: '#fb923c', label: 'Fair'      };
  return                   { color: '#f87171', label: 'Poor'      };
}

// ---------------------------------------------------------------------------
// Ring chart
// ---------------------------------------------------------------------------

function updateScoreRing(score, emptyLabel = 'Incomplete') {
  const arc = document.getElementById('score-arc');
  const text = document.getElementById('score-text');
  const lbl  = document.getElementById('score-label');

  if (score === null) {
    arc.setAttribute('stroke-dashoffset', '100');
    arc.setAttribute('stroke', '#9ca3af');
    text.textContent = '—';
    lbl.textContent = emptyLabel;
    return;
  }

  const { color, label } = getScoreStyle(score);
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

function renderOverall(kind, message) {
  const labels = { loading: 'Loading', incomplete: 'Incomplete', unavailable: 'Unavailable',
    unsupported: 'Unsupported' };
  const messages = {
    loading: 'Loading observations…',
    incomplete: 'Analysis incomplete. Some observations are missing or unavailable. Reload the page and try again; Firefox may restrict access.',
    unavailable: 'Analysis unavailable. Could not read this tab or its observations. Try again on an ordinary web page.',
    unsupported: 'Unsupported page. Privacy Monitor analyzes HTTP and HTTPS pages, not browser-internal, extension, or local-file pages.',
    ready: 'Local observations loaded. This score is not a safety guarantee.',
  };
  document.getElementById('loading-screen').setAttribute('data-state', kind);
  document.getElementById('status-message').textContent = message || messages[kind];
  document.getElementById('status-spinner').style.display = kind === 'loading' ? 'block' : 'none';
  document.getElementById('main-content').style.display = ['ready', 'incomplete'].includes(kind) ? 'block' : 'none';
  document.getElementById('refresh').disabled = ['loading', 'unsupported'].includes(kind);
  if (kind !== 'ready') updateScoreRing(null, labels[kind]);
}

function resetView() {
  document.getElementById('current-domain').textContent = '—';
  renderConnection({ kind: 'not-observed' });
  renderPrivacy(PrivacyMonitorPopupState.local({}));
  hide('headers-grid');
  hide('headers-error');
  hide('forms-body');
  document.getElementById('headers-grid').innerHTML = '';
  document.getElementById('forms-body').innerHTML = '';
  showFlex('headers-loading');
  showFlex('forms-loading');
  resetBreaches();
  renderOverall('loading');
}

function resetBreaches() {
  for (const id of ['breach-none', 'breach-list', 'breach-error']) hide(id);
  document.getElementById('breach-list').innerHTML = '';
  document.getElementById('breach-error').textContent = 'Breach lookup unavailable. No conclusion can be drawn.';
  showFlex('breach-loading');
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderConnection(data) {
  const el = document.getElementById('https-status');
  if (data.kind !== 'observed') {
    const label = data.kind === 'not-observed' ? 'Not observed' : 'Unavailable';
    document.getElementById('protocol').textContent = label;
    el.textContent = label;
    el.className = 'metric-value muted';
    return;
  }
  document.getElementById('protocol').textContent = data.protocol.replace(':', '').toUpperCase();
  if (data.httpsOnly) {
    el.textContent  = 'HTTPS observed';
    el.className    = 'metric-value good';
  } else {
    el.textContent  = 'HTTP observed';
    el.className    = 'metric-value danger';
  }
}

function renderPrivacy(data) {
  for (const [id, value] of [['cookie-count', data.cookies], ['script-count', data.scripts],
    ['third-party-scripts', data.thirdPartyScripts]]) {
    const el = document.getElementById(id);
    el.textContent = value.kind === 'observed' ? String(value.value)
      : value.kind === 'not-observed' ? 'Not observed' : 'Unavailable';
    el.className = value.kind === 'observed' ? 'metric-value' : 'metric-value muted';
  }
}

function renderHeaders(headers) {
  hide('headers-loading');
  hide('headers-error');
  const grid = document.getElementById('headers-grid');
  grid.style.display = 'flex';
  const labels = { present: 'Present', absent: 'Absent', 'not-observed': 'Not observed', unavailable: 'Unavailable' };
  grid.innerHTML = headers.map(({ name, kind }) => {
    const style = kind === 'present' ? 'pill-present' : kind === 'absent' ? 'pill-missing' : 'pill-unknown';
    return `<span class="header-pill ${style}">
      ${name}: ${labels[kind]}
    </span>`;
  }).join('');
}

function renderBreaches(breaches) {
  resetBreaches();
  hide('breach-loading');
  const kind = PrivacyMonitorPopupState.breaches(breaches);
  if (kind === 'unavailable') {
    showBlock('breach-error');
    return;
  }

  if (kind === 'empty') {
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
        ${escHtml(b.BreachDate)} · ${b.PwnCount == null ? 'Account count unavailable' : b.PwnCount.toLocaleString() + ' accounts'}
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

  if (formData.kind !== 'observed') {
    body.innerHTML = `<div class="loading-row">${formData.kind === 'not-observed'
      ? 'Form scan not observed. No conclusion can be drawn.'
      : 'Form observations unavailable. No conclusion can be drawn.'}</div>`;
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
        No HTTP forms observed in this scan.
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
    if (!res.ok) return null; // A failed request is not a successful empty result.
    return await res.json();
  } catch (e) {
    return null; // null = network failure
  }
}

async function loadAllData() {
  const version = ++loadVersion;
  resetView();
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (version !== loadVersion) return;
    const page = PrivacyMonitorPopupState.page(tab);
    if (page.kind !== 'supported') {
      renderOverall(page.kind);
      return;
    }
    const { hostname } = page;
    document.getElementById('current-domain').textContent = hostname;

    // Fetch stored data
    const stored = await api.storage.local.get([
      `security_data_${hostname}`,
      `headers_${hostname}`,
      `forms_${hostname}`,
    ]);
    if (version !== loadVersion) return;
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid observations');

    const data = {
      basicData: stored[`security_data_${hostname}`],
      headerData: stored[`headers_${hostname}`],
      formData: stored[`forms_${hostname}`],
    };
    const local = PrivacyMonitorPopupState.local(data);
    const score = PrivacyMonitorScoring.calculateSecurityScore(data);
    renderConnection(local.connection);
    renderPrivacy(local);
    renderHeaders(local.headers);
    renderForms(local.forms);
    const kind = local.kind === 'ready' && score !== null ? 'ready' : 'incomplete';
    renderOverall(kind);
    if (kind === 'ready') updateScoreRing(score);

    // Preserve the existing lookup boundary: no page scan, no external lookup.
    if (local.connection.kind !== 'observed') {
      hide('breach-loading');
      document.getElementById('breach-error').textContent = 'Breach lookup not run: page observations are missing or unavailable.';
      showBlock('breach-error');
      return;
    }

    // Breach check is async — show spinner until done
    const breaches = await fetchBreaches(hostname);
    if (version !== loadVersion) return;
    renderBreaches(breaches);

  } catch (err) {
    if (version === loadVersion) renderOverall('unavailable');
  }
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

async function refreshData() {
  const version = ++loadVersion;
  resetView();
  const btn = document.getElementById('refresh');
  btn.textContent = '⏳ Refreshing…';
  btn.disabled = true;

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (version !== loadVersion) return;
    const page = PrivacyMonitorPopupState.page(tab);
    if (page.kind !== 'supported') {
      renderOverall(page.kind);
      btn.textContent = '🔄 Refresh Analysis';
      return;
    }
    document.getElementById('current-domain').textContent = page.hostname;
    const scriptingAPI = api.scripting || (typeof chrome !== 'undefined' ? chrome.scripting : null);

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
      if (version !== loadVersion) return;
      loadAllData();
      btn.textContent = '🔄 Refresh Analysis';
    }, 600);

  } catch (err) {
    if (version !== loadVersion) return;
    renderOverall('unavailable', 'Analysis unavailable. Firefox could not scan this page. Access may be restricted; try an ordinary HTTP or HTTPS page.');
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
