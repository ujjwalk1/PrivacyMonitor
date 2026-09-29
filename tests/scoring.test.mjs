import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../scoring.js', import.meta.url), 'utf8');
// Run the exact classic script loaded by the extension, without browser globals.
const calculate = vm.runInNewContext(`${source}\nPrivacyMonitorScoring.calculateSecurityScore;`);
const headerNames = ['CSP', 'HSTS', 'X-Frame-Options', 'X-Content-Type-Options',
  'Referrer-Policy', 'Permissions-Policy'];

function observation(missing = []) {
  return {
    basicData: { httpsOnly: true },
    headerData: {
      present: Object.fromEntries(headerNames.filter(name => !missing.includes(name))
        .map(name => [name, 'fixture-value'])),
      missing: [...missing],
    },
    formData: { insecurePasswordForms: 0 },
  };
}

test('complete best case reaches the declared 100 maximum', () => {
  assert.equal(calculate(observation()), 100);
});

test('complete worst case reaches zero, including with the legacy headerScore', () => {
  const data = observation(headerNames);
  data.basicData.httpsOnly = false;
  data.formData.insecurePasswordForms = 1;
  data.headerData.headerScore = 58;
  assert.equal(calculate(data), 0);
});

test('HTTP and insecure password forms apply independent bounded deductions', () => {
  const data = observation();
  data.basicData.httpsOnly = false;
  assert.equal(calculate(data), 60);
  data.basicData.httpsOnly = true;
  for (const count of [1, 2, 100, Number.MAX_SAFE_INTEGER]) {
    data.formData.insecurePasswordForms = count;
    assert.equal(calculate(data), 80);
  }
  data.basicData.httpsOnly = false;
  assert.equal(calculate(data), 40);
});

test('header priority deductions and component rounding match documented examples', () => {
  for (const name of ['CSP', 'HSTS', 'X-Frame-Options']) {
    assert.equal(calculate(observation([name])), 90, name);
  }
  for (const name of ['X-Content-Type-Options', 'Referrer-Policy']) {
    assert.equal(calculate(observation([name])), 95, name);
  }
  assert.equal(calculate(observation(['Permissions-Policy'])), 98);
  // Round the weighted header component once, not each individual deduction.
  assert.equal(calculate(observation(['CSP', 'HSTS'])), 81);
  assert.equal(calculate(observation(headerNames)), 60);
});

test('all header combinations remain bounded and removing evidence cannot improve a score', () => {
  for (let mask = 0; mask < 64; mask++) {
    const missing = headerNames.filter((name, i) => mask & (1 << i));
    for (const httpsOnly of [false, true]) {
      for (const insecurePasswordForms of [0, 1]) {
        const data = observation(missing);
        data.basicData.httpsOnly = httpsOnly;
        data.formData.insecurePasswordForms = insecurePasswordForms;
        const score = calculate(data);
        assert.ok(Number.isInteger(score) && score >= 0 && score <= 100);
        for (const name of headerNames.filter(name => !missing.includes(name))) {
          const reduced = structuredClone(data);
          delete reduced.headerData.present[name];
          reduced.headerData.missing.push(name);
          assert.ok(calculate(reduced) <= score);
        }
      }
    }
  }
});

test('missing records and fields return null instead of a numeric success', () => {
  for (const data of [undefined, null, {}]) assert.equal(calculate(data), null);
  for (const record of ['basicData', 'headerData', 'formData']) {
    for (const value of [undefined, null, {}]) {
      const data = observation();
      data[record] = value;
      assert.equal(calculate(data), null, `${record}: ${JSON.stringify(value)}`);
    }
  }
  for (const field of ['present', 'missing']) {
    const data = observation();
    delete data.headerData[field];
    assert.equal(calculate(data), null, field);
  }
});

test('invalid connection and form observations cannot coerce into a score', () => {
  for (const value of ['true', 'false', 0, 1, null, undefined]) {
    const data = observation();
    data.basicData.httpsOnly = value;
    assert.equal(calculate(data), null);
  }
  for (const value of [-1, 0.5, NaN, Infinity, '0', false, null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    const data = observation();
    data.formData.insecurePasswordForms = value;
    assert.equal(calculate(data), null);
  }
});

test('absent headers differ from missing, contradictory, or malformed observations', () => {
  const invalidHeaders = [
    { present: {}, missing: [] },
    { present: null, missing: headerNames },
    { present: [], missing: headerNames },
    { present: {}, missing: 'CSP' },
    { present: {}, missing: [...headerNames, 'CSP'] },
    { present: {}, missing: [...headerNames, 'unknown'] },
    { present: { CSP: 'fixture' }, missing: headerNames },
    { present: { CSP: null }, missing: headerNames.filter(name => name !== 'CSP') },
  ];
  for (const headerData of invalidHeaders) {
    assert.equal(calculate({ ...observation(), headerData }), null);
  }
  assert.equal(calculate(observation(headerNames)), 60);
});

test('breach history, counts, and legacy headerScore do not affect or mutate observations', () => {
  for (const breachData of [undefined, null, [], [{ Name: 'Historical fixture', BreachDate: '2000-01-01' }]]) {
    const data = observation();
    data.breachData = breachData;
    data.basicData.cookies = 100;
    data.basicData.thirdPartyScripts = 100;
    data.headerData.headerScore = 0;
    const before = structuredClone(data);
    assert.equal(calculate(data), 100);
    assert.deepEqual(data, before);
  }
});
