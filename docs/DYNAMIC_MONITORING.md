# Dynamic form and password monitoring (D12)

D12's implementation is present; native Firefox acceptance remains pending.
It uses D11's destination resolver and preserves D10's private/unknown-context
no-write guard. D09's content-record migration and D10's historical cleanup remain
unfinished; this slice does not resolve their isolation/retention limitations.

## Changes and bounds

The observer now watches the document, including the head, so base changes and body
replacement are visible. Additions, removals, and moves trigger a shared scan, as
do relevant `action`, `method`, `formaction`, `formmethod`, `form`, `type`,
`disabled`, `id`, and base `href` changes. The scan reevaluates native control
ownership and disabled state, updates counts, and adds/removes password warnings.
Removing a warning externally recreates it if the HTTP password route still exists.

Observer callbacks perform no subtree searches and retain no mutation records or
changed nodes. They examine at most 64 records; a larger batch conservatively
schedules one scan. Automatic work uses one 500 ms timer, which later mutations
do not postpone. There is at most one scheduled/running automatic scan; changes
during a slow write set one follow-up flag, rather than adding work per mutation.
Explicit refresh consumes pending changes when its scan starts.

Only synchronous collection and warning changes temporarily disconnect the
observer. That full scan covers the current DOM, superseding queued records.
Observation resumes in `finally`, before awaiting storage, so changes during a
write are still detected. This prevents our warning updates from triggering more
scans. Password-indicator content changes are ignored; removing the indicator
itself still schedules recovery.

Password feedback uses three shared document listeners in capture phase, replacing
the per-field listeners and strong Set. Inserted/reinserted fields need no registry.
At most one active field and one 300 ms feedback timer are held. Blur/switch cancels
pending feedback; a removed or retyped active field is cleared on the next scan or
feedback render. Removed indicator references are cleared/recreated as needed.
No password value or input event is retained by a timer, stored, or logged. The
strength heuristic is unchanged. Empty fields no longer display stale feedback.

These are bounds on scheduling and observer bookkeeping, not a constant-time DOM
scan. Each scan still costs work proportional to the accessible document. Unrelated
child-list changes may conservatively trigger a scan; continuously changing pages
can cause up to about two automatic scans per second after writes complete.
Background-tab timer throttling and slow storage can delay results. Shadow trees,
unscanned frames, programmatic value changes without input events, and JavaScript
network submissions remain outside this coverage. The popup is not a live view:
reopen it or press Refresh to read the latest findings. Normal-tab legacy rows can
still be shared/stale until D09's remaining migration is complete.

API references checked 2026-10-21: [MutationObserver.observe](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe)
documents subtree/attribute filtering;
[MutationObserver.disconnect](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect)
documents discarding pending records and resuming observation.

## Verification and pending native checks

`tests/dynamic-content.test.mjs` uses a modeled DOM, observer delivery, and controlled
clock to exercise additions/removals, attributes, external ownership, head/base
changes, warning repair, feedback lifecycle/body replacement, a 2,000-change burst,
slow/failed writes, explicit refresh, irrelevant attributes, and private no-write
behavior. It checks scan/timer counts and omitted password values. It does not
prove Firefox event semantics, native garbage collection, or real-page performance.

Next exact action: reload the root manifest in a disposable Firefox profile with
breach lookup off, run `node tests/popup-preview.mjs`, and open
`http://127.0.0.1:4179/dynamic-forms.html`. Reload the page after extension reload.
Do these without pressing popup Refresh until after observing the automatic result:

1. Add a password field: no warning with HTTPS action. Toggle action to HTTP:
   one warning appears after roughly 500 ms. Reopen the popup: counts are 1/1.
2. Remove the field or toggle its type to text: the warning disappears, counts
   become 1/0. Add/retype to password: the warning returns without duplication.
3. Toggle the base: the form becomes relative; HTTP base warns and HTTPS base
   clears it. Change action, method, submitter overrides, disabled fieldsets, and
   external ownership on the [D11 fixture](FORM_DESTINATIONS.md) as well.
4. Remove the warning: exactly one returns. Run the 2,000-change burst: final
   action is HTTP, one warning remains, and the console stays clear. Confirm that
   scans stop after the page settles; profile large real pages before release.
5. Remove/reinsert the form: counts clear/return. Type only synthetic text and
   switch between two password fields; feedback must follow the current field.
   Remove/retype a focused field through developer tools; feedback must clear.
   Remove the indicator or replace the body and verify recovery/no stale feedback.
6. Repeat removals/reinsertions and inspect Firefox memory after garbage collection:
   the extension must not accumulate detached fields. Repeat in a private window:
   local warnings still update, and no persistent scan rows are written.

Inspect content/popup/background consoles, record Firefox version and exact outcomes
in PROGRESS.md, and stop the server. Carry earlier browser checks forward. Do not
mark D12 complete while these checks are pending; stop before D13.
