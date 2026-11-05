// Explicit synthetic preview only; no production bundle or browsing capture.
import { createServer } from 'node:http';
import { envelope, read } from './helpers/request-details.mjs';

const html = read('details/requests.html');
const assets = new Map(['requests.css', 'requests-view.js', 'requests-page.js']
  .map(name => ['/' + name, read('details/' + name)]));
const cases = {};
cases.mixed = envelope();
cases.empty = { analysis: { kind: 'not-observed' }, dataset: null };
cases.unavailable = { analysis: { kind: 'unavailable' }, dataset: null };
cases.limits = structuredClone(cases.mixed);
cases.limits.analysis.truncated = true; cases.limits.analysis.counterSaturated = true;
cases.limits.analysis.findings[0].types[0].events = 65535;
cases.long = structuredClone(cases.mixed);
cases.long.analysis.findings[0].hostname = 'a'.repeat(63) + '.' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.example.com';
cases.long.analysis.pageHostname = cases.long.analysis.findings[0].hostname;
const bootstrap = `
const previewCases = ${JSON.stringify(cases)};
const scenario = new URLSearchParams(location.search).get('case') || 'mixed';
const event = () => ({ addListener() {}, removeListener() {} });
globalThis.browser = {
  runtime: { getBackgroundPage: async () => ({
    PrivacyMonitorRequestDetailsSource: { read: () => scenario === 'loading' ? new Promise(() => {}) : structuredClone(previewCases[scenario] || previewCases.mixed) }
  }) },
  webNavigation: { onBeforeNavigate: event() },
  tabs: { onRemoved: event(), onReplaced: event() },
  permissions: { onRemoved: event() }
};
`;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4181');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const preview = html.replace('<script src="requests-page.js"', '<script src="/preview-api.js" defer></script><script src="requests-page.js"')
      .replace('<main>', '<main><p class="warning"><strong>Preview — synthetic observations; not a live scan.</strong></p>');
    res.end(preview);
  } else if (url.pathname === '/preview-api.js') {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(bootstrap);
  } else if (assets.has(url.pathname)) {
    res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
    let asset = assets.get(url.pathname);
    if (url.pathname.endsWith('.css') && url.searchParams.get('theme') === 'dark') asset = asset.replace('@media (prefers-color-scheme: dark)', '@media all');
    res.end(asset);
  } else { res.writeHead(404); res.end('Not found'); }
});
server.listen(4181, '127.0.0.1', () => console.log('Synthetic details preview: http://127.0.0.1:4181/?tab=1&case=mixed'));
