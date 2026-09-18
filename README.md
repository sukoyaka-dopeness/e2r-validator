# e2r-validator

Validator for E2R Datasets.

This repository is the implementation home for a UI-independent E2R validator.
It will validate the E2R Core and supported official Extensions while preserving
forward compatibility with unknown fields and Extensions.

## Initial scope

- E2R Core Dataset structure and Dataset-level semantic rules
- Metadata Extension `1.0.0`
- History Extension `1.0.0`
- History Extension `2.0.0` candidate structural validation and bounded
  temporal diagnostics
- Relative Time Extension draft `0.1.0` Relation validation and bounded,
  read-only `before`/`within` diagnostics
- Specification Extension draft `0.1.0` declarations and dependencies
- Coordinate interoperability prototype `0.1.0` structure and references
- Coordinate Extension draft `0.1.0` read-only structure and references
- Names Extension draft `0.1.0` declaration-gated local structure and
  Dataset-wide recognized expression-ID uniqueness
- Presentation Extension draft `0.1.0` read-only Relation arrow display,
  line style, and orphan semantic warnings
- stable diagnostic codes, JSON Pointer paths, and related IDs
- read-only CLI validation

## Usage

Run the CLI against an E2R JSON file:

```powershell
node src/cli.js path/to/dataset.json
```

The command writes a machine-readable JSON result to standard output.

```text
0  valid Dataset (warnings are allowed)
1  parsed Dataset with validation errors
2  input, JSON syntax, or command-line error
```

Run the complete local verification suite:

```powershell
npm test
npm run validate:fixtures
```

The fixture suite reads examples from the sibling `e2r-spec` repository.

The same validator is available as a library:

```js
import { validateDataset } from "@sukoyaka-dopeness/e2r-validator";

const result = validateDataset(dataset);
```

The E2R specification repository remains the source of truth:

`../e2r-spec`

The validator does not edit or repair input Datasets. Presentation validation
is read-only and does not auto-repair Relation records; unknown Presentation
tokens and fields remain preservable for forward compatibility.

## Status

The diagnostic contract is defined in `docs/diagnostic-contract.md`.
Core, Metadata, and History validation are implemented for the initial MVP.
Published version `0.4.0` also supports Specification draft `0.1.0`, the
unregistered Coordinate prototype `0.1.0`, and the distinct Coordinate draft
`0.1.0`. The current implementation also supports Presentation Draft `0.1.0`
and exact Names draft `0.1.0` when selected by a valid exact Specification declaration. Implementation
support does not make any candidate Stable or authorize application writes or
automatic migration. Candidate temporal support is exact-version and
declaration-gated; unsupported versions, Features, and Calendars remain
uninterpreted. Derived temporal evidence is returned separately and never
written back into the Dataset.

See [`docs/release-process.md`](docs/release-process.md) for the tag-based
npm publication process and [`CHANGELOG.md`](CHANGELOG.md) for release notes.
