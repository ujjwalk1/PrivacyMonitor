import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildDataset, serialize } from '../tools/build-tracker-data.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const dataset = JSON.parse(read('data/trackers/domains.json'));
const fixture = JSON.parse(read('tests/fixtures/tracker-classifier.json'));
const plain = value => JSON.parse(JSON.stringify(value));
function load(data = structuredClone(dataset), { sites = true, parser = true } = {}) {
  const context = vm.createContext({ URL,
    fetch() { assert.fail('Classification must stay offline'); },
    get browser() { assert.fail('No browser access'); },
    get localStorage() { assert.fail('No persistent browsing records'); },
  });
  if (parser) vm.runInContext(read('vendor/tldts/index.umd.min.js').toString(), context);
  if (sites) vm.runInContext(read('lib/site-domains.js').toString(), context);
  vm.runInContext(read('lib/tracker-classifier.js').toString(), context);
  return { context, api: context.PrivacyMonitorTrackers.create(data) };
}

test('pinned known fixtures return explicit source evidence without invented owner/category', () => {
  const { api } = load();
  for (const [host, rule, match] of fixture.listed) {
    const result = api.classifyHostname(host);
    assert.equal(result.kind, 'listed', host);
    assert.equal(result.evidence.rule, rule);
    assert.equal(result.evidence.match, match);
    assert.equal(result.evidence.revision, dataset.revision);
    assert.equal(result.evidence.sourceSha256, dataset.sourceSha256);
    assert.equal(result.evidence.retrievedOn, dataset.retrievedOn);
    assert.equal(result.owner, null); assert.equal(result.category, null);
  }
});

test('unknown, lookalike, parent, sibling, IDN and omitted conditional/wildcard hosts are not safe verdicts', () => {
  const { api } = load();
  for (const host of fixture.unknown) {
    const result = api.classifyHostname(host);
    assert.equal(result.kind, 'unknown', host);
    assert.equal(result.reason, 'not-listed', host);
    assert.equal('evidence' in result, false);
  }
  for (const host of fixture.unsupported) {
    assert.equal(api.classifyHostname(host).reason, 'unsupported-host', host);
  }
});

test('whole-label matching preserves private tenants and prefers the most specific included rule', () => {
  const data = structuredClone(dataset);
  data.domains = [{ domain: 'alice.github.io', sourceLine: 1 },
    { domain: 'example.co.uk', sourceLine: 2 }, { domain: 'sub.example.co.uk', sourceLine: 3 }];
  const { api } = load(data);
  assert.equal(api.classifyHostname('cdn.alice.github.io').kind, 'listed');
  assert.equal(api.classifyHostname('bob.github.io').kind, 'unknown');
  assert.equal(api.classifyHostname('github.io').kind, 'unknown');
  assert.equal(api.classifyHostname('a.sub.example.co.uk').evidence.rule, '||sub.example.co.uk^');
  assert.equal(api.classifyHostname('example.co.uk.evil.com').kind, 'unknown');
});

test('URL classification retains hostname/evidence only and rejects malformed/unsupported inputs', () => {
  const { api } = load();
  const result = api.classifyURL('https://www.clarity.ms:8443/private-path?secret=value#fragment');
  assert.equal(result.kind, 'listed');
  assert.equal(result.hostname, 'www.clarity.ms');
  assert.doesNotMatch(JSON.stringify(result), /private-path|secret|value|fragment|8443/);
  for (const url of ['//clarity.ms', 'https:clarity.ms', 'file:///clarity.ms', 'about:blank',
    'https://user:password@clarity.ms/', ' https://clarity.ms', 'https://clarity.ms/ a']) {
    assert.equal(api.classifyURL(url).kind, 'invalid', url);
  }
  for (const host of [null, {}, 4, '', 'clarity.ms:80', 'x@clarity.ms', 'clarity.ms/path', 'a..com',
    '-a.com', 'clarity.ms?token=x', 'x'.repeat(2049)]) {
    assert.equal(api.classifyHostname(host).kind, 'invalid');
  }
});

