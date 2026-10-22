// popup.js — Privacy Monitor v1.1

const api = typeof browser !== 'undefined' ? browser : chrome;
let loadVersion = 0;
let consentRevision = 0;
let consentBusy = false;
let consentBlocked = false;
let consentKind = 'checking';
let breachService;
const breachPermission = { data_collection: ['browsingActivity'] };

// Firefox owns the persistent consent choice. Missing/failed consent APIs fail closed.
async function readBreachConsent() {
  if (!api.permissions?.getAll || !api.permissions?.request || !api.permissions?.remove) {
    return { kind: 'consent-unsupported' };
  }
  try {
    const permissions = await api.permissions.getAll();
    if (!permissions || !Object.hasOwn(permissions, 'data_collection')) return { kind: 'consent-unsupported' };
    if (!Array.isArray(permissions.data_collection)) return { kind: 'consent-error' };
    return { kind: permissions.data_collection.includes('browsingActivity') ? 'enabled' : 'disabled' };
  } catch {
    return { kind: 'consent-error' };
  }
}

function renderBreachConsent(kind, message) {
  consentKind = kind;
  const messages = {
    enabled: 'On. Opening or refreshing uses a fresh cached result or sends the hostname when retry timing allows. Disable here or in Firefox add-on permissions.',
    disabled: 'Off. No breach lookup is sent. Local checks still work.',
    'consent-unsupported': 'Lookup stays off. Update Firefox to a version with built-in data consent to enable it. Local checks still work.',
    'consent-error': 'Could not check consent. Lookup stays off; local checks still work. Reopen the popup to try again.',
    checking: 'Checking consent…',
  };
  setActionUnavailable('breach-enable', consentBusy || consentBlocked || kind !== 'disabled');
  setActionUnavailable('breach-disable', consentBusy || (kind !== 'enabled' && !consentBlocked));
  document.getElementById('breach-consent-status').textContent = message || messages[kind];
}

async function refreshBreachConsent() {
  const revision = consentRevision;
  const consent = await readBreachConsent();
  if (revision === consentRevision && !consentBusy && !consentBlocked) renderBreachConsent(consent.kind);
  return consent;
}

function invalidateBreachConsent() {
  consentRevision++;
  breachService?.clear();
}

async function setBreachLookupEnabled(enabled) {
  if (actionUnavailable(enabled ? 'breach-enable' : 'breach-disable') || consentBusy || (enabled && consentKind !== 'disabled')) return;
  consentBusy = true;
  consentBlocked = true; // Stop transmission immediately, before any permission promise settles.
  invalidateBreachConsent();
  renderBreaches({ kind: 'disabled' });
  renderBreachConsent('checking', enabled ? 'Waiting for your choice in Firefox…' : 'Turning off breach lookup…');
  let changed = false;
  try {
    // Must be invoked directly from the click handler, before the first await.
    changed = await (enabled ? api.permissions.request(breachPermission) : api.permissions.remove(breachPermission));
  } catch { /* Stay blocked and explain the failed operation below. */ }
  consentBusy = false;
  if (!enabled && !changed) {
    renderBreachConsent('consent-error', 'Could not turn off Firefox’s permission. Lookups are blocked in this popup. Turn off Browsing activity in about:addons before reopening, or retry Disable.');
    return;
  }
  consentBlocked = false;
  await refreshBreachConsent();
  if (enabled && changed) await loadAllData();
}

function onBreachPermissionChanged(change, added = false) {
  if (!change.data_collection?.includes('browsingActivity')) return;
  invalidateBreachConsent();
  renderBreaches({ kind: added ? 'not-run' : 'disabled' });
  renderBreachConsent('checking');
  if (!consentBusy) void refreshBreachConsent();
}

