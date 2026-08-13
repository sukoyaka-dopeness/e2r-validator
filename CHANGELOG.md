# Changelog

All notable changes to `@sukoyaka-dopeness/e2r-validator` are documented here.

The package follows Semantic Versioning. Documentation-only changes do not
require a version change under the project release policy.

## Unreleased

## 0.2.0 - 2026-08-13

### Added

- Documented the release process and tag-based publication rules.
- Added Specification Extension draft `0.1.0` declaration, Feature,
  dependency, lifecycle, and evolution validation.
- Added distinct warnings for unspecified, unsupported, and locally
  unavailable Extension specification versions.
- Added specification interoperability fixtures from the sibling
  `e2r-spec` repository.
- Added experimental Coordinate prototype `0.1.0` validation for Dataset
  Spaces, Component-keyed Entity/Event values, partial and multiple-Space
  Coordinates, external references, and declaration-version agreement.
- Added conflict diagnostics for duplicate Space definitions and duplicate
  per-object Coordinates in one Space.
- Added read-only Coordinate Extension draft `0.1.0` validation under its
  distinct Draft identifier, including exact-version bootstrap, Space and
  Component references, external Component bindings, Specification agreement,
  and all 5 valid and 18 invalid specification fixtures.
- Added unsupported-version coverage proving that later Coordinate draft
  payloads are preserved without applying `0.1.0` rules.

### Changed

- Extension validation now visits Dataset, Entity, Event, and Relation
  Extension containers.
- The authority-qualified Coordinate prototype is locally supported for
  experimental validation without being registered as Stable.
- The Coordinate Prototype and Draft identities are recognized and validated
  independently; Validator performs no migration between them.

Published successfully from tag `v0.2.0` through npm Trusted Publishing.
Post-release verification confirmed npm `latest`, clean installation, CLI
version output, and Coordinate Draft library diagnostics.

## 0.1.3 - 2026-08-08

The initial Validator MVP was published successfully through GitHub Actions
Trusted Publishing from tag `v0.1.3` (Release #3, commit `7c4e5c2`).

Post-release verification completed:

- npm `latest` points to `0.1.3`;
- the public package can be installed in a clean temporary directory;
- `e2r-validator --version` reports `0.1.3`; and
- the published CLI validates the E2R specification examples successfully.
