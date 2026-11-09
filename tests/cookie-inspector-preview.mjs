// Explicit local synthetic UI preview; never reads real browser cookies.
import { createServer } from 'node:http';
import { fixture, read } from './helpers/cookie-inspector.mjs';
const sample = await fixture();
const cases = { mixed: sample, empty: { ...sample, cookies: [] }, unavailable: { kind: 'unavailable', reason: 'permission-unavailable' } };
cases.long = structuredClone(sample);
cases.long.hostname = 'a'.repeat(63) + '.' + 'b'.repeat(63) + '.example.com';
cases.long.cookies[0].domain = cases.long.hostname;
const bootstrap = `
const cases = ${JSON.stringify(cases)};
const scenario = new URLSearchParams(location.search).get('case') || 'mixed';
const event = () => ({ addListener() {}, removeListener() {} });
globalThis.browser = {
 runtime: { getBackgroundPage: async () => ({}) },
 permissions: { onRemoved: event() }, webNavigation: { onBeforeNavigate: event() },
 tabs: { onActivated: event(), onRemoved: event(), onReplaced: event() },
 windows: { onFocusChanged: event() }
};
globalThis.PrivacyMonitorCookieMetadata = { create: () => ({
 readActive: async () => structuredClone(cases[scenario] || cases.mixed),
 requestFromGesture: () => Promise.resolve(scenario === 'denied' ? { kind: 'unavailable', reason: 'permission-denied' } : { kind: 'granted' }),
 invalidate() {}, dispose() {}
}) };
`;
const paths = ['details/requests.css','details/cookies.css','details/cookies-view.js','details/cookies-page.js',
 'lib/cookie-metadata.js','lib/site-domains.js','vendor/tldts/index.umd.min.js'];
const assets = new Map(paths.map(p => ['/' + p, read(p)]));
createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1:4182');
 res.setHeader('Cache-Control','no-store');
 if (url.pathname === '/' || url.pathname === '/details/cookies.html') {
  let html = read('details/cookies.html').replace('<head>', '<head><base href="/details/">')
   .replace('<script src="cookies-page.js"', '<script src="/preview-api.js" defer></script><script src="cookies-page.js"')
   .replace('<main>', '<main><p class="warning"><strong>Preview - synthetic metadata; not browser cookies.</strong></p>');
  const theme = url.searchParams.get('theme');
  if (['light','dark'].includes(theme)) html = html.replace('href="requests.css"', 'href="requests.css?theme=' + theme + '"');
  res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html);
 } else if (url.pathname === '/preview-api.js') {
  res.setHeader('Content-Type','text/javascript; charset=utf-8'); res.end(bootstrap);
 } else if (assets.has(url.pathname)) {
  let content = assets.get(url.pathname);
  if (url.pathname.endsWith('.css')) {
   const theme = url.searchParams.get('theme');
   if (theme === 'dark') content = content.replace('@media (prefers-color-scheme: dark)', '@media all');
   if (theme === 'light') content = content.replace('@media (prefers-color-scheme: dark)', '@media not all');
  }
  res.setHeader('Content-Type',url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
  res.end(content);
 } else { res.writeHead(404); res.end('Not found'); }
}).listen(4182, '127.0.0.1', () => console.log('Synthetic cookie inspector: http://127.0.0.1:4182/?case=mixed&theme=light'));
