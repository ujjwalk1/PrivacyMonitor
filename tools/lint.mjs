// Dependency-free local checks. This is not Mozilla's add-ons validator.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const files = JSON.parse(read('tools/extension-files.json'));
const manifest = JSON.parse(read('manifest.json'));
assert.equal(manifest.manifest_version, 2, 'D01 retains the MV2 baseline');
assert.ok(manifest.name && manifest.version, 'Manifest needs name and version');
assert.equal(new Set(files).size, files.length, 'Package entries must be unique');

for (const file of files) {
  assert.match(file, /^[\w.-]+$/, 'Only root extension files belong in this package');
  read(file);
}
const popup = manifest.browser_action.default_popup;
const popupScripts = [...read(popup).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
  .map(match => match[1]);
const references = [
  ...manifest.background.scripts,
  ...manifest.content_scripts.flatMap(entry => entry.js),
  popup,
  ...popupScripts,
];
for (const file of references) {
  assert.ok(files.includes(file), `Manifest/popup reference missing from package: ${file}`);
}
for (const file of files.filter(file => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, root))],
    { stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `JavaScript syntax check failed: ${file}`);
}
console.log(`Local lint passed: MV2 manifest, package references, ${files.length} files, JavaScript syntax.`);
