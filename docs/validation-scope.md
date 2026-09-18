# Validation Scope

The implementation targets Core 1.0, Metadata Extension `1.0.0`, and stable
History Extension `1.0.0`. It also provides exact-version, declaration-gated,
read-only support for the History `2.0.0` candidate and Relative Time draft
`0.1.0`, plus Specification Extension draft `0.1.0`, Coordinate
interoperability prototype `0.1.0`, and the distinct Coordinate Extension
draft `0.1.0`. JSON syntax, structural constraints, Extension conformance,
and local implementation support are separate validation layers.

It also has read-only support for Names Extension draft `0.1.0` at exact
identifier `draft.github.sukoyaka-dopeness.names`. Names support activates only
when a valid Specification Extension declaration selects exact version
`0.1.0`. A payload without a usable declaration remains version-unspecified;
an unsupported declared version is not interpreted using `0.1.0` rules.

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

Names Draft validation checks object-local payload structure on Entity, Event,
and Relation objects and recognized expression-ID uniqueness across the whole
Dataset. It does not interpret a Dataset-level Names payload, compare Names
IDs with Core or other Extension IDs, infer equivalence from equal values, or
perform repair, normalization, migration, or application writes. Support for
this authority-qualified Draft does not imply support for a future Stable
`names` Extension.

History `2.0.0` candidate validation and Relative Time draft `0.1.0`
validation are exact-version and declaration-gated. Structural violations are
errors; temporal conflicts and unsupported Calendar semantics are warnings.
Bounded Derived temporal evidence is returned separately and is never written
back into the Dataset. Candidate/Draft support does not promote Stable
registration, authorize writers, or authorize migration.
