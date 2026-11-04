import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const data = JSON.parse(read('data/trackers/domains.json'));
const fixtures = JSON.parse(read('tests/fixtures/request-analysis.json'));
const plain = value => JSON.parse(JSON.stringify(value));
const doc = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const record = (extra = {}) => ({ schemaVersion: 1, tabId: 1, navigationId: 'test-session:1',
  documentId: doc(1), context: { incognito: false, cookieStoreId: 'firefox-default' },
  page: { hostname: 'example.com', protocol: 'https:' }, ...extra });
const row = (hostname = 'clarity.ms', type = 'script', events = 1) => ({ hostname, type, events });
const snapshot = (observations = [row()], extra = {}) => ({
  kind: observations.length ? 'observed' : 'not-observed', documentId: doc(1),
  coverage: 'top-frame-after-commit', truncated: false, counterSaturated: false, observations, ...extra,
});

function setup({ sites = true, trackers = true, parser = true } = {}) {
  const context = vm.createContext({ URL,
    crypto: { randomUUID: () => 'test-session' },
    fetch() { assert.fail('Classification must remain offline'); },
    get browser() { assert.fail('No automatic browser access'); },
    get localStorage() { assert.fail('No persistence'); },
    console: { log() { assert.fail('No browsing logs'); }, error() { assert.fail('No browsing logs'); } },
  });
  for (const name of [
    ...(parser ? ['vendor/tldts/index.umd.min.js'] : []),
    ...(sites ? ['lib/site-domains.js'] : []),
    ...(trackers ? ['lib/tracker-classifier.js'] : []),
    'lib/request-capture.js', 'analysis-records.js', 'lib/request-analysis.js',
  ]) vm.runInContext(read(name), context);
  return { context, module: context.PrivacyMonitorRequestAnalysis,
    create(value = snapshot(), dataset = data) {
      const calls = [];
      const analyzer = context.PrivacyMonitorRequestAnalysis.create({
        collector: { get(...args) { calls.push(args); return value; } }, dataset,
      });
      return { analyzer, calls };
    },
  };
}

test('D24 real PSL and list fixtures distinguish site relationship from tracker membership', () => {
  const v = setup();
  for (const expected of fixtures.cases) {
    const { analyzer } = v.create(snapshot([row(expected.host)]));
    const output = analyzer.analyze(record({ page: { hostname: expected.page, protocol: 'https:' } }));
    assert.equal(output.kind, 'observed', JSON.stringify(expected));
    const finding = output.findings[0];
    assert.equal(finding.party, expected.party, JSON.stringify(expected));
    assert.equal(finding.classification, expected.classification, JSON.stringify(expected));
    assert.equal(finding.owner, null); assert.equal(finding.category, null);
    if (expected.classification === 'known-tracker') {
      assert.equal(finding.tracker.kind, 'listed');
      assert.equal(finding.tracker.evidence.rule, '||clarity.ms^');
      assert.equal(finding.tracker.evidence.revision, data.revision);
      assert.equal(finding.tracker.evidence.retrievedOn, data.retrievedOn);
      assert.equal(finding.tracker.evidence.sourceSha256, data.sourceSha256);
      assert.ok(finding.tracker.evidence.sourceLine > 0);
    }
  }
});

test('canonical host/type deduplication is deterministic and never sums duplicate cumulative rows', () => {
  const v = setup();
  const input = snapshot([row('WWW.CLARITY.MS.', 'script', 2), row('www.clarity.ms', 'script', 3),
    row('www.clarity.ms', 'image', 4), row('www.clarity.ms', 'image', 4),
    row('bücher.de', 'font', 2), row('xn--bcher-kva.de', 'font', 2)]);
  const { analyzer } = v.create(input);
  const output = plain(analyzer.analyze(record()));
  assert.equal(output.findings.length, 2);
  assert.deepEqual(output.findings[0].types, [{ type: 'image', events: 4 }, { type: 'script', events: 3 }]);
  assert.deepEqual(output.findings[1].types, [{ type: 'font', events: 2 }]);
  assert.deepEqual(plain(analyzer.analyze(record())), output); // No stateful accumulation.
  const { analyzer: reversed } = v.create(snapshot([...input.observations].reverse()));
  assert.deepEqual(plain(reversed.analyze(record())), output);
});

test('read is scoped by tab and document and rejects a mismatching collector snapshot', () => {
  const v = setup(), { analyzer, calls } = v.create();
  const output = analyzer.analyze(record());
  assert.deepEqual(calls, [[1, doc(1)]]);
  assert.equal(output.navigationId, 'test-session:1');
  assert.equal(output.documentId, doc(1));
  assert.equal(v.create(snapshot([row()], { documentId: doc(2) })).analyzer.analyze(record()).reason, 'stale-document');
});

