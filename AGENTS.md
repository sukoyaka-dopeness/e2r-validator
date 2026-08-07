# e2r-validator Development Guidance

This repository implements executable validation for the E2R specification.
The source of truth is the sibling `../e2r-spec` repository.

Before changing validation behavior, read the relevant Core and Extension
specifications and preserve their distinction between errors, warnings, and
unknown Extensions.

The validator is UI-independent and read-only. It must not silently rewrite,
repair, or normalize input Datasets.

Do not commit or push unless explicitly requested.
