import assert from 'node:assert/strict';
import test from 'node:test';
import { read, plain, pipeline, envelope, viewHarness, controllerHarness, settle } from './helpers/request-details.mjs';

test('details renders real D24 results with domain, activity, evidence and snapshot date for each finding', () => {
  const { view, doc } = viewHarness(), result = envelope(); view.render(result);
  const cards = doc.nodes.findings.children;
  assert.equal(cards.length, 3);
  assert.equal(doc.nodes.status.textContent, '3 observed domains.');
  assert.match(cards[0].textContent, /cdn.example.com.*First-party/);
  assert.match(cards[1].textContent, /clarity.ms.*Tracker-list match/);
  assert.match(cards[1].textContent, /script: 3 observed events/);
  assert.match(cards[1].textContent, /Matched rule \|\|clarity.ms\^/);
  assert.match(cards[1].textContent, /easyprivacy_trackingservers_general.txt, line/);
  assert.match(cards[2].textContent, /Unclassified third-party/);
  for (const card of cards) {
    assert.match(card.textContent, /Dataset snapshot retrieved: 2026-11-04/);
    assert.match(card.textContent, /Owner Unknown Category Unknown/);
    assert.match(card.textContent, /Snapshot revision/);
  }
  assert.doesNotMatch(doc.nodes.findings.textContent, /private\?|secret=yes/);
});

test('a listed same-site host preserves both list evidence and site relationship', () => {
  const p = pipeline();
  p.store.begin({ id: 1, url: 'https://clarity.ms/', incognito: false }, { documentId: p.capture.documentId });
  const { view, doc } = viewHarness(); view.render(p.source.read(1));
  const text = doc.nodes.findings.children.find(c => c.textContent.startsWith('clarity.ms')).textContent;
  assert.match(text, /Tracker-list match.*Same host or site/);
});

test('unknown and unavailable dataset states never claim a clean tracker result or a dataset date', () => {
  const { view, doc } = viewHarness(), result = envelope();
  view.render(result); assert.match(doc.nodes.findings.children[2].textContent, /Unlisted hosts may still track/);
  for (const f of result.analysis.findings) { f.classification = 'unavailable'; f.tracker = { kind: 'unavailable' }; }
  result.dataset = null; view.render(result);
  assert.ok(doc.nodes.findings.children.every(c => c.textContent.includes('Dataset date: unavailable.')));
  assert.doesNotMatch(doc.nodes.findings.textContent, /2026-11-04|No rule matched/);
});

test('coverage, truncation and saturated counts remain visible without asserting loaded or blocked outcomes', () => {
  const result = envelope(); result.analysis.truncated = true; result.analysis.counterSaturated = true;
  result.analysis.findings[0].types[0].events = 65535;
  const { view, doc } = viewHarness(); view.render(result);
  assert.equal(doc.nodes.coverage.hidden, false); assert.match(doc.nodes.coverage.textContent, /top-frame.*after navigation/);
  assert.equal(doc.nodes.limits.hidden, false); assert.match(doc.nodes.limits.textContent, /Capture limit reached/);
  assert.match(doc.nodes.limits.textContent, /lower bounds/);
  assert.match(doc.nodes.findings.textContent, /At least 65535 observed events/);
  assert.match(read('details/requests.html'), /cannot determine whether a request loaded or was blocked/);
});

test('empty, error, stale and loading views remove prior domains and preserve distinct non-success wording', () => {
  const { view, doc } = viewHarness();
  for (const kind of ['loading', 'not-observed', 'unavailable', 'invalid', 'stale', 'closed']) {
    view.render(envelope()); view.render({ analysis: { kind } });
    assert.equal(doc.nodes.findings.children.length, 0); assert.equal(doc.nodes['page-host'].textContent, '');
    assert.equal(doc.nodes.coverage.hidden, true); assert.equal(doc.nodes.limits.hidden, true);
    assert.equal(doc.nodes.results.getAttribute('aria-busy'), kind === 'loading' ? 'true' : 'false');
  }
  view.render({ analysis: { kind: 'not-observed' } });
  assert.match(doc.nodes.status.textContent, /does not mean no trackers/);
});

test('malformed, injected or inconsistent data fails closed before any finding is drawn', () => {
  const bad = [
    r => { r.analysis.findings[0].hostname = '<img src=x onerror=alert(1)>'; },
    r => { r.analysis.findings[1].tracker.evidence.rule = '<script>bad</script>'; },
    r => { r.analysis.findings[1].tracker.evidence.revision = '0'.repeat(40); },
    r => { r.dataset.retrievedOn = '2026-02-30'; },
    r => { r.analysis.findings[0].classification = 'known-tracker'; },
    r => { r.analysis.findings[0].owner = 'invented'; },
    r => { r.analysis.findings[0].types[0].events = -1; },
    r => { r.analysis.findings[0].types = Array(257).fill({ type: 'image', events: 1 }); },
    r => { r.analysis.findings = Array(257).fill(r.analysis.findings[0]); },
    r => { r.analysis.findings[0].party = '__proto__'; },
    r => { r.analysis.findings = []; },
    r => { r.analysis.coverage = 'all-traffic'; },
  ];
  const { view, doc } = viewHarness();
  for (const mutate of bad) {
    const result = envelope(); mutate(result); view.render(result);
    assert.equal(doc.nodes.findings.children.length, 0);
    assert.match(doc.nodes.status.textContent, /unavailable/);
  }
});

