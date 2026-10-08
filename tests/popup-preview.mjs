// Local visual fixtures only; never packaged with the extension.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const cases = ['loading', 'incomplete', 'partial', 'unavailable', 'unsupported', 'ready', 'warnings',
  'breach-results', 'breach-http-error', 'breach-network-error', 'breach-malformed', 'breach-timeout'];
const assets = new Map(['scoring.js', 'popup-state.js', 'popup.js'].map(path => [`/${path}`, read(path)]));
assets.set('/preview-fixture.js', read('tests/fixtures/popup-preview.js'));
const popup = read('popup.html').replace('<script src="scoring.js">',
  '<script src="preview-fixture.js"></script>\n  <script src="scoring.js">');
const gallery = `<!doctype html><html><head><title>D03–D04 popup fixtures</title>
<style>body{font:16px system-ui;background:#e5e7eb;margin:20px}main{display:flex;flex-wrap:wrap;gap:20px}iframe{width:340px;height:850px;border:1px solid #777;background:white}h2{font-size:16px}p{max-width:900px}</style></head>
<body><h1>D03–D04 popup states and breach outcomes</h1><p>Local synthetic observations. All browser APIs and breach responses are mocked; no external requests. Refresh is deliberately denied to exercise the unavailable state. The breach timeout appears after eight seconds; ready shows a successful empty lookup.</p><main>
${cases.map(name => `<section><h2>${name}</h2><iframe title="${name}" src="/popup.html?case=${name}"></iframe></section>`).join('')}
</main></body></html>`;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4179');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/' || url.pathname === '/popup.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(url.pathname === '/' ? gallery : popup);
  } else if (assets.has(url.pathname)) {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.end(assets.get(url.pathname));
  } else { res.writeHead(404); res.end('Not found'); }
});
server.listen(4179, '127.0.0.1', () => console.log('Popup fixtures: http://127.0.0.1:4179/ (Ctrl+C to stop)'));
