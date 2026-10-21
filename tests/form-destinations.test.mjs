import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../content-script.js', import.meta.url), 'utf8');
function fixture({ url = 'https://page.example/path/page', base = url } = {}) {
  const forms = [], controls = [];
  const document = {
    URL: url, baseURI: base, readyState: 'loading', addEventListener() {},
    querySelectorAll(selector) { return selector === 'form' ? forms : controls; },
    createElement() { return { style: {}, setAttribute() {} }; },
  };
  const context = vm.createContext({ document, URL, setTimeout, clearTimeout,
    window: { location: new URL(url) },
    browser: { runtime: { onMessage: { addListener() {} } } },
  });
  vm.runInContext(source, context);
  // Resolver-only fixture: display preferences are already verified/enabled.
  vm.runInContext('displaySettings = { passwordFeedback: true, formWarnings: true }', context);
  function form(attributes = {}) {
    const item = { ownerDocument: document, attributes: { ...attributes }, banners: [],
      getAttribute(name) { return this.attributes[name] ?? null; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      querySelector() { return this.banners[0] ?? null; },
      querySelectorAll() { return [...this.banners]; },
      insertBefore(banner) {
        this.banners.push(banner);
        banner.remove = () => { this.banners = this.banners.filter(item => item !== banner); };
      },
    };
    forms.push(item); return item;
  }
  function control(owner, { tagName = 'BUTTON', type = 'submit', disabled = false, ...attributes } = {}) {
    const item = { form: owner, tagName, type, attributes, disabled,
      getAttribute(name) { return this.attributes[name] ?? null; },
      matches(selector) { assert.equal(selector, ':disabled'); return this.disabled; },
    };
    // Represents native form ownership, including a control outside the form tree.
    controls.push(item); return item;
  }
  return { context, document, form, control, scan: () => context.analyzeInsecureForms() };
}

const destinationCases = [
  ['relative on HTTPS', {}, { action: '../send' }, 'https'],
  ['relative on HTTP', { url: 'http://page.example/path/' }, { action: 'send' }, 'http'],
  ['HTTPS destination on HTTP page', { url: 'http://page.example/' }, { action: 'https://secure.example/send' }, 'https'],
  ['HTTP base on HTTPS page', { base: 'http://base.example/root/' }, { action: '/send' }, 'http'],
  ['HTTPS base on HTTP page', { url: 'http://page.example/', base: 'https://base.example/' }, { action: 'send' }, 'https'],
  ['missing action ignores HTTP base', { base: 'http://base.example/' }, {}, 'https'],
  ['empty action ignores HTTPS base', { url: 'http://page.example/', base: 'https://base.example/' }, { action: '' }, 'http'],
  ['empty HTTPS action ignores HTTP base', { base: 'http://base.example/' }, { action: '' }, 'https'],
  ['scheme relative uses base scheme', { base: 'http://base.example/' }, { action: '//other.example/send' }, 'http'],
  ['query relative uses base', { base: 'http://base.example/root/' }, { action: '?mode=send' }, 'http'],
  ['fragment relative uses base', { base: 'http://base.example/root/' }, { action: '#send' }, 'http'],
  ['whitespace is a nonempty relative URL', { base: 'http://base.example/root/' }, { action: '  ' }, 'http'],
  ['URL parser handles case and surrounding space', {}, { action: '  hTtP://other.example/send  ' }, 'http'],
  ['malformed URL', {}, { action: 'http://[invalid' }, 'unknown'],
  ['mail action on HTTP is unsupported', { url: 'http://page.example/' }, { action: 'mailto:test@example.invalid' }, 'unknown'],
  ['script action is unsupported', {}, { action: 'javascript:void(0)' }, 'unknown'],
  ['dialog does not submit a URL', {}, { action: 'http://other.example/', method: 'DiAlOg' }, 'none'],
  ['invalid method defaults to GET', {}, { action: 'http://other.example/', method: ' dialog ' }, 'http'],
];
for (const [name, options, attributes, expected] of destinationCases) {
  test(`form destination: ${name}`, () => {
    const view = fixture(options);
    assert.equal(view.context.resolveFormDestination(view.form(attributes)), expected);
  });
}

test('submitter overrides honor presence, empty values, base URI, and effective method', () => {
  const view = fixture({ url: 'http://page.example/', base: 'https://base.example/' });
  const form = view.form({ action: 'https://secure.example/', method: 'dialog' });
  const submitter = view.control(form, { formmethod: 'post', formaction: 'send' });
  assert.equal(view.context.resolveFormDestination(form, submitter), 'https');
  submitter.attributes.formaction = '';
  assert.equal(view.context.resolveFormDestination(form, submitter), 'http');
  delete submitter.attributes.formaction;
  assert.equal(view.context.resolveFormDestination(form, submitter), 'https');
  submitter.attributes.formmethod = 'dialog';
  assert.equal(view.context.resolveFormDestination(form, submitter), 'none');
  submitter.attributes.formmethod = '';
  submitter.attributes.formaction = 'http://other.example/';
  assert.equal(view.context.resolveFormDestination(form, submitter), 'http');
});

test('associated button/input/image overrides count each HTTP form once and warn password forms', () => {
  const view = fixture();
  const form = view.form({ action: 'https://secure.example/' });
  view.control(form, { tagName: 'INPUT', type: 'password' });
  const button = view.control(form, { formaction: 'http://other.example/' });
  const input = view.control(form, { tagName: 'INPUT', type: 'submit', formaction: 'http://other.example/' });
  const image = view.control(form, { tagName: 'INPUT', type: 'image', formaction: 'http://other.example/' });
  assert.equal(view.scan().insecureForms, 1);
  assert.equal(view.scan().insecurePasswordForms, 1);
  assert.equal(form.banners.length, 1);
  assert.match(form.banners[0].innerHTML, /can submit over HTTP/);
  button.attributes.formaction = input.attributes.formaction = 'https://secure.example/';
  assert.equal(view.scan().insecureForms, 1, 'Image submitter must still be considered');
  image.attributes.formaction = 'https://secure.example/';
  assert.equal(view.scan().insecureForms, 0);
  assert.equal(form.banners.length, 0);
});

test('non-submit and disabled controls do not supply submission destinations', () => {
  const view = fixture(); const form = view.form();
  for (const type of ['reset', 'button', 'text', 'password']) {
    view.control(form, { tagName: 'INPUT', type, formaction: 'http://other.example/' });
  }
  // :disabled includes disabled fieldset inheritance in the browser.
  view.control(form, { disabled: true, formaction: 'http://other.example/' });
  view.control(null, { formaction: 'http://other.example/' });
  assert.equal(view.scan().insecureForms, 0);
});

test('native ownership separates password fields from another form and keeps default route', () => {
  const view = fixture();
  const insecure = view.form({ action: 'http://other.example/' });
  const secure = view.form({ action: 'https://secure.example/' });
  view.control(secure, { tagName: 'INPUT', type: 'password' });
  view.control(insecure, { formaction: 'https://secure.example/' });
  const result = view.scan();
  assert.equal(result.insecureForms, 1, 'Default action remains a possible route without a submitter');
  assert.equal(result.insecurePasswordForms, 0);
  assert.equal(insecure.banners.length, 0);
});

test('unsupported routes make the aggregate unavailable but preserve known local HTTP warnings', () => {
  const view = fixture(); const form = view.form({ action: 'https://secure.example/' });
  view.control(form, { tagName: 'INPUT', type: 'password' });
  view.control(form, { formaction: 'http://other.example/' });
  view.control(form, { formaction: 'javascript:void(0)' });
  const result = view.scan(); assert.equal(result, false);
  assert.equal(form.banners.length, 1);
  for (const file of ['scoring.js', 'popup-state.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), view.context);
  }
  view.context.formResult = result;
  assert.equal(vm.runInContext('PrivacyMonitorPopupState.local({formData: formResult}).forms.kind', view.context), 'unavailable');
  assert.equal(vm.runInContext('PrivacyMonitorScoring.calculateSecurityScore({formData: formResult})', view.context), null);
});

test('scan output contains only counts and page metadata, never resolved destination components', () => {
  const view = fixture();
  const form = view.form({ action: 'https://username:secret@secure.example/private?token=secret#fragment' });
  view.control(form, { formaction: 'http://other.example/private?token=secret#fragment' });
  const result = view.scan();
  assert.deepEqual(Object.keys(result).sort(), ['insecureForms', 'insecurePasswordForms', 'pageIsHttps', 'timestamp']);
  assert.equal(result.insecureForms, 1);
  assert.doesNotMatch(JSON.stringify(result), /secret|username|private|token|fragment|example/);
});
