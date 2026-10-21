# Popup accessibility — D14

Implemented 2026-10-21. **Acceptance pending in installed Firefox with a screen reader.**
This changes the existing popup, without redesigning it or changing analysis,
scoring, permissions, storage, or network behavior. D13 site exclusions remain
unfinished and are independent of this presentation work.

## Implemented behavior

- English document language, page title, one main heading and six section headings.
- Native buttons have explicit text names. Tab order is Enable breach lookup,
  Disable breach lookup, Refresh Analysis, On-page settings; Shift+Tab reverses it.
  No positive tabindex, custom keyboard shortcuts, or scripted focus movement.
- Unavailable actions use `aria-disabled` and remain focusable. This preserves
  focus when asynchronous operations change availability and lets users discover
  the controls and their status. Both consent and refresh handlers block unavailable
  activation, including repeated clicks/Enter/Space during pending operations.
  Consent status and analysis status describe the relevant controls. Permission
  requests still run directly from the user gesture, before the first await.
- Every button has a 3px blue keyboard focus outline with a 2px offset. Existing
  green/amber text is darker to meet 4.5:1 against white. Focus contrast exceeds
  3:1 against the adjacent white/light-gray surfaces. No opacity reduction is used
  for unavailable refresh text. System-styled consent controls retain native styles.
- The score graphic has a complete accessible name: value out of 100 and rating,
  or an explicit loading/incomplete/unavailable/unsupported state with no score.
  Its description explains the safety limitation and separation from breaches.
  Decorative SVG content, heading icons, and spinners are hidden from assistive
  technology. Text labels still express state independently of color.
- Persistent polite, atomic live regions expose overall analysis, consent, breach
  summaries, and settings-opening errors. Successful analysis includes the numeric
  score and rating. Breach summaries distinguish empty/results/cache/errors without
  announcing every card. Resets clear old summaries; existing request-version and
  consent guards also prevent stale announcements. Result updates do not move focus.
- Reduced-motion preferences suppress spinner animation and score/button transitions.

## Verification performed

- Eight dependency-free checks in `tests/popup-accessibility.test.mjs` cover document
  semantics/control order, declared CSS contrast (including header opacity and
  score colors), score names and reset states, live-region markup and outcome text,
  superseded responses, duplicate/unavailable activation, and non-color labels.
  Existing consent/refresh tests now assert ARIA availability rather than native
  `disabled`, which intentionally would remove buttons from the tab order.
- **161/161 automated tests pass.** Local lint and the 13-file package/source hash
  comparison pass. Tests use synthetic observations and mocked services.
- The in-app browser loaded the local `consent-off` fixture. Tab/Shift+Tab visited
  all four controls in order with the 3px/2px outline. Enter enabled mocked consent;
  Space disabled it. Focus stayed on the initiating control even after it became
  unavailable. Enter on Refresh produced the fixture's expected unavailable state
  and retained focus. The accessibility tree exposed headings, score name, and
  disabled states; a screenshot showed the refresh outline without clipping.
- These preview checks use browser API mocks and are **not installed-Firefox or
  spoken screen-reader verification**. No real consent or external lookup occurred.

## Native acceptance still pending

Load the working folder using [the development guide](DEVELOPING.md). Record the
Firefox version, OS, screen-reader name/version, case and exact result here.

1. Open the installed popup on an ordinary HTTPS page with local observations.
   Use only Tab/Shift+Tab, Enter and Space. Confirm all four buttons remain reachable,
   outlines are visible/unclipped, unavailable actions do nothing, and focus stays
   on the initiating control through refresh and consent success/denial/failure.
   Check Firefox's actual consent prompt and return of focus, not just the mock.
2. With NVDA or another Firefox-compatible screen reader, read the title, headings,
   score value/rating/limitation and button names/descriptions. Confirm unavailable
   actions are announced as such and decorative graphics do not add noise.
3. Listen to loading → ready, incomplete, unsupported, restricted-page/refresh
   failure, consent on/off/error, and breach empty/results/cached/error/timeout.
   Announcements should be polite, understandable, current, and not duplicated
   excessively. Refresh must clear a previous score; late results must not announce
   an old page. Verify the settings-opening failure is announced without focus loss.
4. Inspect the actual Firefox popup at the user's zoom/theme and OS high-contrast
   settings; ensure focus is visible while scrolling, text is readable, and native
   consent buttons remain distinguishable. Enable reduced motion and confirm the
   spinner/ring do not animate while loading text remains available.
5. Record failures precisely and fix only D14 regressions before marking D14 done.
   Keep D09/D10/D13 remainders and earlier native checks open. Do not start D15 as
   part of this acceptance pass.

The contrast checks measure declared author colors; they do not certify every
browser/OS theme, native control, zoom, or assistive-technology combination.

## References checked

- [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  — normal text threshold and inactive-control exceptions.
- [W3C: Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
  — visible keyboard focus.
- [W3C: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
  — announce results/status without moving focus.
- [WAI-ARIA APG: Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
  — native semantics and real browser/assistive-technology testing.
