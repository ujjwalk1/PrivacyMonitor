import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, fixture, read, plain, settle, deferred } from './helpers/cookie-inspector.mjs';

test('actual D27 metadata renders every required attribute, unknown purpose and scope without secrets', async () => {
  const h = harness(), result = await h.reader.readActive(); h.view.render(result);
  assert.equal(h.doc.nodes.findings.children.length, 3);
  const text = h.doc.nodes.findings.textContent;
  for (const value of ['Domain','example.com','Session cookie','Persistent; expiry unknown','2033-05-18 03:33:20.000 UTC',
    'Secure','HttpOnly','SameSite','Lax','None','Unknown','Unpartitioned','Top-level site: https://example.com','Purpose']) assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /secret|account|cookie-tests|tracking cookie/);
  assert.match(h.doc.nodes.scope.textContent, /firefox-container-2/);
  assert.match(h.doc.nodes.status.textContent, /selected scope/);
  h.reader.dispose();
});
test('valid empty scope differs from unavailable, denied and integration-required with old data removed', async () => {
  const h = harness(), result = await fixture();
  for (const state of [
    { ...result, cookies: [] }, { kind: 'unavailable', reason: 'permission-denied' },
    { kind: 'unavailable', reason: 'integration-required' }, { kind: 'unavailable' }, { kind: 'loading' },
  ]) {
    h.view.render(result); h.view.render(state); assert.equal(h.doc.nodes.findings.children.length, 0);
    if (state.kind === 'observed') assert.match(h.doc.nodes.status.textContent, /Other cookies may exist/);
    else { assert.doesNotMatch(h.doc.nodes.status.textContent, /No matching cookies/); assert.equal(h.doc.nodes['page-host'].textContent, ''); }
  }
  h.reader.dispose();
});
test('invalid or oversized metadata and injected domains/partitions fail without partial cards', async () => {
  const original = await fixture(), h = harness();
  for (const change of [
    r => { r.hostname = '<img src=x onerror=alert(1)>'; },
    r => { r.cookies[0].domain = 'example.com/<script>'; },
    r => { r.cookies[0].secure = 'yes'; },
    r => { r.cookies[0].purpose = 'Advertising'; },
    r => { r.cookies[0].sameSite = '<b>Strict</b>'; },
    r => { r.cookies[0].partition = { kind: 'top-level-site', topLevelSite: 'https://example.com/private?secret' }; },
    r => { r.cookies[0].partition = { kind: 'top-level-site', topLevelSite: 'javascript:alert(1)' }; },
    r => { r.cookies[0].expirationDate = Infinity; },
    r => { r.cookies[0].expirationDate = 10; }, // Session cookie cannot have a claimed expiry.
    r => { r.cookies[0].value = 'never display'; },
    r => { r.cookies = Array.from({ length: 257 }, () => r.cookies[0]); },
    r => { r.coverage = 'all-cookies'; },
  ]) {
    const result = structuredClone(original); change(result); h.view.render(original); h.view.render(result);
    assert.equal(h.doc.nodes.findings.children.length, 0); assert.match(h.doc.nodes.status.textContent, /unavailable/);
  }
  h.reader.dispose();
});
test('duplicate metadata rows stay separate and read replaces rather than appends', async () => {
  const h = harness(), result = await fixture(); result.cookies = [result.cookies[0], result.cookies[0]];
  h.view.render(result); h.view.render(result);
  assert.equal(h.doc.nodes.findings.children.length, 2);
  assert.match(h.doc.nodes.findings.textContent, /Cookie 1/); assert.match(h.doc.nodes.findings.textContent, /Cookie 2/);
  h.reader.dispose();
});
test('starting does not read or prompt; permission button calls real D27 synchronously and never auto-reads', async () => {
  const h = harness(), page = h.start();
  assert.deepEqual(h.calls, []);
  h.doc.nodes.allow.emit('click'); assert.deepEqual(h.calls, ['grant']);
  await settle(); assert.match(h.doc.nodes.status.textContent, /Cookie access allowed/);
  assert.equal(h.calls.includes('cookies'), false);
  h.doc.nodes.read.emit('click'); await settle(); assert.equal(h.doc.nodes.findings.children.length, 3);
  page.dispose();
});
test('permission denial and failed read show no previous cookie data', async () => {
  const h = harness(), page = h.start(); await page.refresh();
  h.controls.grant = false; await page.grant();
  assert.equal(h.doc.nodes.findings.children.length, 0); assert.match(h.doc.nodes.status.textContent, /denied/);
  h.controls.permission = false; await page.refresh(); assert.match(h.doc.nodes.status.textContent, /unavailable/);
  page.dispose();
});
test('revocation, navigation and tab/window lifecycle clear already displayed metadata', async () => {
  for (const act of [
    h => h.events.permission({ permissions: ['cookies'] }), h => h.events.permission({ origins: ['https://*/*'] }),
    h => h.events.navigate({ frameId: 0 }), h => h.events.activated(2), h => h.events.closed(1),
    h => h.events.replaced(2, 1), h => h.events.focus(2),
  ]) {
    const h = harness(), page = h.start(); await page.refresh(); assert.equal(h.doc.nodes.findings.children.length, 3);
    act(h); assert.equal(h.doc.nodes.findings.children.length, 0); assert.equal(h.doc.nodes['page-host'].textContent, '');
    page.dispose();
  }
});
test('late successful read cannot repopulate after invalidation or disposal', async () => {
  for (const end of [(h, p) => h.events.navigate({ frameId: 0 }), (h, p) => p.dispose()]) {
    const h = harness(), wait = deferred(), reader = { ...h.reader, readActive: () => wait.promise };
    const page = h.start(reader), pending = page.refresh(); end(h, page);
    wait.resolve(await fixture()); await pending;
    assert.equal(h.doc.nodes.findings.children.length, 0); page.dispose();
  }
});
test('hidden inspector clears findings and does not read, prompt or automatically refresh on return', async () => {
  const h = harness(), page = h.start(); await page.refresh();
  const before = h.calls.length; h.doc.hidden = true; h.doc.emit('visibilitychange');
  await page.refresh(); await page.grant(); assert.equal(h.calls.length, before);
  assert.equal(h.doc.nodes.findings.children.length, 0);
  h.doc.hidden = false; h.doc.emit('visibilitychange'); assert.equal(h.calls.length, before);
  assert.match(h.doc.nodes.status.textContent, /Ready/); page.dispose();
});
test('busy controls reject duplicate actions; failed lifecycle registration disables both buttons', async () => {
  const h = harness(), wait = deferred(); let count = 0;
  const page = h.start({ ...h.reader, readActive: () => { count++; return wait.promise; } });
  const pending = page.refresh(); await page.refresh(); await page.grant(); assert.equal(count, 1);
  wait.resolve({ kind: 'unavailable' }); await pending; page.dispose();
  const bad = harness(); bad.api.tabs.onActivated.addListener = () => { throw Error(); };
  bad.start(); assert.equal(bad.doc.nodes.allow.disabled, true); assert.equal(bad.doc.nodes.read.disabled, true);
  assert.equal(bad.api.permissions.onRemoved.listeners.size, 0);
});
test('boot uses actual D27 and background store, and pagehide prevents delayed initialization', async () => {
  const h = harness(), handlers = {}, win = { addEventListener: (n, f) => { handlers[n] = f; } };
  await h.context.PrivacyMonitorCookiePage.boot({ api: h.api, doc: h.doc, win });
  assert.equal(h.calls.length, 0); h.doc.nodes.read.emit('click'); await settle();
  assert.equal(h.doc.nodes.findings.children.length, 3); handlers.pagehide();
  assert.equal(h.doc.nodes.findings.children.length, 0); h.reader.dispose();
  const delayed = harness(), bg = deferred();
  delayed.api.runtime.getBackgroundPage = () => bg.promise;
  const promise = delayed.context.PrivacyMonitorCookiePage.boot({ api: delayed.api, doc: delayed.doc, win });
  handlers.pagehide(); bg.resolve({ PrivacyMonitorAnalysisStore: delayed.store }); await promise;
  assert.equal(delayed.doc.nodes.status.textContent, ''); delayed.reader.dispose();
});
test('inspector uses local files, live status, no mutation controls, and remains unshipped', () => {
  const html = read('details/cookies.html');
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /Allow cookie access/); assert.match(html, /Read cookie metadata/);
  assert.doesNotMatch(html, /<input|<form|Delete cookie|Edit cookie/);
  for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.doesNotThrow(() => read('details/' + path));
  assert.doesNotMatch(read('details/cookies-view.js'), /innerHTML|insertAdjacentHTML/);
  assert.doesNotMatch(read('details/cookies-page.js'), /cookies\.(set|remove)/);
  assert.doesNotMatch(read('manifest.json'), /cookies\.html/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).includes('details/cookies.html'));
});
