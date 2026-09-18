# Changelog

All notable changes to `@sukoyaka-dopeness/e2r-validator` are documented here.

The package follows Semantic Versioning. Documentation-only changes do not
require a version change under the project release policy.

## Unreleased

### Added

- Added exact-version, declaration-gated read-only validation for the History
  `2.0.0` candidate and Relative Time draft `0.1.0`.
- Added bounded temporal diagnostics and separate Derived evidence without
  mutating input Datasets.

### Changed

- Documented the distinction between structural errors, temporal-conflict or
  unsupported warnings, and Derived evidence.

These changes are unreleased. They do not promote either candidate to Stable,
authorize application writers or migration, or determine the next package
version. A release requires the normal version/changelog/package-inspection
checkpoint and explicit release authorization.

## 0.4.0 - 2026-08-30

### Added

- Added read-only Presentation Extension Draft `0.1.0` validation.
- Added known Relation `arrowDisplay` and `lineStyle` token handling.
- Added orphan Relation-ID warnings and exact Presentation Specification
  local support.

### Changed

- Unknown Presentation tokens and fields remain forward-compatible.
- Unsupported Presentation versions are not validated with `0.1.0` semantics.
- Presentation records are validated without automatic repair.
- Exact declared Presentation `0.1.0` no longer incorrectly reports
  `specification_unavailable`.

## 0.3.0 - 2026-08-14

### Added

- Added declaration-gated read-only support for Names Draft `0.1.0`.
- Added Names local structural diagnostics and Dataset-wide recognized
  expression-ID uniqueness diagnostics.
- Added stable `names_draft_*` diagnostic codes with exact-version activation
  and version-unspecified/unsupported behavior.

### Changed

- Documented Names Draft validation boundaries, deterministic diagnostics, and
  the separation from future Stable Names, writers, migration, and repair.

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
