import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

// D18 manual acceptance fixtures. No real accounts, submissions or external APIs.
const dynamic = readFileSync(new URL('./fixtures/dynamic-forms.html', import.meta.url));
const headers = {
  'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=()',
};
const page = (name, action) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${name}</title>
<h1>${name}</h1><p>Local HTTP fixture. Keep breach lookup off. Use dummy input only; submission is canceled.</p>
<form action="${action}"><label>Synthetic password <input type="password"></label><button>Submit (canceled)</button></form>
<script>document.addEventListener('submit', e => e.preventDefault());</script></html>`;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4180');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/offline') { req.socket.destroy(); return; }
  if (['/redirect', '/cross-host-redirect'].includes(url.pathname)) {
    res.writeHead(302, { ...headers, Location: url.pathname === '/redirect' ? '/page-b' : 'http://localhost:4180/page-b' });
    res.end(); return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (url.pathname === '/page-a') {
    // Header-presence fixture, not a secure site: HTTP + six headers + HTTPS form => 60.
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    res.end(page('D18 page A: expected score 60', 'https://destination.example.invalid/send'));
  } else if (url.pathname === '/page-b') {
    // No scored headers + HTTP password form on HTTP => 0.
    res.end(page('D18 page B: expected score 0', 'http://destination.example.invalid/send'));
  } else if (url.pathname === '/dynamic-forms.html') {
    res.end(dynamic);
  } else if (url.pathname === '/') {
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>D18 acceptance fixtures</title>
<h1>Privacy Monitor acceptance fixtures</h1><p>Run the actual extension in a disposable Firefox profile. Keep breach lookup off.</p>
<ul>${['page-a','page-b','redirect','cross-host-redirect','dynamic-forms.html','offline'].map(p=>`<li><a href="/${p}">${p}</a></li>`).join('')}</ul>
<p>Compare page A and B in separate tabs on the same host. A should remain 60 after B is scanned; a score of 40 on A reproduces shared content summaries.</p></html>`);
  } else { res.writeHead(404); res.end('Not found'); }
});
server.listen(4180, '127.0.0.1', () => console.log('D18 fixtures: http://127.0.0.1:4180/ — Ctrl+C to stop'));
