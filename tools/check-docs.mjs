// Check repository-local Markdown links/heading anchors; no external requests.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set(['.git', 'dist', 'node_modules', 'checkpoints', 'web-ext-artifacts']);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name)) return [];
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}
function prose(text) {
  let fence = null;
  return text.split(/\r?\n/).map(line => {
    const match = line.match(/^\s*(\x60{3,}|~{3,})/);
    if (match) {
      if (!fence) fence = match[1][0];
      else if (fence === match[1][0]) fence = null;
      return '';
    }
    return fence ? '' : line;
  }).join('\n');
}
const anchorCache = new Map();
function anchors(path) {
  if (anchorCache.has(path)) return anchorCache.get(path);
  const result = new Set(), counts = new Map();
  for (const match of prose(readFileSync(path, 'utf8')).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]*>/g, '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    result.add(slug + (count ? '-' + count : ''));
  }
  anchorCache.set(path, result);
  return result;
}
let checked = 0;
const errors = [];
const documents = walk(root);
for (const file of documents) {
  const text = prose(readFileSync(file, 'utf8'));
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<([^>]+)>$/, '$1');
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) continue;
    checked++;
    const [rawPath, rawAnchor] = target.split('#');
    let path, anchor;
    try {
      path = rawPath ? resolve(dirname(file), decodeURIComponent(rawPath)) : file;
      anchor = rawAnchor ? decodeURIComponent(rawAnchor) : '';
    } catch {
      errors.push(relative(root, file) + ': invalid encoded link ' + target); continue;
    }
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith('..' + sep) || !existsSync(path)) {
      errors.push(relative(root, file) + ': missing/outside target ' + target);
    } else if (anchor && extname(path) === '.md' && !anchors(path).has(anchor)) {
      errors.push(relative(root, file) + ': missing heading ' + target);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Documentation links passed: ' + checked + ' local links across ' + documents.length +
    ' Markdown files. Local heading anchors checked; external URLs and code examples are not fetched.');
}
