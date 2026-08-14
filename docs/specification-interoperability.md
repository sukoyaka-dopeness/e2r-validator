# Specification Extension Interoperability

Status: Implementation profile for Specification Extension draft `0.1.0`

This document defines how this Validator interprets
`draft.github.sukoyaka-dopeness.specification`. The E2R specification
repository remains normative.

## Validation layers

The Validator keeps three questions separate:

1. Is the E2R Core structure valid?
2. Do recognized Extension payloads and Specification declarations conform?
3. Can this Validator interpret every declared Extension and required
   dependency?

Core and recognized Extension rule violations use `error`. Local support
limitations use `warning`. A warning does not make the validation result
invalid and is never reported as a Core structural error.

The existing top-level `valid` field remains `true` exactly when no diagnostic
has severity `error`. Diagnostic namespaces identify the affected layer.

## Locally supported specification versions

| Extension | Exact versions | Features |
| --- | --- | --- |
| `metadata` | `1.0.0` | none |
| `history` | `1.0.0` | none |
| `experimental.github.sukoyaka-dopeness.coordinate` | `0.1.0` | none |
| `draft.github.sukoyaka-dopeness.coordinate` | `0.1.0` | none |
| `draft.github.sukoyaka-dopeness.names` | `0.1.0` | none |
| `draft.github.sukoyaka-dopeness.specification` | `0.1.0` | bootstrap only |

An exact supported declaration produces no success diagnostic. Success is the
absence of a conformance error or support warning for that declaration.

## Severity model

### Errors

Errors include:

- malformed Specification Extension draft `0.1.0` data;
- duplicate or incomplete declarations;
- declarations referring to absent payloads;
- invalid Feature or version syntax;
- malformed definition, lifecycle, or evolution records;
- missing required dependency data or Feature declarations; and
- required dependency version mismatch.

These errors make the combined Validator result invalid, but their
`specification_` codes distinguish them from Core structural errors.

### Warnings

Warnings include:

- a locally known Extension whose exact version is unspecified;
- a locally known Extension declared at an unsupported exact version;
- a declaration whose specification is unavailable locally;
- required dependency data that is present and compatible but unsupported by
  this Validator; and
- an unknown Extension payload that remains Core-compatible.

The Validator is read-only. It does not add declarations, choose a replacement
version, fetch a specification, or repair a dependency.

## Diagnostic states

| State | Diagnostic behavior |
| --- | --- |
| Core failure | Existing Core error code |
| Known Extension, version unspecified | `extension_version_unspecified` warning |
| Exact version supported locally | No support warning |
| Declared version unsupported locally | `specification_version_unsupported` warning |
| Specification unavailable locally | `specification_unavailable` warning |
| Missing required dependency data | `specification_required_dependency_missing` error |
| Required dependency version mismatch | `specification_required_dependency_version_mismatch` error |
| Required dependency unsupported locally | `specification_required_dependency_unsupported` warning |
| Declaration refers to absent payload | `specification_declared_payload_missing` error |
| Payload lacks declaration | `specification_declaration_missing` error |
| Duplicate declaration | `specification_declaration_duplicate` error |
| Invalid declared payload | The exact Extension's own validation error code |
| Unknown payload | `unknown_extension` warning; data remains untouched |

An unsupported Specification Extension `specVersion` prevents interpretation
of its `uses` declarations. Other locally known payloads are then reported as
version unspecified.

Coordinate prototype `formatVersion` is its own experimental bootstrap. When a
supported Specification declaration is present, the two exact versions must
agree. Without the Specification Extension, a valid `formatVersion` is enough
for this Validator to select the experimental Coordinate implementation.

Coordinate draft `specVersion` is its distinct bootstrap. A valid exact
`0.1.0` value selects the Draft implementation even when Specification is
absent. A supported Specification payload must declare the Draft identity
exactly once at the same version. A later syntactically valid Draft version is
reported as unsupported and is not interpreted with `0.1.0` rules.

Names draft has no in-payload version field and does not bootstrap from payload
presence. Its local structure and Dataset-wide recognized expression-ID
uniqueness rules run only when a valid supported Specification declaration
selects exact identifier `draft.github.sukoyaka-dopeness.names` and exact
version `0.1.0`. Without a usable declaration it remains version-unspecified;
an unsupported declared version is not interpreted with `0.1.0` rules.

## Dependency evaluation

The Validator may use structurally valid embedded definitions for offline
dependency analysis. It does not treat an embedded definition as authenticated
publisher data and does not execute or retrieve anything referenced by it.

A `requires` entry applies only when its enclosing exact definition appears in
`uses`. A Feature-scoped entry applies only when the source Feature appears in
that declaration.

Required dependency data is satisfied when the target payload and declaration
exist, the exact target version satisfies the constraint, and any target
Feature is declared. Local implementation support is evaluated separately.

`optionallyUses` and `compatibleWith` do not require target data.

## Preservation and offline behavior

Validation is read-only and offline. Unknown payloads, declarations,
definitions, and fields are not rewritten. The Validator reports what it
cannot interpret and continues validating unrelated Core and supported
Extension data.
