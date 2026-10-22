// Local visual fixtures only; never packaged with the extension.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const cases = ['loading', 'incomplete', 'partial', 'unavailable', 'unsupported', 'ready', 'warnings',
  'breach-cached', 'breach-rate-limited', 'breach-results', 'breach-http-error', 'breach-network-error', 'breach-malformed', 'breach-timeout',
  'consent-off', 'consent-denied', 'consent-unsupported', 'long-content'];
const assets = new Map(['scoring.js', 'popup-state.js', 'breach-service.js', 'popup.js'].map(path => [`/${path}`, read(path)]));
assets.set('/preview-fixture.js', read('tests/fixtures/popup-preview.js'));
for (const icon of ['icon.svg', 'icon-light.svg', 'icon-dark.svg']) assets.set(`/${icon}`, read(icon));
const popup = read('popup.html').replace('<script src="popup.js">', '<script src="breach-service.js"></script>\n  <script src="popup.js">').replace('<script src="scoring.js">',
  '<script src="preview-fixture.js"></script>\n  <script src="scoring.js">');
const gallery = `<!doctype html><html><head><title>D03–D06 popup fixtures</title>
<style>body{font:16px system-ui;background:#e5e7eb;margin:20px}main{display:flex;flex-wrap:wrap;gap:20px}iframe{width:340px;height:850px;border:1px solid #777;background:white}h2{font-size:16px}p{max-width:900px}</style></head>
<body><h1>D03–D06 popup, breach, and consent states</h1><p>Local synthetic observations. Browser permissions and breach responses are mocked; no external requests or real consent prompts. Refresh is deliberately denied. The timeout takes eight seconds. Earlier cases simulate existing consent; consent-off starts disabled and lets you try Enable/Disable, consent-denied rejects Enable, and consent-unsupported keeps lookup off.</p><main>
${cases.map(name => `<section><h2>${name}</h2><iframe title="${name}" src="/popup.html?case=${name}"></iframe></section>`).join('')}
</main></body></html>`;
const presentation = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>D15 presentation fixtures</title>
<style>body{font:16px system-ui;background:#e5e7eb;color:#111827;margin:20px}main{display:flex;flex-wrap:wrap;gap:24px}iframe{width:320px;height:600px;border:1px solid #6b7280}section{max-width:340px}.icons{padding:16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}.dark{background:#1f2937}.light{background:white}</style></head>
<body><h1>D15 presentation fixtures</h1><p>Local synthetic content. Themes force the production media rules for inspection; they do not change system preferences. Use browser zoom to test reflow. Real Firefox toolbar and popup checks remain required.</p>
<h2>Local SVG icons at 16, 32, 48 and 96 pixels</h2>
${['light', 'dark'].map(theme => `<div class="icons ${theme}">${[16, 32, 48, 96].map(size => `<img alt="${theme} toolbar ${size}" width="${size}" height="${size}" src="icon-${theme === 'light' ? 'dark' : 'light'}.svg"><img alt="default ${size}" width="${size}" height="${size}" src="icon.svg">`).join('')}</div>`).join('')}
<main>${['light', 'dark'].flatMap(theme => ['ready', 'warnings', 'partial', 'long-content', 'unsupported', 'loading'].map(name => `<section><h2>${theme}: ${name}</h2><a href="/popup.html?case=${name}&theme=${theme}">Open standalone preview</a><br><iframe title="${theme} ${name}" src="/popup.html?case=${name}&theme=${theme}"></iframe></section>`)).join('')}
${['light', 'dark'].flatMap(theme => [160, 240, 320].map(width => `<section><h2>${theme}: ${width}px / ${width === 320 ? 200 : 100}% CSS zoom</h2><p>Zoom simulation, not native Firefox zoom.</p><iframe style="width:${width}px" title="${theme} ${width}px zoom" src="/popup.html?case=long-content&theme=${theme}&zoom=${width === 320 ? 200 : 100}"></iframe></section>`)).join('')}
</main></body></html>`;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4179');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/presentation.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(presentation);
  } else if (url.pathname === '/form-destinations.html' || url.pathname === '/dynamic-forms.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(read(`tests/fixtures${url.pathname}`));
  } else if (url.pathname === '/' || url.pathname === '/popup.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const theme = url.searchParams.get('theme');
    const themed = ['light', 'dark'].includes(theme)
      ? popup.replace('@media (prefers-color-scheme: dark)', theme === 'dark' ? '@media all' : '@media not all')
        .replace('</head>', `<style>:root { color-scheme: ${theme}; }</style></head>`)
      : popup;
    const zoomed = url.searchParams.get('zoom') === '200'
      ? themed.replace('</head>', '<style>html { zoom: 2; }</style></head>') : themed;
    res.end(url.pathname === '/' ? gallery : zoomed);
  } else if (assets.has(url.pathname)) {
    res.setHeader('Content-Type', url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'text/javascript; charset=utf-8');
    res.end(assets.get(url.pathname));
  } else { res.writeHead(404); res.end('Not found'); }
});
server.listen(4179, '127.0.0.1', () => console.log('Popup fixtures: http://127.0.0.1:4179/ (Ctrl+C to stop)'));
