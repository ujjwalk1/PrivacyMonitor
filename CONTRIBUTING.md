# Contributing to Privacy Monitor

Use a separate branch or checkout, preserve unrelated changes, and keep a change focused. This is a plain JavaScript Firefox MV2 extension. Please discuss substantial architecture or permission changes in an issue first.

## Setup

Clone the repository and open its root in your editor. Use Node.js 24; the verified environment for this documentation update was Node 24.19.0 and Windows PowerShell. No npm install is required.

~~~powershell
node --test tests/*.test.mjs
node tools/lint.mjs
node tools/check-docs.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
~~~

For Firefox loading, follow [DEVELOPING.md](docs/DEVELOPING.md). To serve controlled fixtures, run `node tests/popup-preview.mjs`; stop it with Ctrl+C. The synthetic popup gallery does not validate actual Firefox permissions, network services or extension loading.

## Code and review

- Keep passwords transient. Do not log or persist secrets, cookie values, request bodies or full page URLs.
- Preserve the distinction between observed zero, not observed and unavailable. Explain the limits of every finding.
- Keep external lookups behind disclosed consent and preserve private-context guards.
- Keep runtime references synchronized with [the package allowlist](tools/extension-files.json) if assets change.
- Add focused behavioral tests for logic changes, run relevant existing checks, and record native-browser checks separately from mocked tests.
- Include a concise problem/behavior explanation and validation results in a pull request. Do not claim acceptance for tests that were not run.
- Maintain GPL-3.0 and applicable attribution.

Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing messages or storage. Content observations have not yet moved to the per-tab store; completing that migration is a prerequisite for old-record cleanup.

The [development plan](docs/development/DAILY_PLAN.md) contains proposed tasks; the [progress log](docs/development/PROGRESS.md) records actual status. A day number is not proof that its acceptance checks passed. Do not combine later planned features into a documentation or presentation change.

## Reporting problems

Use [GitHub issues](https://github.com/ujjwalk1/PrivacyMonitor/issues). Include Firefox/OS version, installation method, a minimal synthetic reproduction, expected behavior, actual behavior and any redacted console errors. Never include real passwords or sensitive browsing records.