test('unknown owner/category remain explicit and dataset failure never becomes unclassified third-party', () => {
  const v = setup();
  for (const dataset of [null, {}, { ...data, domains: [] }, { ...data, revision: 'bad' }]) {
    const { analyzer } = v.create(snapshot([row(), row('cdn.example.com')]), dataset);
    const findings = analyzer.analyze(record()).findings;
    assert.ok(findings.every(f => f.classification === 'unavailable' && f.tracker.kind === 'unavailable'));
    assert.ok(findings.every(f => f.owner === null && f.category === null));
    assert.equal(findings.find(f => f.hostname === 'cdn.example.com').party, 'first-party');
    assert.equal(findings.find(f => f.hostname === 'clarity.ms').party, 'third-party');
  }
});

test('private/unknown context and missing document identity never read capture', () => {
  const v = setup();
  for (const context of [undefined, null, {}, { incognito: true }, { incognito: null }, { incognito: 'false' }]) {
    const { analyzer, calls } = v.create();
    const input = record({ context });
    Object.defineProperty(input, 'page', { get() { assert.fail('Do not inspect private page'); } });
    assert.equal(analyzer.analyze(input).reason, 'private-or-unknown-context');
    assert.equal(calls.length, 0);
  }
  for (const documentId of [null, undefined, 'legacy-token', 'x'.repeat(500)]) {
    const { analyzer, calls } = v.create();
    assert.equal(analyzer.analyze(record({ documentId })).reason, 'document-identity-unavailable');
    assert.equal(calls.length, 0);
  }
});

test('invalid analysis records, unsupported pages and malformed hostnames do not reach capture', () => {
  const v = setup();
  for (const input of [null, {}, record({ schemaVersion: 2 }), record({ tabId: -1 }),
    record({ navigationId: '' }), record({ navigationId: 'x'.repeat(129) }),
    record({ page: { hostname: 'example.com', protocol: 'file:' } }),
    record({ page: { hostname: 'https://user:secret@example.com/path', protocol: 'https:' } })]) {
    const { analyzer, calls } = v.create();
    assert.ok(['invalid', 'unavailable'].includes(analyzer.analyze(input).kind));
    assert.equal(calls.length, 0);
  }
});

test('not-observed, capture failure and malformed snapshots never become empty successful findings', () => {
  const v = setup();
  for (const input of [{ kind: 'not-observed' }, snapshot([])]) {
    assert.deepEqual(plain(v.create(input).analyzer.analyze(record())), { kind: 'not-observed' });
  }
  for (const input of [null, { kind: 'unavailable', reason: 'private-secret' }, { kind: 'invalid' },
    snapshot([], { kind: 'observed' }), snapshot([row()], { kind: 'not-observed' }),
    snapshot([row()], { coverage: 'all-requests' }), snapshot([row()], { truncated: 'false' }),
    snapshot([row()], { counterSaturated: undefined }), snapshot([row()], { documentId: 'bad' }),
    { ...snapshot(), extra: 'secret' }]) {
    const output = v.create(input).analyzer.analyze(record());
    assert.equal(output.kind, 'unavailable');
    assert.equal('findings' in output, false);
    assert.doesNotMatch(JSON.stringify(output), /private-secret/);
  }
});

test('malformed/oversized observation data fails as a whole rather than dropping suspicious rows', () => {
  const v = setup();
  for (const bad of [null, row('https://example.com/path'), row('x@host.com'), row('a..com'),
    row('example.com', 'script', 0), row('example.com', 'script', 65536),
    row('example.com', 'script', 1.5), row('example.com', 'script', '1'),
    row('example.com', 'x'.repeat(33)), row('example.com', '<script>'),
    { ...row(), url: 'https://example.com/secret' }]) {
    const output = v.create(snapshot([row(), bad])).analyzer.analyze(record());
    assert.equal(output.kind, 'unavailable');
    assert.equal('findings' in output, false);
  }
  assert.equal(v.create(snapshot(Array(257).fill(row()))).analyzer.analyze(record()).reason, 'invalid-capture');
  assert.equal(v.module.LIMITS.observations, v.context.PrivacyMonitorRequests.LIMITS.pairsPerNavigation);
  assert.equal(v.module.LIMITS.eventsPerPair, v.context.PrivacyMonitorRequests.LIMITS.eventsPerPair);
});

test('capture limits propagate unchanged and maximum-size input stays bounded', () => {
  const v = setup();
  const input = snapshot(Array.from({ length: 256 }, (_, i) => row('h' + i + '.example.com', 'script', 65535)),
    { truncated: true, counterSaturated: true });
  const result = v.create(input).analyzer.analyze(record());
  assert.equal(result.findings.length, 256);
  assert.equal(result.truncated, true); assert.equal(result.counterSaturated, true);
  assert.equal(result.coverage, 'top-frame-after-commit');
  assert.ok(result.findings.every(f => f.types[0].events === 65535));
});

test('missing/failing helpers and collector failures preserve unavailable outcomes', () => {
  for (const options of [{ sites: false }, { parser: false }]) {
    assert.equal(setup(options).create().analyzer.analyze(record()).reason, 'domain-helper-unavailable');
  }
  const noList = setup({ trackers: false }).create().analyzer.analyze(record());
  assert.equal(noList.findings[0].classification, 'unavailable');
  const v = setup();
  for (const collector of [undefined, {}, { get() { throw Error('private-secret'); } }]) {
    assert.equal(v.module.create({ collector, dataset: data }).analyze(record()).reason, 'capture-unavailable');
  }
  const { analyzer } = v.create();
  v.context.tldts.parse = () => { throw Error('failed provider'); };
  assert.equal(analyzer.analyze(record()).reason, 'domain-helper-unavailable');
});

