// Deterministic offline extraction. Never downloads source or evaluates filter text.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const context = vm.createContext({ URL });
vm.runInContext(read('vendor/tldts/index.umd.min.js').toString(), context);
vm.runInContext(read('lib/site-domains.js').toString(), context);

export function buildDataset(bytes, provenance) {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), provenance.sha256, 'Source hash mismatch');
  assert.equal(bytes.length, provenance.bytes, 'Source size mismatch');
  assert.match(provenance.revision, /^[a-f0-9]{40}$/);
  const domains = [], excluded = [], seen = new Set();
  let comments = 0;
  const lines = bytes.toString('utf8').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    if (line.startsWith('!')) { comments++; continue; }
    const match = /^\|\|([a-z0-9.-]+)\^$/.exec(line);
    let reason = 'unsupported-rule';
    if (match) {
      const descriptor = context.PrivacyMonitorSites.fromHostname(match[1]);
      assert.notEqual(descriptor.kind, 'unavailable', 'PSL provider unavailable');
      if (descriptor.kind === 'domain' && descriptor.hostname === match[1]) {
        assert.ok(!seen.has(match[1]), 'Duplicate source domain requires review');
        seen.add(match[1]); domains.push({ domain: match[1], sourceLine: index + 1 });
        continue;
      }
      reason = 'unsupported-host';
    }
    excluded.push({ sourceLine: index + 1, rule: line, reason });
  }
  assert.ok(domains.length > 0 && domains.length <= 5000, 'Dataset size requires review');
  domains.sort((a, b) => a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0);
  return {
    dataset: { schemaVersion: 1, id: 'easyprivacy-general-domains',
      revision: provenance.revision, retrievedOn: provenance.retrievedOn,
      sourceSha256: provenance.sha256, license: 'GPL-3.0-or-later', domains },
    report: { included: domains.length, comments, excluded },
  };
}

export function serialize(value) { return JSON.stringify(value, null, 2) + '\n'; }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Use --check or no arguments');
  const base = 'data/trackers/';
  const provenance = JSON.parse(read(base + 'provenance.json'));
  const { dataset, report } = buildDataset(read(base + 'upstream.txt'), provenance);
  for (const [name, value] of [['domains.json', dataset], ['extraction-report.json', report]]) {
    if (args[0] === '--check') assert.equal(read(base + name).toString(), serialize(value), name + ' is stale');
    else writeFileSync(new URL(base + name, root), serialize(value));
  }
  console.log(`Tracker dataset ${args[0] === '--check' ? 'verified' : 'generated'}: ${report.included} domains, ${report.excluded.length} excluded rules.`);
}
