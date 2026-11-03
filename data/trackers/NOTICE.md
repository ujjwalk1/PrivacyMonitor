# EasyPrivacy domain snapshot

Source attribution: **The EasyList authors (https://easylist.to/)**.
This directory derives from EasyPrivacy's general tracking-server file, maintained
in the [official EasyList repository](https://github.com/easylist/easylist).
The [upstream license statement](https://easylist.to/pages/licence.html) offers
GPL version 3 or later, or CC BY-SA version 3 or later. This copy uses the
**GPL-3.0-or-later** option; the complete GPL v3 text is in [LICENSE](../../LICENSE).
No Disconnect or DuckDuckGo data is included.

## Pinned source and changes

- Upstream revision: `9cfb8e34e18831e751641a37ed6ec8400ffc9218`.
- [Exact source file](https://github.com/easylist/easylist/blob/9cfb8e34e18831e751641a37ed6ec8400ffc9218/easyprivacy/easyprivacy_trackingservers_general.txt).
- Retrieved **2026-11-04**. This is the retrieval date, not a claimed release date.
- [Machine-readable provenance](provenance.json) records URL, revision, byte size,
  license and SHA-256. [upstream.txt](upstream.txt) preserves the original
  **9,571 bytes**, protected against Git newline conversion.
- Source SHA-256: `4cb9df2a5a02e7e629f94ea4e36785a1051a939b82b563d5290d6db2f28c0dbd`.
- Privacy Monitor transformation, 2026-11-04: extract only plain
  `||hostname^` rules whose hostname is canonical and has a known PSL
  registrable boundary; retain the original source line; sort by hostname.
  The generated [domains.json](domains.json) contains **542 entries / 38,245
  bytes**. Comments are not classification metadata.
- [Extraction report](extraction-report.json) accounts for five omissions: two
  IP rules, one wildcard rule, and two image-only rules. No rule modifiers are
  stripped to broaden their meaning.

This is a deliberately narrow subset, **not the complete EasyPrivacy list or a
filter engine**. Other EasyPrivacy files, exceptions and contextual conditions
are not evaluated. A match is evidence of membership in this source subset;
it cannot predict the result of a complete blocker or establish tracking on a
particular page. Owner and category are unavailable. Do not derive either from
a hostname or from broad list-level policy.

## Reproducible update procedure

Updates are manual, reviewed repository changes; there is no runtime updater.

1. Select a specific 40-character commit in the official repository. Review the
   license statement and the source diff before accepting a new snapshot.
2. Download only the data file at that immutable revision, replacing
   `upstream.txt` with its exact bytes. Update the revision, corresponding URL,
   actual retrieval date, byte size and SHA-256 in `provenance.json`. A locally
   computed hash records identity; it is not an upstream signature.
3. From the repository root run `node tools/build-tracker-data.mjs`.
   Generation is offline, verifies source bytes against provenance and uses
   the pinned D21 parser. It writes only the two generated JSON files.
4. Review additions/removals, every excluded rule and any changed PSL behavior.
   Unsupported syntax stays excluded; do not automatically expand the grammar.
   Update this notice's sizes/counts and explicitly pinned tests.
5. Run `node tools/build-tracker-data.mjs --check`,
   `node --test tests/tracker-classifier.test.mjs`, and the existing full
   test/lint/documentation checks. Keep provenance, original source and generated
   output together so reviewers can reproduce the transformation.
6. Before shipping, complete the integration/browser checks in the
   [adapter contract](../../docs/TRACKER_CLASSIFICATION.md). Include this notice,
   GPL text, upstream source, provenance and D21 dependency notices in the
   distribution/source-review materials. None is currently added to the beta ZIP.

Retain the prior Git revision to roll back a bad snapshot. Do not fetch or execute
remote JavaScript to update data.
