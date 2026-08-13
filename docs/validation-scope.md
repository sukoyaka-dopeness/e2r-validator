# Validation Scope

The implementation targets Core 1.0, Metadata Extension `1.0.0`, History
Extension `1.0.0`, Specification Extension draft `0.1.0`, and Coordinate
interoperability prototype `0.1.0`. It also has read-only support for the
distinct Coordinate Extension draft `0.1.0`. JSON syntax, structural
constraints, Extension conformance, and local implementation support are
separate validation layers.

Unknown Core fields and unknown Extensions are forward-compatible. They may be
reported as warnings, but their presence alone does not invalidate a Dataset.

The validator reports stable codes, JSON Pointer paths, severity, and related
IDs where applicable. It does not edit input data.

Specification interoperability behavior is defined in
`docs/specification-interoperability.md`.

Coordinate support is deliberately non-Stable. Prototype and Draft identities
are validated independently. Draft validation bootstraps from Dataset
`specVersion`, applies `0.1.0` rules only to that exact supported version, and
checks Dataset-level Spaces, Component definitions and external bindings,
Entity/Event values, references, scope, bounds, and supported Specification
agreement. It performs no network access, coordinate transformation,
normalization, migration, repair, or write-compatibility authorization.
