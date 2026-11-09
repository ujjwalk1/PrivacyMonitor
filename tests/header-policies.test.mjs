import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const fixtures = JSON.parse(read('tests/fixtures/header-policies.json'));
const plain = value => JSON.parse(JSON.stringify(value));
const source = read('lib/header-policies.js');
function load() {
  const forbidden = () => assert.fail('Policy evaluation must have no external side effects');
  const context = vm.createContext({ URL, fetch: forbidden, console: { log: forbidden, error: forbidden },
    get browser() { return forbidden(); }, get chrome() { return forbidden(); },
    get localStorage() { return forbidden(); } });
  vm.runInContext(source, context);
  return context.PrivacyMonitorHeaderPolicies;
}
const api = load();
const response = (responseHeaders = [], more = {}) => ({ kind: 'observed', type: 'main_frame',
  statusCode: 200, url: 'https://fixture.example/', responseHeaders, ...more });
const header = (name, value) => ({ name, value });
const keys = { 'Strict-Transport-Security': 'hsts', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'referrerPolicy' };

for (const fixture of fixtures.cases) test('header fixture: ' + fixture.name, () => {
  const input = response(fixture.values.map(value => header(fixture.header, value)),
    fixture.url ? { url: fixture.url } : {});
  const result = api.evaluate(input);
  assert.equal(result.kind, 'observed');
  const actual = result.data[keys[fixture.header]];
  for (const [key, value] of Object.entries(fixture.expected)) {
    assert.deepEqual(plain(actual[key]), value, key);
  }
});

test('not observed and unavailable never become an observed absence', () => {
  for (const [input, expected] of [[null, 'unavailable'], [{}, 'unavailable'],
    [{ kind: 'not-observed', get responseHeaders() { assert.fail('No capture to read'); } }, 'not-observed'],
    [{ kind: 'unavailable', responseHeaders: [] }, 'unavailable'],
    [response(undefined, { responseHeaders: null }), 'unavailable']]) {
    const result = api.evaluate(input);
    assert.equal(result.kind, expected);
    assert.equal(result.data, null);
  }
  const absent = api.evaluate(response()).data;
  assert.deepEqual(Object.values(absent).map(value => value.state), ['absent', 'absent', 'absent']);
});

test('only complete final main-frame HTTP(S) responses are eligible', () => {
  for (const statusCode of [0, 103, 199, 300, 301, 302, 304, 399, 600, 200.5, '200', null]) {
    assert.equal(api.evaluate(response([], { statusCode })).kind, 'unavailable', String(statusCode));
  }
  for (const statusCode of [200, 204, 299, 400, 404, 500, 599]) {
    assert.equal(api.evaluate(response([], { statusCode })).kind, 'observed');
  }
  for (const type of ['sub_frame', 'script', null, undefined]) {
    assert.equal(api.evaluate(response([], { type })).kind, 'unavailable');
  }
  for (const url of ['about:blank', 'file:///local', '/relative', 'https:fixture.example',
    'https://', ' https://fixture.example/', 'https://fixture.example/\n', 'https://fixture.example/\\path',
    'https://fixture.example/' + 'a'.repeat(api.LIMITS.url)]) {
    assert.equal(api.evaluate(response([], { url })).kind, 'unavailable', url);
  }
});

test('case-insensitive names, simultaneous independent findings and no stale results', () => {
  const input = response([
    header('STRICT-TRANSPORT-SECURITY', 'max-age=0'),
    header('x-content-type-options', 'nosniff'),
    header('rEfErReR-pOlIcY', 'unsafe-url'),
  ]);
  const result = api.evaluate(input);
  assert.deepEqual(Object.values(result.data).map(value => value.state), ['disabled', 'configured', 'permissive']);
  result.data.nosniff.state = 'mutated';
  assert.equal(api.evaluate(input).data.nosniff.state, 'configured');
  assert.equal(api.evaluate(response()).data.nosniff.state, 'absent');
  assert.equal(input.responseHeaders[1].value, 'nosniff');
});