api.permissions?.onAdded?.addListener(change => onBreachPermissionChanged(change, true));
api.permissions?.onRemoved?.addListener(onBreachPermissionChanged);

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
  const summary = document.getElementById('score-summary');

  if (score === null) {
    arc.setAttribute('stroke-dashoffset', '100');
    arc.setAttribute('stroke', '#9ca3af');
    text.textContent = '—';
    lbl.textContent = emptyLabel;
    summary.setAttribute('aria-label', `Technical observation score: ${emptyLabel.toLowerCase()}. No score available.`);
    return;
  }

  const { color, label } = getScoreStyle(score);
  // stroke-dashoffset: 100 = empty, 0 = full; offset = 100 - score
  arc.setAttribute('stroke-dashoffset', String(100 - score));
  arc.setAttribute('stroke', color);
  text.textContent = String(score);
  lbl.textContent  = label;
  summary.setAttribute('aria-label', `Technical observation score: ${score} out of 100, ${label}.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function show(id) { document.getElementById(id).style.display = ''; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function showFlex(id) { document.getElementById(id).style.display = 'flex'; }
function showBlock(id) { document.getElementById(id).style.display = 'block'; }

// Keep native buttons focusable across async state changes. ARIA alone does not
// block activation, so both action handlers check this state before doing work.
function setActionUnavailable(id, unavailable) {
  document.getElementById(id).setAttribute('aria-disabled', String(unavailable));
}
function actionUnavailable(id) {
  return document.getElementById(id).getAttribute('aria-disabled') === 'true';
}

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
  document.getElementById('main-content').setAttribute('aria-busy', String(kind === 'loading'));
  setActionUnavailable('refresh', ['loading', 'unsupported'].includes(kind));
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
  document.getElementById('breach-status').textContent = '';
  document.getElementById('breach-section').setAttribute('data-state', 'loading');
  for (const id of ['breach-none', 'breach-list', 'breach-error']) hide(id);
  document.getElementById('breach-list').innerHTML = '';
  document.getElementById('breach-error').textContent = 'Breach lookup unavailable. No conclusion can be drawn.';
  hide('breach-cache-note');
  document.getElementById('breach-cache-note').textContent = '';
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

function renderBreaches(result) {
  resetBreaches();
  hide('breach-loading');
  const { kind } = result;
  document.getElementById('breach-section').setAttribute('data-state', kind);
  if (kind !== 'empty' && kind !== 'results') {
    const status = Number.isInteger(result.status) ? ` (HTTP ${result.status})` : '';
    const messages = {
      'private-disabled': 'Breach lookup is disabled in private browsing. No hostname is sent and no cached result is used.',
      'context-unavailable': 'Breach lookup is off because this tab’s privacy context could not be verified.',
      disabled: 'Breach lookup is off. No further lookups will start while it is off.',
      'not-run': 'Breach lookup has not run since consent changed. Refresh Analysis to check this page.',
      'consent-unsupported': 'Breach lookup is off because this Firefox version does not support data consent.',
      'consent-error': 'Breach lookup is off because consent could not be verified.',
      'rate-limited': `Breach service rate limit (HTTP 429). Wait at least ${Math.max(1, Math.ceil((result.retryAt - Date.now()) / 1000))} seconds from this check, then reopen or refresh. No automatic retry.`,
      cancelled: 'Breach lookup was cancelled. Reopen or refresh to check again.',
      busy: 'Breach lookup is busy with other pages. Reopen or refresh shortly.',
      unavailable: 'Breach lookup unavailable: the background service could not be reached.',
      'http-error': `Breach lookup unavailable: the service returned an error${status}. Try again later.`,
      'network-error': 'Breach lookup unavailable: could not reach the service or finish reading its response. Try again.',
      malformed: 'Breach lookup unavailable: the service returned an unreadable or unexpected response.',
      timeout: 'Breach lookup timed out after 8 seconds. Try again.',
    };
    document.getElementById('breach-error').textContent =
      `${messages[kind] || 'Breach lookup unavailable.'} No conclusion can be drawn.`;
    showBlock('breach-error');
    document.getElementById('breach-status').textContent = document.getElementById('breach-error').textContent;
    return;
  }

  document.getElementById('breach-cache-note').textContent = result.cached
    ? 'Reused a result checked within the last 10 minutes. No new request was sent.'
    : 'Checked with Have I Been Pwned. Results may be reused for 10 minutes.';
  showBlock('breach-cache-note');

  if (kind === 'empty') {
    showFlex('breach-none');
    document.getElementById('breach-status').textContent = `No breach records returned for this domain. ${document.getElementById('breach-cache-note').textContent}`;
    return;
  }

  const list = document.getElementById('breach-list');
  list.style.display = 'flex';
  const { breaches } = result;
  document.getElementById('breach-status').textContent = `${breaches.length} historical breach record${breaches.length === 1 ? '' : 's'} returned. ${breaches.length > 3 ? 'Showing the three most recent. ' : ''}${document.getElementById('breach-cache-note').textContent}`;

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
      `<div class="breach-more">
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
        Password form${formData.insecurePasswordForms > 1 ? 's' : ''} can submit
        over HTTP — credentials could be intercepted.
      </div>`;
  } else if (formData.insecureForms > 0) {
    body.innerHTML = `
      <div class="form-warning">
        ⚠️ ${formData.insecureForms} form${formData.insecureForms > 1 ? 's' : ''} can submit over HTTP
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

async function fetchBreaches(hostname, version = loadVersion, tab) {
  if (tab?.incognito === true) return { kind: 'private-disabled' };
  if (tab?.incognito !== false) return { kind: 'context-unavailable' };
  const revision = consentRevision;
  const consent = await refreshBreachConsent();
  if (revision !== consentRevision || version !== loadVersion) return { kind: 'cancelled' };
  if (consentBlocked || consentBusy) return { kind: 'disabled' };
  if (consent.kind !== 'enabled') return consent;
  try {
    const background = await api.runtime.getBackgroundPage();
    breachService = background?.PrivacyMonitorBreachService;
    if (revision !== consentRevision || version !== loadVersion) return { kind: 'cancelled' };
    if (consentBlocked || consentBusy) return { kind: 'disabled' };
    if (!breachService) return { kind: 'unavailable' };
    return await breachService.lookup(hostname, { incognito: tab.incognito });
  } catch {
    return { kind: 'unavailable' };
  }
}

async function fetchHeaderData(tab, hostname) {
  try {
    const reply = await api.runtime.sendMessage({ channel: 'privacy-monitor.analysis', version: 1, type: 'get', tabId: tab.id });
    if (!reply?.ok || reply.channel !== 'privacy-monitor.analysis' || reply.version !== 1) return false;
    if (reply.kind === 'not-observed') return undefined;
    const record = reply.record;
    if (reply.kind !== 'record' || record?.schemaVersion !== 1 || record.tabId !== tab.id ||
        record.page?.hostname !== hostname || record.page?.protocol !== new URL(tab.url).protocol) return false;
    return PrivacyMonitorPopupState.legacyHeaders(record.observations?.headers);
  } catch { return false; }
}

async function loadAllData() {
  const version = ++loadVersion;
  resetView();
  void refreshBreachConsent(); // The control remains usable even on unsupported/unreadable pages.
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

    // Legacy rows may belong to a normal tab on the same host. Never read them for private/unknown tabs.
    const stored = tab.incognito === false ? await api.storage.local.get([
      `security_data_${hostname}`,
      `forms_${hostname}`,
    ]) : { [`security_data_${hostname}`]: false, [`forms_${hostname}`]: false };
    if (version !== loadVersion) return;
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid observations');

    const headerData = await fetchHeaderData(tab, hostname);
    if (version !== loadVersion) return;
    const data = {
      basicData: stored[`security_data_${hostname}`],
      headerData,
      formData: stored[`forms_${hostname}`],
    };
    const local = PrivacyMonitorPopupState.local(data);
    const score = PrivacyMonitorScoring.calculateSecurityScore(data);
    renderConnection(local.connection);
    renderPrivacy(local);
    renderHeaders(local.headers);
    renderForms(local.forms);
    const kind = local.kind === 'ready' && score !== null ? 'ready' : 'incomplete';
    renderOverall(kind, kind === 'ready'
      ? `Local observations loaded. Technical observation score: ${score} out of 100, ${getScoreStyle(score).label}. This score is not a safety guarantee.`
      : undefined);
    if (kind === 'ready') updateScoreRing(score);
    if (tab.incognito !== false) {
      renderOverall('incomplete', tab.incognito === true
        ? 'Private browsing: saved scan data is not used. Page warnings remain local; some popup observations are unavailable.'
        : 'Privacy context unavailable. Saved scan data and breach lookup are not used.');
      renderBreaches({ kind: tab.incognito === true ? 'private-disabled' : 'context-unavailable' });
      return;
    }

    // Preserve the existing lookup boundary: no page scan, no external lookup.
    if (local.connection.kind !== 'observed') {
      document.getElementById('breach-section').setAttribute('data-state', 'not-run');
      hide('breach-loading');
      document.getElementById('breach-error').textContent = 'Breach lookup not run: page observations are missing or unavailable.';
      document.getElementById('breach-status').textContent = document.getElementById('breach-error').textContent;
      showBlock('breach-error');
      return;
    }

    // Breach check is async — show spinner until done
    const revision = consentRevision;
    const breaches = await fetchBreaches(hostname, version, tab);
    if (version !== loadVersion || revision !== consentRevision) return;
    renderBreaches(breaches);

  } catch (err) {
    if (version === loadVersion) renderOverall('unavailable');
  }
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

async function refreshData() {
  if (actionUnavailable('refresh')) return;
  const version = ++loadVersion;
  resetView();
  const btn = document.getElementById('refresh');
  btn.textContent = 'Refreshing…';
  setActionUnavailable('refresh', true);

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (version !== loadVersion) return;
    const page = PrivacyMonitorPopupState.page(tab);
    if (page.kind !== 'supported') {
      renderOverall(page.kind);
      btn.textContent = 'Refresh Analysis';
      return;
    }
    document.getElementById('current-domain').textContent = page.hostname;
    const reply = await api.tabs.sendMessage(tab.id, {
      channel: 'privacy-monitor.scan', version: 1, type: 'refresh',
    }, { frameId: 0 });
    if (version !== loadVersion) return;
    if (reply?.channel !== 'privacy-monitor.scan' || reply.version !== 1 || reply.ok !== true) {
      throw new Error('Scan unavailable');
    }
    btn.textContent = 'Refresh Analysis';
    await loadAllData();

  } catch (err) {
    if (version !== loadVersion) return;
    renderOverall('unavailable', 'Analysis unavailable. Firefox could not scan this page. Access may be restricted; try an ordinary HTTP or HTTPS page.');
    btn.textContent = 'Refresh Analysis';
    setActionUnavailable('refresh', false);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  document.getElementById('breach-enable').addEventListener('click', () => setBreachLookupEnabled(true));
  document.getElementById('breach-disable').addEventListener('click', () => setBreachLookupEnabled(false));
  document.getElementById('refresh').addEventListener('click', refreshData);
  document.getElementById('open-settings').addEventListener('click', async () => {
    const error = document.getElementById('settings-error');
    error.hidden = true;
    try { await api.runtime.openOptionsPage(); }
    catch {
      error.textContent = 'Could not open settings. Open Privacy Monitor preferences from Firefox’s add-ons page.';
      error.hidden = false;
    }
  });
});
