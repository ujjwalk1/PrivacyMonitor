# Roadmap

This page describes future work, not shipped features or promised dates. The [detailed plan](development/DAILY_PLAN.md) remains available for development; [progress](development/PROGRESS.md) and [verification](development/VERIFICATION.md) take precedence over day labels.

## Finish the current milestone

1. Rehearse the existing extension in Firefox and record real install, popup, form, consent, theme, keyboard and zoom observations.
2. Finish D09: bind content observations and refresh to background tab/navigation identity; migrate remaining readers and remove legacy writes.
3. Finish D10 after that migration: remove only obsolete scan rows, preserve preferences and verify retry/idempotence/private-session behavior.
4. Finish D13: introduce one exclusion policy across scanning, headers, password UI, breach work and popup readers, including cancellation and stale-result rejection.
5. Complete outstanding native acceptance through D15, including screen-reader and restart checks.

## Later planned beta work

D16–D20 cover manifest/permission compatibility, release documentation, a Firefox acceptance matrix, prioritized regression repairs and submission preparation. This presentation update improves documentation at the user's request; it does not mark D17 complete or start a release submission.

## Longer-term possibilities

After the stable beta: public-suffix-aware domain matching, licensed tracker classification, bounded request observations, a permission-aware cookie inspector, header-value analysis, a stronger local password estimator, mixed-content/TLS details and performance measurement.

Blocking, fingerprinting indicators, history and advanced dashboards are optional later tracks. None are advertised as existing capabilities. Publishing, signing and production-readiness claims require separate evidence and release work.