test('missing or failed domain dependency is unavailable, not an empty or clean result', () => {
  for (const options of [{ sites: false }, { parser: false }]) {
    assert.deepEqual(plain(load(dataset, options).api.classifyHostname('clarity.ms')),
      { kind: 'unavailable', reason: 'domain-helper-unavailable' });
  }
  const { api, context } = load();
  context.tldts.parse = () => { throw Error('broken dependency'); };
  assert.equal(api.classifyHostname('clarity.ms').kind, 'unavailable');
});

test('invalid or oversized dataset fails closed, including unsafe domains and metadata', () => {
  const bad = [undefined, null, {}, { ...dataset, schemaVersion: 2 }, { ...dataset, domains: [] },
    { ...dataset, domains: Array(5001).fill(dataset.domains[0]) },
    { ...dataset, revision: [dataset.revision] }, { ...dataset, sourceSha256: 'bad' },
    { ...dataset, license: 'unknown' }, { ...dataset, retrievedOn: '2026-02-30' },
    { ...dataset, domains: [dataset.domains[0], dataset.domains[0]] },
    { ...dataset, extra: 'unexpected' }];
  for (const domain of ['com', 'co.uk', 'github.io', '*.example.com', 'EXAMPLE.COM',
    '127.0.0.1', 'localhost', 'example.com/path', 'x.unknownsuffixzz']) {
    bad.push({ ...dataset, domains: [{ domain, sourceLine: 1 }] });
  }
  for (const sourceLine of [0, -1, 1.5, 100001, '1']) {
    bad.push({ ...dataset, domains: [{ domain: 'example.com', sourceLine }] });
  }
  for (const data of bad) assert.deepEqual(plain(load(data === undefined ? {} : data).api.classifyHostname('clarity.ms')),
    { kind: 'unavailable', reason: 'invalid-dataset' });
});

test('caller mutation cannot alter captured rules/metadata or subsequent results', () => {
  const data = structuredClone(dataset);
  const { api } = load(data);
  const original = plain(api.classifyHostname('clarity.ms'));
  data.domains.length = 0; data.revision = '0'.repeat(40);
  const changed = api.classifyHostname('clarity.ms');
  changed.evidence.rule = 'tampered'; changed.evidence.revision = 'tampered';
  assert.deepEqual(plain(api.classifyHostname('clarity.ms')), original);
});

test('bundled extraction is reproducible and every included domain maps to its exact upstream line', () => {
  const bytes = read('data/trackers/upstream.txt');
  const provenance = JSON.parse(read('data/trackers/provenance.json'));
  const { dataset: rebuilt, report } = buildDataset(bytes, provenance);
  assert.equal(serialize(rebuilt), read('data/trackers/domains.json').toString());
  assert.equal(serialize(report), read('data/trackers/extraction-report.json').toString());
  assert.equal(dataset.domains.length, 542);
  assert.equal(report.excluded.length, 5);
  const lines = bytes.toString().split(/\r?\n/), { api } = load();
  for (const entry of dataset.domains) {
    assert.equal(lines[entry.sourceLine - 1], '||' + entry.domain + '^');
    assert.equal(api.classifyHostname(entry.domain).kind, 'listed', entry.domain);
  }
  assert.throws(() => buildDataset(Buffer.from('changed'), provenance), /hash mismatch/);
});

test('extractor excludes conditional, wildcard, exception, path and bare-suffix rules without broadening them', () => {
  const bytes = Buffer.from('! fixture\n||example.com^\n||example.net^$third-party\n@@||example.org^\n' +
    '||*.example.io^\n||example.co.uk/path\n||co.uk^\n||127.0.0.1^\n');
  const provenance = { revision: 'a'.repeat(40), retrievedOn: '2026-11-04', bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') };
  const { dataset: actual, report } = buildDataset(bytes, provenance);
  assert.deepEqual(actual.domains, [{ domain: 'example.com', sourceLine: 2 }]);
  assert.equal(report.comments, 1); assert.equal(report.excluded.length, 6);
});

test('dataset and adapter remain outside the beta manifest and shipping package', () => {
  const files = JSON.parse(read('tools/extension-files.json'));
  assert.ok(files.every(file => !file.startsWith('lib/') && !file.startsWith('data/') && !file.startsWith('vendor/')));
  const manifest = read('manifest.json').toString();
  assert.doesNotMatch(manifest, /tracker-classifier|domains.json|site-domains|tldts/);
});
