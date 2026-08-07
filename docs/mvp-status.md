# CLI Validator MVP Status

The initial CLI Validator MVP is complete for its defined scope.

Implemented:

- Core Dataset structure and Dataset-level semantic validation
- Metadata Extension v1 validation
- History Extension v1 structural validation
- Gregorian month/day and leap-year validation for complete dates
- unknown Extension warnings with forward-compatible acceptance
- stable diagnostic severity, code, JSON Pointer path, and related IDs
- CLI input handling and exit codes 0, 1, and 2
- automated tests for the implementation
- automated validation of the sibling `e2r-spec` examples and invalid fixtures
- GitHub Actions verification on pushes and pull requests

Outside this MVP:

- full IANA Time Zone database resolution
- daylight-saving ambiguity and nonexistent-local-time analysis
- automatic repair or normalization
- GUI, editor behavior, or application-specific policies

Those concerns can be added as separate validation layers without changing the
basic diagnostic contract.
