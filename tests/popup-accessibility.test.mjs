import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { popup, consentedPopup, deferred } from './helpers/popup.mjs';

const html = readFileSync(new URL('../popup.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../popup.js', import.meta.url), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `Missing CSS rule: ${selector}`);
  return match[1];
};
const color = (selector, property = 'color') => {
  const value = rule(selector).match(new RegExp(`(?:^|[;\\s])${property}:\\s*([^;]+)`))?.[1];
  assert.ok(value, `Missing ${property}: ${selector}`);
  return value;
};
function rgb(value) {
  if (value === 'white') return [255, 255, 255];
  const hex = value.slice(1);
  return (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex).match(/../g).map(c => parseInt(c, 16));
}
function contrast(a, b) {
  const luminance = values => values.map(c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
const unavailable = (view, id) => view.nodes[id].attributes['aria-disabled'] === 'true';

test('popup has named native controls in a stable source order, headings, and language', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Privacy Monitor<\/title>/);
  const buttons = [...html.matchAll(/<button\b([^>]+)>([^<]+)<\/button>/g)];
  assert.deepEqual(buttons.map(([, attrs]) => attrs.match(/id="([^"]+)"/)[1]),
    ['breach-enable', 'breach-disable', 'refresh', 'open-settings']);
  assert.deepEqual(buttons.map(([, , text]) => text),
    ['Enable breach lookup', 'Disable breach lookup', 'Refresh Analysis', 'On-page settings']);
  for (const [, attrs] of buttons) {
    assert.match(attrs, /type="button"/);
    assert.doesNotMatch(attrs, /(?:^|\s)disabled(?:\s|=|$)|tabindex/);
  }
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.equal([...html.matchAll(/<h2\b/g)].length, 6);
  assert.doesNotMatch(html, /tabindex|accesskey/);
  assert.doesNotMatch(script, /\.focus\s*\(/, 'Async results must not move focus');
  assert.match(rule('button:focus-visible'), /outline: 3px solid/);
});

test('popup text colors meet 4.5:1 on their declared backgrounds; focus meets 3:1', () => {
  const white = rgb(color('.section', 'background'));
  for (const selector of ['.good', '.warning', '.danger', '.muted', '.metric-label', '.section-title', '.loading-row', '.no-breaches']) {
    assert.ok(contrast(rgb(color(selector)), white) >= 4.5, selector);
  }
  for (const selector of ['.pill-present', '.pill-missing', '.pill-unknown', '.form-warning', '.tag-new', '.refresh-btn']) {
    assert.ok(contrast(rgb(color(selector)), rgb(color(selector, 'background'))) >= 4.5, selector);
  }
  for (const selector of ['.breach-item .breach-name', '.breach-item .breach-meta']) {
    assert.ok(contrast(rgb(color(selector)), rgb(color('.breach-item', 'background'))) >= 4.5, selector);
  }
  const page = rgb(color('body', 'background'));
  assert.ok(contrast(rgb(color('#loading-screen')), page) >= 4.5);
  assert.ok(contrast(rgb(color('body')), page) >= 4.5);
  const focus = rgb(rule('button:focus-visible').match(/outline: 3px solid (#[\da-f]+)/)[1]);
  assert.ok(contrast(focus, white) >= 3 && contrast(focus, page) >= 3);
  for (const state of [':hover', '[aria-disabled="true"]']) {
    assert.ok(contrast(rgb('white'), rgb(color(`.refresh-btn${state}`, 'background'))) >= 4.5);
  }
  const view = popup();
  for (const bg of rule('.header').match(/#[\da-f]{6}/g).map(rgb)) {
    for (const selector of ['.header .domain', '.score-label']) {
      const opacity = Number(rule(selector).match(/opacity: ([\d.]+)/)[1]);
      assert.ok(contrast(bg.map(c => 255 * opacity + c * (1 - opacity)), bg) >= 4.5, selector);
    }
    for (const score of [0, 40, 60, 80]) {
      assert.ok(contrast(rgb(view.context.getScoreStyle(score).color), bg) >= 4.5);
    }
  }
});

test('score has a complete accessible name, textual ratings, and no stale numeric result', () => {
  const view = popup();
  assert.match(html, /id="score-summary"[^>]*aria-label=[^>]*aria-describedby="score-description"/);
  assert.match(html, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
  for (const [score, label] of [[100, 'Excellent'], [60, 'Good'], [40, 'Fair'], [0, 'Poor']]) {
    view.context.updateScoreRing(score);
    assert.equal(view.nodes['score-summary'].attributes['aria-label'], `Technical observation score: ${score} out of 100, ${label}.`);
    assert.equal(view.nodes['score-label'].textContent, label);
  }
  for (const state of ['loading', 'incomplete', 'unsupported', 'unavailable']) {
    view.context.renderOverall(state);
    assert.match(view.nodes['score-summary'].attributes['aria-label'], new RegExp(`${state}\\. No score available`));
    assert.equal(view.nodes['main-content'].attributes['aria-busy'], String(state === 'loading'));
  }
});

test('persistent polite atomic status regions expose local score and separate breach outcomes', async () => {
  for (const id of ['loading-screen', 'breach-consent-status', 'breach-status']) {
    const tag = html.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))[0];
    assert.match(tag, /role="status"/); assert.match(tag, /aria-live="polite"/); assert.match(tag, /aria-atomic="true"/);
    assert.doesNotMatch(tag, /hidden|display:none/);
  }
  const view = popup(); await view.context.loadAllData();
  assert.match(view.nodes['status-message'].textContent, /100 out of 100, Excellent.*not a safety guarantee/);
  for (const kind of ['disabled', 'private-disabled', 'context-unavailable', 'network-error', 'timeout', 'malformed', 'http-error', 'rate-limited', 'consent-error', 'consent-unsupported', 'not-run']) {
    view.context.renderBreaches({ kind, retryAt: 10000, status: 503 });
    assert.equal(view.nodes['breach-status'].textContent, view.nodes['breach-error'].textContent);
    assert.match(view.nodes['breach-status'].textContent, /No conclusion can be drawn/);
  }
  view.context.renderBreaches({ kind: 'empty', cached: true });
  assert.match(view.nodes['breach-status'].textContent, /No breach records returned.*No new request/);
  view.context.renderBreaches({ kind: 'results', breaches: Array.from({ length: 4 }, () => ({ Name: 'Fixture', BreachDate: '2000-01-01' })) });
  assert.match(view.nodes['breach-status'].textContent, /4 historical breach records.*three most recent.*Checked with/);
  assert.doesNotMatch(view.nodes['breach-status'].textContent, /Fixture/, 'Summarize results instead of reading all cards');
  view.controls.storage = async () => ({}); await view.context.loadAllData();
  assert.match(view.nodes['breach-status'].textContent, /not run: page observations/);
});

test('stale async results cannot announce an old page after the new page becomes unsupported', async () => {
  const view = consentedPopup(); const old = view.context.loadAllData(); await view.requested;
  view.controls.query = async () => [{ url: 'about:config' }]; await view.context.loadAllData();
  view.finishFetch({ ok: true, json: async () => [] }); await old;
  assert.equal(view.nodes['breach-status'].textContent, '');
  assert.match(view.nodes['status-message'].textContent, /Unsupported page/);
});

test('unavailable refresh remains focusable and ignores activation while a refresh is pending', async () => {
  const view = popup(); await view.context.loadAllData();
  const scan = deferred(), requested = deferred();
  view.controls.scan = () => { requested.resolve(); return scan.promise; };
  const refresh = view.context.refreshData(); await requested.promise;
  assert.ok(unavailable(view, 'refresh'));
  assert.notEqual(view.nodes.refresh.disabled, true);
  await view.context.refreshData(); assert.equal(view.calls.scan, 1);
  scan.reject(new Error('Fixture unavailable')); await refresh;
  assert.equal(unavailable(view, 'refresh'), false);
  assert.equal(view.nodes.refresh.textContent, 'Refresh Analysis');
  view.context.renderOverall('unsupported'); await view.context.refreshData();
  assert.equal(view.calls.scan, 1);
});

test('unavailable consent controls ignore activation and pending requests cannot be duplicated', async () => {
  const view = popup(); await view.context.loadAllData();
  view.controls.removePermission = () => assert.fail('Off control must not remove permission');
  await view.context.setBreachLookupEnabled(false);
  const choice = deferred(); let requests = 0;
  view.controls.requestPermission = () => { requests++; return choice.promise; };
  const enabling = view.context.setBreachLookupEnabled(true);
  assert.ok(unavailable(view, 'breach-enable')); assert.ok(unavailable(view, 'breach-disable'));
  assert.notEqual(view.nodes['breach-enable'].disabled, true);
  await view.context.setBreachLookupEnabled(true); await view.context.setBreachLookupEnabled(false);
  assert.equal(requests, 1);
  choice.resolve(false); await enabling;
  assert.equal(unavailable(view, 'breach-enable'), false);
  assert.ok(unavailable(view, 'breach-disable'));
});

test('connection, header, and form states have readable text independent of color', () => {
  const view = popup();
  view.context.renderConnection({ kind: 'observed', protocol: 'http:', httpsOnly: false });
  assert.equal(view.nodes['https-status'].textContent, 'HTTP observed');
  view.context.renderHeaders(['present', 'absent', 'not-observed', 'unavailable'].map(kind => ({ name: 'CSP', kind })));
  for (const label of ['Present', 'Absent', 'Not observed', 'Unavailable']) assert.ok(view.nodes['headers-grid'].innerHTML.includes(label));
  view.context.renderForms({ kind: 'observed', insecureForms: 1, insecurePasswordForms: 1 });
  assert.match(view.nodes['forms-body'].innerHTML, /1 insecure form.*detected/);
});
