# Firefox compatibility and permissions

The manifest defines the extension’s supported Firefox version, identity and access to websites. The current permission changes are implemented; native compatibility validation and warning review remain open. The extension remains an unsigned development beta.

## Identity and compatibility

- Retain Manifest V2 and the existing persistent background script order. The current popup calls `runtime.getBackgroundPage`; this is not an MV3 migration.
- Preserve `privacy-monitor@example.com` as the stable add-on ID. An email-shaped identifier is valid and is not a contact address or evidence of registration. Changing it would introduce a different extension identity. AMO uniqueness/signing has not been verified.
- Declare `browser_specific_settings.gecko.strict_min_version: "142.0"`. Mozilla documents built-in data consent from desktop 140 and Android 142. A trial desktop floor of 140 produced an Android compatibility warning from the validator even without an Android target. The conservative shared floor of 142 clears that warning without adding `gecko_android` or claiming Android support.
- Firefox desktop is the supported target. There is no maximum-version pin. The declared minimum is an API/validator decision, not a tested browser-version claim. Native testing on 142 and the installed current Firefox is pending.

Sources: [Firefox built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/), [manifest identity and version fields](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings), and [tab permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs).

## Permission inventory

| Declaration | Code and purpose |
| --- | --- |
| `storage` | `settings.js`, `options.js`, `content-script.js` and `popup.js` read/write display preferences and legacy normal-context content summaries. This permission does not provide cookie API access. |
| `webRequest` | `background.js` observes main-frame request/response/redirect/completion events and header presence. Listeners do not request blocking access. |
| `webNavigation` | `background.js` starts/resets navigation records and correlates committed pages with response evidence. |
| `http://*/*`, `https://*/*` | Allows header observation and supported-page tab URL access; also covers the optional background HIBP request. Content scripts now explicitly match the same two schemes. |
| Required data collection: `none`; optional: `browsingActivity` | `popup.js` requests/removes Firefox-held consent; `breach-service.js` checks it before sending a normal tab's hostname. This consent is separate from website host access. |

Removed declarations:

- `cookies`: no cookies API is called. Counts still use page-visible `document.cookie`, excluding HttpOnly cookies.
- `scripting`: no scripting API is called. `refreshData` messages the existing content script through `tabs.sendMessage`; `analyzePage` performs the scan.
- `activeTab`: supported HTTP/HTTPS URLs are already covered by host permissions. Firefox has allowed tab URL access through matching host permissions since version 86. Querying tab IDs, messaging content scripts and listening for tab removal do not require a general `tabs` declaration. No replacement permission is added.

`runtime` messaging/options/background access, permission management, and `extension.inIncognitoContext` need no additional named permission here. There is no request for `webRequestBlocking`, `history`, `downloads`, or a future cookie inspector.

## Why broad access remains

Monitoring is continuous: content scripts run on permitted HTTP/HTTPS page loads and header listeners run while the popup is closed. Opening the popup cannot reconstruct a response that was never captured. The all-websites access prompt is therefore expected; this is not an on-demand-only extension. Display preferences hide existing feedback but do not revoke host access or exclude a site.

The old `<all_urls>` content match also covered unsupported schemes. Narrowing it to HTTP/HTTPS aligns injection with the popup's supported scope and avoids injecting into local-file pages. Firefox still restricts privileged pages and certain domains. If a tab URL is withheld, the popup uses its existing Unavailable state; a known non-HTTP URL uses Unsupported. Neither produces a successful score. Native restricted-page behavior after removing `activeTab` still needs checking.

## Verification and remaining warnings

On 2026-10-23, Node 24.22.1, Mozilla `web-ext` 10.8.0 with `addons-linter` 10.14.0:

- Existing suite: **162 passed, zero failures/skips**. These use mocked browser APIs and cannot establish permission enforcement.
- Local syntax/reference lint passes. Package contains **16 entries**, each byte-verified by SHA-256 against source.
- Mozilla lint of the unpacked package: **0 errors, 0 notices, 7 warnings**; metadata recognizes minimum 142.0 and the preserved ID. Normal lint exits successfully. Strict `--warnings-as-errors` acceptance is not clean.
- The same seven warning locations occur in the untouched starting commit `b6c5e1e`; D16 adds no warnings. They are `UNSAFE_VAR_ASSIGNMENT` at `content-script.js:101` and `popup.js:227,286,297,311,318,325`.
- The warnings concern HTML strings in `renderPasswordFeedback`, `renderHeaders`, `renderBreaches` and `renderForms`. Some values are fixed labels, validated counts or escaped service text. A warning alone does not establish an exploit, and passing ordinary lint does not resolve it. Dedicated rendering review/remediation remains pending; this manifest slice does not suppress warnings or rewrite the UI.

The validator was installed in a temporary tool directory with install scripts disabled. No dependency was added to the extension or repository.

## Repeat Mozilla validation

With Node/npm available, run from the repository root in PowerShell. This stages only the verified package, excluding documentation/tests from validator input. The strict command currently exits nonzero for the seven recorded warnings; omit `--warnings-as-errors` only to reproduce normal lint's exit status, not to claim warning-free acceptance.

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
if ($LASTEXITCODE -ne 0) { throw 'Package verification failed' }
$d16Stage = Join-Path $env:TEMP ('privacy-monitor-lint-' + [guid]::NewGuid().ToString('N'))
Expand-Archive -LiteralPath dist/privacy-monitor-1.1.zip -DestinationPath $d16Stage
npx --yes web-ext@10.8.0 lint --source-dir $d16Stage --no-config-discovery --boring --warnings-as-errors
~~~

See [Mozilla's command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/). This performs validation, not signing or submission.

## Pending browser acceptance

1. In disposable desktop Firefox profiles, test the declared minimum 142 and the current installed version; record exact versions. Load this checkout's manifest, confirm the same ID and no startup errors. Older-than-minimum rejection is also unverified.
2. Start `node tests/popup-preview.mjs`, load `http://127.0.0.1:4179/dynamic-forms.html`, reload after installation, and open the actual extension popup. Confirm tab/domain access, local counts/headers, dynamic form changes and Refresh Analysis without cookies/scripting/activeTab grants. Also test an ordinary HTTPS page.
3. Confirm no injection on a local-file page; restricted/withheld pages must show Unsupported or Unavailable, never a score based on missing evidence.
4. Verify settings still persist, initial breach consent is off, and native grant/revoke works. Use dummy inputs; service unavailability must remain distinct from an empty result.
5. Record results in [verification](development/VERIFICATION.md). Review the seven rendering warnings before claiming strict validator acceptance. Earlier D09/D10/D13 and native acceptance gaps remain separate; do not begin D17 in this session.
