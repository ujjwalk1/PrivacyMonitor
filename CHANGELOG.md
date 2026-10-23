# Changelog

This records source changes, not signed releases. The manifest remains version 1.1. Commit subjects and code were checked against the repository history; multiple development days sometimes share a commit.

## Unreleased — development beta

### Firefox compatibility and permissions

- Set the minimum Firefox desktop version to 142.0 and retained the existing add-on identity.
- Removed unused `cookies` and `scripting` permissions and redundant `activeTab` access.
- Restricted content-script injection to supported HTTP/HTTPS pages.
- Documented continuous website monitoring and the remaining validation work. Mozilla validation reports no errors and seven inherited rendering warnings; native Firefox checks remain pending.

### Repository presentation

- Added a product-focused README, architecture/privacy references, contributor guidance and a separate roadmap.
- Moved internal plans and progress into `docs/development/`.
- Added presentation briefing, source walkthrough and demonstration instructions under `docs/presentation/`, excluded from the extension package.
- Preserved runtime files, manifest version, license and existing history.

### Implemented since the reviewed v1.1 baseline

- Corrected local scoring to reach 100 with complete best-case evidence; removed cookie-count, script-count and historical-breach penalties.
- Added explicit missing, unavailable, unsupported and loading states.
- Distinguished breach failures from valid empty results; added an eight-second deadline, opt-in consent, bounded transient caching and rate-limit backoff.
- Added per-tab analysis records and navigation-scoped header capture; headers no longer create new persistent hostname rows.
- Unified startup and refresh scans, awaited scan completion and retained/repaired form warnings.
- Omitted full URLs from new content summaries and blocked new private/unknown-context persistence and breach lookups.
- Corrected form destination resolution, including base URLs and submitter overrides; added coalesced updates for dynamic forms and password fields.
- Added persistent display settings, popup keyboard/status improvements, light/dark presentation, wrapping and local SVG icons.
- Added dependency-free tests, syntax/reference checks and a verified package allowlist.

### Still outstanding

D09 content-record migration, D10 old-record cleanup and D13 site exclusions remain partial. Native Firefox integration, consent/restart, accessibility, theme and zoom acceptance remain pending. These changes do not represent completed release acceptance.

## Reviewed v1.1 baseline

[8c3b240](https://github.com/ujjwalk1/PrivacyMonitor/commit/8c3b240cfa46a57e373a5ece8325a84b4fc66486) is the verified ancestor used for comparison. Its tree already contained password feedback, page counts, header capture, insecure-form warnings, breach lookup and a sectioned popup. Later work improved these existing capabilities rather than introducing all of them from scratch.

See the [milestone evidence and before/after comparison](docs/presentation/BRIEFING.md) for commit mapping and remaining uncertainty.