test('returned projections cannot mutate source records, snapshots, dataset or subsequent evidence', () => {
  const v = setup(), input = snapshot(), current = record(), dataset = structuredClone(data);
  const before = JSON.stringify({ input, current, dataset });
  const { analyzer } = v.create(input, dataset);
  const original = plain(analyzer.analyze(current));
  const modified = analyzer.analyze(current);
  modified.findings[0].tracker.evidence.rule = 'tampered';
  modified.findings[0].types[0].events = 9000;
  modified.findings.length = 0;
  assert.equal(JSON.stringify({ input, current, dataset }), before);
  assert.deepEqual(plain(analyzer.analyze(current)), original);
  Object.defineProperty(current, 'unrelatedSecret', { get() { assert.fail('Do not copy arbitrary record fields'); } });
  assert.deepEqual(plain(analyzer.analyze(current)), original);
});

function integration() {
  const v = setup(), events = {};
  const event = name => {
    const listeners = new Set(); events[name] = (...args) => [...listeners].forEach(fn => fn(...args));
    return { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) };
  };
  const api = {
    webNavigation: Object.fromEntries(['onBeforeNavigate', 'onCommitted', 'onErrorOccurred'].map(n => [n, event(n)])),
    webRequest: { onBeforeRequest: event('request') },
    tabs: { onRemoved: event('removed'), onReplaced: event('replaced') },
  };
  const collector = v.context.PrivacyMonitorRequests.attach(api);
  const store = v.context.PrivacyMonitorAnalysis.createStore({ now: () => 100 });
  const analyzer = v.module.create({ collector, dataset: data });
  function navigate(tabId, number, timestamp, hostname = 'example.com') {
    events.onBeforeNavigate({ tabId, frameId: 0, timeStamp: timestamp });
    const url = 'https://' + hostname + '/secret?token=private#fragment';
    events.onCommitted({ tabId, frameId: 0, timeStamp: timestamp + 2, url, documentId: doc(number) });
    return store.begin({ id: tabId, url, incognito: false, cookieStoreId: 'firefox-default' },
      { documentId: doc(number) }).record;
  }
  function observe(tabId, number, timeStamp, hostname, type = 'script') {
    events.request({ tabId, frameId: 0, documentId: doc(number), timeStamp, incognito: false,
      type, url: 'https://' + hostname + '/secret?token=private#fragment' });
  }
  return { ...v, collector, store, analyzer, events, navigate, observe };
}

test('real D07/D21/D22/D23 pipeline classifies only observed hosts and preserves stale/tab isolation', () => {
  const v = integration();
  const first = v.navigate(1, 1, 10), second = v.navigate(2, 2, 10);
  v.observe(1, 1, 13, 'cdn.example.com');
  v.observe(1, 1, 14, 'static.example.net');
  v.observe(1, 1, 15, 'clarity.ms'); v.observe(1, 1, 16, 'clarity.ms');
  v.observe(1, 1, 17, 'clarity.ms', 'image');
  v.observe(2, 2, 18, 'other.example.org');
  const output = v.analyzer.analyze(first);
  assert.deepEqual(plain(output.findings).map(f => f.classification),
    ['first-party', 'known-tracker', 'unclassified-third-party']);
  assert.deepEqual(plain(output.findings[1].types), [{ type: 'image', events: 1 }, { type: 'script', events: 2 }]);
  assert.equal(v.analyzer.analyze(second).findings.length, 1);
  assert.doesNotMatch(JSON.stringify(output), /secret|token|private|fragment|https/);
  const next = v.navigate(1, 3, 20);
  v.observe(1, 1, 30, 'clarity.ms'); // Late old document is ignored by the real collector.
  assert.equal(v.analyzer.analyze(first).kind, 'unavailable');
  assert.equal(v.analyzer.analyze(next).kind, 'not-observed');
  assert.equal(v.analyzer.analyze(second).findings.length, 1);
});

test('real capture stop/private invalidation never reuses an earlier classification', () => {
  const v = integration(), current = v.navigate(1, 1, 10);
  v.observe(1, 1, 13, 'clarity.ms');
  assert.equal(v.analyzer.analyze(current).kind, 'observed');
  v.events.request({ tabId: 1, frameId: 0, documentId: doc(1), timeStamp: 14, type: 'script', incognito: true });
  assert.equal(v.analyzer.analyze(current).kind, 'unavailable');
  v.collector.stop();
  assert.equal(v.analyzer.analyze(current).kind, 'unavailable');
});

test('D24 remains outside the live extension package and changes no popup scoring semantics', () => {
  assert.doesNotMatch(read('manifest.json'), /request-analysis/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).includes('lib/request-analysis.js'));
});
