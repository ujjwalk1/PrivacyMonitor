import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const fixture = JSON.parse(read('tests/fixtures/site-domains.json'));
const plain = value => JSON.parse(JSON.stringify(value));
function load(withParser = true) {
  const context = vm.createContext({ URL,
    fetch() { assert.fail('Domain matching must remain offline'); },
    get browser() { assert.fail('No browser or storage access'); },
    get localStorage() { assert.fail('No retained browsing data'); },
  });
  if (withParser) vm.runInContext(read('vendor/tldts/index.umd.min.js').toString(), context);
  vm.runInContext(read('lib/site-domains.js').toString(), context);
  return { api: context.PrivacyMonitorSites, context };
}

test('real PSL fixtures cover multi-part, wildcard, exception, private, local, IP and IDN names', () => {
  const { api } = load();
  for (const [input, expected] of fixture.hosts) {
    const actual = api.fromHostname(input);
    for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, input + ': ' + key);
  }
});

test('domain comparison respects label and private tenant boundaries without inferring company ownership', () => {
  const { api } = load();
  for (const [left, right, relation, sameSite] of fixture.matches) {
    assert.deepEqual(plain(api.compareHosts(left, right)), { relation, sameSite }, left + ' / ' + right);
    assert.deepEqual(plain(api.compareHosts(right, left)), { relation, sameSite }, 'symmetric comparison');
  }
});

test('HTTP URL matching is explicitly schemeless and port-independent; outputs exclude URL secrets', () => {
  const { api } = load();
  assert.deepEqual(plain(api.compareURLs('https://a.example.co.uk:8443/a?secret=one#two',
    'http://b.example.co.uk:8080/other')), { relation: 'same-site', sameSite: true });
  assert.deepEqual(plain(api.compareURLs('https://bücher.de/', 'http://xn--bcher-kva.de.:80/')),
    { relation: 'same-host', sameSite: true });
  const result = api.fromURL('https://a.example.co.uk/private/path?secret=one#two');
  assert.equal(result.domain, 'example.co.uk');
  assert.doesNotMatch(JSON.stringify(result), /private|path|secret|one|two|https/);
});

test('malformed hostname input cannot be reinterpreted as a URL, credential, path or port', () => {
  const { api } = load();
  for (const input of [null, undefined, 42, {}, '', ' a.com', 'a.com ', 'a..com', 'a.com..',
    '-a.com', 'a-.com', '_a.com', 'a'.repeat(64)+'.com', 'a.com/evil', 'a.com?x', 'a.com#x',
    'user@a.com', 'a.com:80', 'a.com:', 'https://a.com', 'a%2ecom', '::1',
    '[fe80::1%25eth0]', 'a\\b.com', 'a\nb.com', 'x'.repeat(2049)]) {
    assert.equal(api.fromHostname(input).kind, 'invalid', String(input));
    assert.equal(api.compareHosts(input, 'example.com').sameSite, null);
  }
});

test('unsupported, relative, credential-bearing and malformed URLs stay unknown', () => {
  const { api } = load();
  for (const input of [null, 0, '', '/path', 'example.com', '//example.com', 'https:example.com',
    'ftp://example.com/', 'file:///tmp/a', 'data:text/plain,abc', 'about:blank',
    'https://user:secret@example.com/', ' https://example.com/', 'https://a.com/ a',
    'https://a.com/\nx', 'https://a.com/\\x', 'https://a.com/'+'a'.repeat(8192)]) {
    assert.equal(api.fromURL(input).kind, 'invalid', String(input));
    assert.deepEqual(plain(api.compareURLs(input, 'https://example.com/')), { relation: 'unknown', sameSite: null });
  }
});

test('missing or failed PSL provider is unavailable, never a guessed same-site result', () => {
  const { api } = load(false);
  assert.equal(api.fromHostname('www.example.co.uk').kind, 'unavailable');
  assert.deepEqual(plain(api.compareHosts('a.co.uk', 'b.co.uk')), { relation: 'unavailable', sameSite: null });
  const broken = load(); broken.context.tldts.parse = () => { throw new Error('parser failure'); };
  assert.equal(broken.api.fromURL('https://example.com').kind, 'unavailable');
});

test('vendored bundle and embedded sources retain upstream byte integrity and licensing', () => {
  const metadata = JSON.parse(read('vendor/tldts/provenance.json'));
  assert.equal(metadata.version, '7.4.19');
  for (const [name, expected] of Object.entries(metadata.files)) {
    const bytes = read('vendor/tldts/' + name);
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, name);
  }
  const map = JSON.parse(read('vendor/tldts/index.umd.min.js.map'));
  assert.ok(map.sources.length > 0);
  assert.equal(map.sourcesContent.length, map.sources.length);
  assert.ok(map.sourcesContent.every(source => typeof source === 'string' && source.length > 0));
  assert.match(read('vendor/tldts/LICENSE').toString(), /Copyright.*Thomas Parisot.*Rémi Berson/);
});