test('binary/missing, over-limit and non-ASCII values stay unavailable per affected header', () => {
  for (const entry of [{ name: 'Strict-Transport-Security', binaryValue: [1, 2] },
    header('Strict-Transport-Security', null), header('Strict-Transport-Security', 'a'.repeat(api.LIMITS.value + 1)),
    header('Strict-Transport-Security', 'max-age=60\r\nsecret'),
    header('Strict-Transport-Security', 'max-age=60;extension="\u00e9"')]) {
    const result = api.evaluate(response([entry, header('X-Content-Type-Options', 'nosniff')]));
    assert.equal(result.kind, 'observed');
    assert.equal(result.data.hsts.state, 'unavailable');
    assert.equal(result.data.nosniff.state, 'configured');
    assert.equal(result.data.referrerPolicy.state, 'absent');
  }
  // A missing later field might change interpretation; do not silently discard it.
  assert.equal(api.evaluate(response([header('Referrer-Policy', 'no-referrer'),
    { name: 'Referrer-Policy' }])).data.referrerPolicy.state, 'unavailable');
});

test('header bounds do not inspect an oversized list or hide an unseen policy tail', () => {
  const oversized = new Array(api.LIMITS.headers + 1);
  Object.defineProperty(oversized, 0, { get() { assert.fail('Oversized list must not be scanned'); } });
  assert.equal(api.evaluate(response(oversized)).reason, 'header-limit');
  const exact = Array.from({ length: api.LIMITS.headers }, () => header('Other', 'unused'));
  assert.equal(api.evaluate(response(exact)).kind, 'observed');
  const block = ' '.repeat(api.LIMITS.value - 'nosniff'.length) + 'nosniff';
  assert.equal(api.evaluate(response([header('X-Content-Type-Options', block)])).data.nosniff.state, 'configured');
  const atLimit = Array.from({ length: 4 }, () => header('Referrer-Policy', block));
  assert.equal(api.evaluate(response(atLimit)).kind, 'observed');
  assert.equal(api.evaluate(response([...atLimit, header('Referrer-Policy', 'no-referrer')])).reason,
    'total-value-limit');
});

test('malformed/inaccessible entries cannot produce a successful empty observation', () => {
  for (const entry of [null, {}, { name: 7 }, { name: '' }, { name: 'Bad Name' },
    { name: 'x'.repeat(api.LIMITS.name + 1) },
    { get name() { throw new Error('private error text'); } },
    { name: 'Strict-Transport-Security', get value() { throw new Error('private error text'); } }]) {
    const result = api.evaluate(response([entry]));
    assert.equal(result.kind, 'unavailable');
    assert.equal(result.data, null);
    assert.doesNotMatch(JSON.stringify(result), /private error/);
  }
});

test('raw URLs and unrelated/unknown directive values are never returned, read or retained', () => {
  const secret = 'sensitive-value-ABC';
  const noRead = name => ({ name, get value() { assert.fail('Unrelated value must not be read'); },
    get binaryValue() { assert.fail('Binary data must not be read'); } });
  const input = response([noRead('Set-Cookie'), noRead('Authorization'), noRead('Content-Security-Policy'),
    noRead('__proto__'), header('Strict-Transport-Security', 'max-age=60;extension="' + secret + '"'),
    header('X-Content-Type-Options', 'nosniff'),
    header('Referrer-Policy', secret + ',no-referrer')], {
    url: 'https://user:' + secret + '@fixture.example/private?token=' + secret + '#fragment',
  });
  const result = plain(api.evaluate(input));
  assert.equal(result.kind, 'observed');
  assert.deepEqual(result.data, {
    hsts: { state: 'configured', reason: 'positive-max-age', maxAgeSeconds: 60, includeSubDomains: false },
    nosniff: { state: 'configured', reason: 'nosniff-token' },
    referrerPolicy: { state: 'configured', reason: 'bounded-referrer-exposure', policy: 'no-referrer',
      sameOrigin: 'none', crossOrigin: 'none', downgrade: 'none' },
  });
  assert.doesNotMatch(JSON.stringify(result), /sensitive|fixture|private|fragment|Set-Cookie|extension/);
  assert.deepEqual(plain(api.evaluate(response())).data.hsts, { state: 'absent', reason: 'header-absent' });
});

test('the evaluator is deliberately outside the shipping manifest and allowlist', () => {
  assert.doesNotMatch(read('manifest.json'), /header-policies/);
  assert.ok(!JSON.parse(read('tools/extension-files.json')).includes('lib/header-policies.js'));
});
