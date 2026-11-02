# tldts dependency provenance

This directory is a **D21 development foundation**, excluded from the current
manifest and runtime-package allowlist. No dependency install scripts were run.

- Upstream: [remusao/tldts](https://github.com/remusao/tldts).
- Version: **7.4.19**, retrieved **2026-11-02**.
- Published package: [npm registry metadata](https://registry.npmjs.org/tldts/7.4.19).
- Source revision reported by that package: `4ecabd1690a72c8e30dbaeb24502f7355908830b`.
- Archive: `https://registry.npmjs.org/tldts/-/tldts-7.4.19.tgz`.
- License: upstream [MIT notice](LICENSE), retained verbatim; the project GPL
  license is unchanged.
- The embedded suffix data derives from the community-maintained
  [Public Suffix List](https://publicsuffix.org/). This is not a tracker dataset
  or a company-ownership database.

The downloaded archive's SHA-512 was verified against the registry integrity
value before extraction. Exact upstream paths, bytes and SHA-256 values of the
three copied files are recorded in [provenance.json](provenance.json).
The UMD bundle and source map are **unmodified**. The map contains 13 source
entries with their complete source text. Source files remain reviewable without
reconstructing them from minified JavaScript; do not omit these review materials
when planning a future distributable build.

## Updating deliberately

1. Inspect a specific newer release in the upstream repository and npm registry.
   Review code, license and PSL changes; do not fetch a floating latest version at
   extension startup or during tests.
2. Download that exact package tarball to a temporary directory and verify its
   SHA-512 against the published registry integrity. Extract only the selected
   UMD bundle, its source map and LICENSE; do not run lifecycle scripts.
3. Replace those three files without editing their contents. Update the pinned
   version, source revision, retrieval date, integrity, file sizes and SHA-256
   values in provenance.json.
4. Update the pinned-version assertion, run the domain fixtures and the full
   suite, and review changed classifications rather than automatically accepting
   them. Check that every source-map entry still includes readable source.
5. If later packaged, recheck notices, source submission, manifest load order,
   package integrity and native Firefox behavior as part of that integration.

A retrieval date is not a claim that all suffix rules were published on that
date. There is no independent PSL commit identifier in this local provenance;
the npm release and archive integrity pin the exact embedded snapshot.

Repository .gitattributes disables newline conversion for the upstream bundle, source map and license, so integrity checks remain valid after Windows checkouts.
