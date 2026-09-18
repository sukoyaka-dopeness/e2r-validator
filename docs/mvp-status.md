# CLI Validator MVP Status

The initial CLI Validator MVP is complete for its defined scope.

Post-MVP development includes Specification Extension draft `0.1.0`
interoperability diagnostics, Coordinate interoperability prototype `0.1.0`,
Coordinate Extension draft `0.1.0`, Names Extension draft `0.1.0`, Presentation
Extension draft `0.1.0`, History `2.0.0` candidate support, and Relative Time
draft `0.1.0` support. Candidate and Draft support is exact-version,
declaration-gated, read-only behavior; it does not make any candidate
Extension Stable or authorize application migration.

Implemented:

- Core Dataset structure and Dataset-level semantic validation
- Metadata Extension v1 validation
- History Extension v1 structural validation
- History `2.0.0` candidate structural validation and bounded temporal diagnostics
- Relative Time draft `0.1.0` Relation validation and bounded Derived evidence
- Gregorian month/day and leap-year validation for complete dates
- unknown Extension warnings with forward-compatible acceptance
- stable diagnostic severity, code, JSON Pointer path, and related IDs
- CLI input handling and exit codes 0, 1, and 2
- automated tests for the implementation
- automated validation of the sibling `e2r-spec` examples and invalid fixtures
- GitHub Actions verification on pushes and pull requests

## Published status

Version `0.4.0` is publicly published as
`@sukoyaka-dopeness/e2r-validator@0.4.0` and is the npm `latest` version.

Prepared package source version `0.5.0` contains the candidate temporal
support described above. It has not been published in this checkpoint.

The package was published from tag `v0.4.0` by the tag-controlled GitHub
Actions release workflow using npm Trusted Publishing. The release process
also verifies the package version, the matching CHANGELOG entry, the complete
test and fixture suite, and the package contents before publishing.

Post-release verification confirmed that the published package can be
installed in a clean temporary directory, reports `e2r-validator 0.4.0`, and
returns the expected Coordinate Draft diagnostic through the public library
API.

Outside this MVP:

- full IANA Time Zone database resolution
- daylight-saving ambiguity and nonexistent-local-time analysis
- automatic repair or normalization
- GUI, editor behavior, or application-specific policies

Those concerns can be added as separate validation layers without changing the
basic diagnostic contract.
