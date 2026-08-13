# e2r-validator

Validator for E2R Datasets.

This repository is the implementation home for a UI-independent E2R validator.
It will validate the E2R Core and supported official Extensions while preserving
forward compatibility with unknown fields and Extensions.

## Initial scope

- E2R Core Dataset structure and Dataset-level semantic rules
- Metadata Extension `1.0.0`
- History Extension `1.0.0`
- Specification Extension draft `0.1.0` declarations and dependencies
- Coordinate interoperability prototype `0.1.0` structure and references
- Coordinate Extension draft `0.1.0` read-only structure and references
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

The validator does not edit or repair input Datasets.

## Status

The diagnostic contract is defined in `docs/diagnostic-contract.md`.
Core, Metadata, and History validation are implemented for the initial MVP.
Published version `0.2.0` also supports Specification draft `0.1.0`, the
unregistered Coordinate prototype `0.1.0`, and the distinct Coordinate draft
`0.1.0`. Implementation support does not make any candidate Stable or
authorize application writes or automatic migration.

See [`docs/release-process.md`](docs/release-process.md) for the tag-based
npm publication process and [`CHANGELOG.md`](CHANGELOG.md) for release notes.
