# Page observation score (D02)

`scoring.js` supplies the pure `PrivacyMonitorScoring.calculateSecurityScore`
function. `popup.html` loads it before `popup.js`; the popup calculates the score
from local observations before waiting for the separate historical breach lookup.
There are no dependencies, network requests, persistence, or password inputs in
the scoring function.

## Weights and deductions

| Observation | Points | Deduction from a complete best case |
| --- | ---: | --- |
| Page uses HTTPS (`basicData.httpsOnly`) | 40 | HTTP loses 40 |
| Observed security headers | 0–40 | Missing headers lose their weighted share |
| No observed HTTP password forms (`formData.insecurePasswordForms === 0`) | 20 | One or more HTTP password forms lose 20 total |

Header weights preserve the previous relative priorities: CSP, HSTS, and
X-Frame-Options each weigh 10; X-Content-Type-Options and Referrer-Policy each weigh
5; Permissions-Policy weighs 2. The weights total 42. Header points are
`round(40 × sum of present weights / 42)`, rounded once for the whole component.
All six present earns 40; all six observed absent earns zero. For example, only
CSP missing yields 30 header points and a 90 total if the other components pass.

The total is the sum of these three components: an integer from 0 to 100. HTTPS
with all six headers and no observed HTTP password forms reaches 100. HTTP with
all headers absent and at least one HTTP password form reaches zero. A scan with
no password forms earns the form points because it observed no HTTP password
form; that does not prove that unobserved or later-added forms are secure.

There are no unconditional base points. Historical breach results, lookup errors,
cookie counts, and third-party script counts have no effect on this score. The
existing breach results and counts remain separately visible. Counts alone do
not establish tracking or harmful behavior. The old formula's maximum was 75;
the new weights are a documented heuristic, not a probability of safety.

## Required observations

The function returns `null` (not zero, 100, or NaN) if a required observation is
missing or invalid:

- `basicData.httpsOnly` must be a boolean.
- `headerData.present` must be an object with string values for known present
  headers. `headerData.missing` must explicitly list absent known headers, without
  duplicates. Each of the six headers must appear in exactly one of those sets.
- `formData.insecurePasswordForms` must be a nonnegative safe integer.

An empty header observation is unknown; six explicitly absent headers are a
completed observation worth zero header points. Missing cookie/script counts are
irrelevant. The legacy stored `headerScore` is ignored: its minimum was 58 even
when all headers were absent. The scorer uses the existing `present`/`missing`
record directly, so previously stored records need no migration. Background
storage is unchanged for its later record migration.

The popup displays an empty neutral ring, a dash, and “Incomplete” for a null
score, and clears the previous score when loading again. The full popup state
model is deferred to D03.

## Limits and verification

Headers are evaluated for presence only; empty/ineffective header values are not
validated here. Transport and form findings retain the existing scanner's limits.
Records are still keyed by hostname and may be stale or belong to another tab.
D07–D12 address record identity and form scanning; D29–D30 address header values.
Even 100 is not a claim that a site is trustworthy or free of tracking.

Run `node --test tests/*.test.mjs` for score boundaries, deductions, invalid/missing
inputs, breach independence, and mocked popup integration. Live Firefox checks
remain separate: load the extension, check the new script loads without errors,
confirm local scoring before breach completion, and inspect complete/incomplete
score rendering. Record results in `PROGRESS.md`.