test('read-only source uses actual D07/D24 and does not capture private or missing records', () => {
  const p = pipeline(), initial = p.calls();
  assert.equal(p.source.read(-1).analysis.kind, 'invalid');
  assert.equal(p.source.read(99).analysis.kind, 'not-observed');
  assert.equal(p.calls(), initial);
  p.store.begin({ id: 1, url: 'https://example.com/', incognito: true }, { documentId: p.capture.documentId });
  assert.equal(p.source.read(1).analysis.kind, 'unavailable'); assert.equal(p.calls(), initial);
  assert.equal(p.source.read(1).dataset, null);
  const source = p.context.PrivacyMonitorRequestDetails.createSource();
  assert.equal(source.read(1).analysis.kind, 'unavailable');
});

test('source metadata is copied and corrupt datasets expose unavailable classification', () => {
  const p = pipeline(), first = p.source.read(1); first.dataset.retrievedOn = 'tampered';
  assert.equal(p.source.read(1).dataset.retrievedOn, '2026-11-04');
  const source = p.context.PrivacyMonitorRequestDetails.createSource({ store: p.store, collector: p.collector, dataset: {} });
  const bad = source.read(1); assert.equal(bad.dataset, null);
  assert.ok(bad.analysis.findings.every(f => f.classification === 'unavailable'));
});

test('controller reads only the explicit target tab and rejects missing/ambiguous targets', async () => {
  const ids = [], v = controllerHarness(id => { ids.push(id); return envelope(); });
  await settle(); assert.deepEqual(ids, [1]); assert.equal(v.doc.nodes.findings.children.length, 3);
  v.page.dispose();
  for (const search of ['', '?tab=-1', '?tab=01', '?tab=1&tab=2', '?tab=9007199254740992', '?tab=https://example.com']) {
    const bad = controllerHarness(() => { assert.fail('Invalid target read'); }, search);
    await settle(); assert.equal(bad.doc.nodes.findings.children.length, 0);
    assert.match(bad.doc.nodes.status.textContent, /unavailable/);
  }
});

test('navigation clears results and a delayed earlier read cannot restore the previous document', async () => {
  let finish; const v = controllerHarness(() => new Promise(resolve => { finish = resolve; }));
  await settle(); v.events.navigate({ tabId: 1, frameId: 0 });
  finish(envelope()); await settle();
  assert.equal(v.doc.nodes.findings.children.length, 0); assert.match(v.doc.nodes.status.textContent, /page changed/);
  v.page.dispose();
});

test('tab closure/replacement, permission removal and hidden state clear visible domains', async () => {
  for (const action of [
    v => v.events.removed(1), v => v.events.replaced(2, 1),
    v => v.events.permission({ origins: ['https://*/*'] }),
    v => { v.doc.hidden = true; v.doc.emit('visibilitychange'); },
  ]) {
    const v = controllerHarness(); await settle(); assert.equal(v.doc.nodes.findings.children.length, 3);
    action(v); assert.equal(v.doc.nodes.findings.children.length, 0); v.page.dispose();
  }
  const hidden = controllerHarness(() => envelope(), '?tab=1', true);
  await settle(); assert.equal(hidden.calls(), 0);
  hidden.doc.hidden = false; hidden.doc.emit('visibilitychange'); await settle();
  assert.equal(hidden.calls(), 1); assert.equal(hidden.doc.nodes.findings.children.length, 3);
  hidden.page.dispose();
  const v = controllerHarness(); await settle(); v.events.removed(1);
  await v.page.refresh(); assert.equal(v.calls(), 1);
});

test('refresh replaces rather than appends findings; background failure clears previous output', async () => {
  const v = controllerHarness(); await settle();
  await v.page.refresh(); assert.equal(v.doc.nodes.findings.children.length, 3);
  v.controls.background = async () => { throw Error('unavailable'); };
  await v.page.refresh(); assert.equal(v.doc.nodes.findings.children.length, 0);
  assert.match(v.doc.nodes.status.textContent, /unavailable/); assert.equal(v.doc.nodes.refresh.getAttribute('aria-disabled'), 'false');
  v.page.dispose();
});

test('details HTML uses native controls, live status and local scripts without joining the beta package', () => {
  const html = read('details/requests.html');
  assert.match(html, /<html lang="en">/); assert.match(html, /role="status".*aria-live="polite"/);
  assert.match(html, /<button type="button" id="refresh">Refresh results<\/button>/);
  assert.match(read('details/requests.css'), /summary:focus-visible/);
  assert.doesNotMatch(read('details/requests-view.js'), /\.innerHTML|insertAdjacentHTML|\.focus\(/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).some(p => p.startsWith('details/')));
  assert.doesNotMatch(read('manifest.json'), /request-details|details\/requests/);
});
